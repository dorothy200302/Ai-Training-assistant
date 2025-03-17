import os
import asyncio
import logging
from typing import List, Optional, Dict, Any, Tuple
import numpy as np
from pathlib import Path
import json
import shutil
from PIL import Image
import matplotlib.pyplot as plt
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
import pickle
import clip

# LlamaIndex导入
from llama_index.embeddings.clip import ClipEmbedding
from llama_index.multi_modal_llms.openai import OpenAIMultiModal
from llama_index.core import StorageContext
from llama_index.core.indices import MultiModalVectorStoreIndex
from llama_index.vector_stores.qdrant import QdrantVectorStore
import qdrant_client
from llama_index.core.schema import ImageNode, Document
from llama_index.core.response.notebook_utils import display_source_node
from llama_index.core.readers.file.base import SimpleDirectoryReader

# 尝试导入Qwen模型
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
    import torch
    QWEN_AVAILABLE = True
except ImportError:
    QWEN_AVAILABLE = False
    logging.warning("Qwen模型导入失败，将使用备用图像处理方法")

# 本地导入
from dev.Generate.ImageUnderstanding import ImageUnderstanding

class EnhancedClipEmbedding(ClipEmbedding):
    """增强版CLIP嵌入，处理长文本问题"""
    
    def __init__(self, model_name="ViT-B/32", embed_dim=1536, logger=None):
        """
        初始化增强版CLIP嵌入
        
        Args:
            model_name: CLIP模型名称
            embed_dim: 嵌入维度
            logger: 日志记录器
        """
        super().__init__(model_name=model_name, embed_dim=embed_dim)
        self.logger = logger or logging.getLogger(__name__)
        
        # 初始化备用文本嵌入模型
        try:
            self.text_embedder = SentenceTransformer('all-MiniLM-L6-v2')
            self.logger.info("备用文本嵌入模型初始化成功")
        except Exception as e:
            self.logger.error(f"备用文本嵌入模型初始化失败: {e}")
            self.text_embedder = None
    
    def _get_text_embeddings(self, texts: List[str]) -> List[float]:
        """
        获取文本嵌入，处理长文本问题
        
        Args:
            texts: 文本列表
            
        Returns:
            List[float]: 嵌入向量
        """
        try:
            # 处理长文本
            processed_texts = []
            for text in texts:
                # CLIP模型限制文本长度为77个token
                if len(text) > 77:
                    # 只保留前77个字符
                    processed_text = text[:77]
                    self.logger.warning(f"文本过长，已截断: {text[:30]}...")
                else:
                    processed_text = text
                processed_texts.append(processed_text)
            
            # 使用CLIP嵌入
            return super()._get_text_embeddings(processed_texts)
        
        except Exception as e:
            self.logger.warning(f"CLIP嵌入失败: {e}")
            
            # 如果有备用嵌入模型，使用备用模型
            if self.text_embedder:
                self.logger.info("使用备用文本嵌入模型")
                try:
                    embeddings = self.text_embedder.encode(texts)
                    
                    # 确保维度匹配
                    if embeddings.shape[1] != self.embed_dim:
                        self.logger.info(f"调整嵌入维度: {embeddings.shape[1]} -> {self.embed_dim}")
                        adjusted_embeddings = np.zeros((len(texts), self.embed_dim))
                        min_dim = min(embeddings.shape[1], self.embed_dim)
                        adjusted_embeddings[:, :min_dim] = embeddings[:, :min_dim]
                        return adjusted_embeddings
                    
                    return embeddings
                
                except Exception as backup_error:
                    self.logger.error(f"备用嵌入也失败: {backup_error}")
            
            # 如果所有方法都失败，返回零向量
            self.logger.error("所有嵌入方法都失败，返回零向量")
            return np.zeros((len(texts), self.embed_dim))

class QwenImageProcessor:
    """使用Qwen模型处理图像"""
    
    def __init__(self, model_name="Qwen/Qwen-VL-Chat", device=None, logger=None):
        """
        初始化Qwen图像处理器
        
        Args:
            model_name: 模型名称
            device: 设备，默认为自动选择
            logger: 日志记录器
        """
        self.logger = logger or logging.getLogger(__name__)
        
        if not QWEN_AVAILABLE:
            self.logger.error("Qwen模型不可用，请安装transformers和torch")
            raise ImportError("Qwen模型不可用，请安装transformers和torch")
        
        # 设置设备
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        try:
            self.logger.info(f"正在加载Qwen模型: {model_name}，设备: {device}")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name, 
                device_map=device,
                trust_remote_code=True
            ).eval()
            self.device = device
            self.logger.info("Qwen模型加载成功")
        except Exception as e:
            self.logger.error(f"Qwen模型加载失败: {e}")
            raise
    
    def analyze_image(self, image_path: str, query: str = "详细描述这张图片的内容") -> str:
        """
        分析图像内容
        
        Args:
            image_path: 图像路径
            query: 查询提示
            
        Returns:
            str: 图像描述
        """
        try:
            # 加载图像
            image = Image.open(image_path)
            
            # 构建提示
            query_with_image = self.tokenizer.from_messages([
                {"role": "user", "content": f"{query}"},
            ], images=[image])
            
            # 生成回答
            with torch.no_grad():
                response = self.model.generate(
                    query_with_image["input_ids"].to(self.device),
                    max_new_tokens=512,
                )
                
            # 解码回答
            response_text = self.tokenizer.decode(response[0], skip_special_tokens=True)
            
            # 提取助手回答部分
            if "assistant:" in response_text.lower():
                response_text = response_text.split("assistant:", 1)[1].strip()
            
            return response_text
            
        except Exception as e:
            self.logger.error(f"Qwen图像分析失败: {e}")
            return f"图像分析失败: {e}"
    
    def batch_analyze_images(self, image_paths: List[str]) -> Dict[str, str]:
        """
        批量分析图像
        
        Args:
            image_paths: 图像路径列表
            
        Returns:
            Dict[str, str]: 图像路径到描述的映射
        """
        results = {}
        for path in image_paths:
            results[path] = self.analyze_image(path)
        return results

class ImageEmbeddingManager:
    """图片嵌入管理器，用于索引和检索图片"""
    
    def __init__(self, model_name: str = "ViT-B/32", log_file: str = "image_embedding.log"):
        """
        初始化图片嵌入管理器
        
        Args:
            model_name: CLIP模型名称
            log_file: 日志文件路径
        """
        # 设置日志
        self.logger = logging.getLogger(__name__)
        if not self.logger.handlers:
            logging.basicConfig(
                level=logging.INFO,
                format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                handlers=[
                    logging.StreamHandler(),
                    logging.FileHandler(log_file)
                ]
            )
        
        # 初始化CLIP模型
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.logger.info(f"使用设备: {self.device}")
        
        try:
            self.model, self.preprocess = clip.load(model_name, device=self.device)
            self.logger.info(f"成功加载CLIP模型: {model_name}")
        except Exception as e:
            self.logger.error(f"加载CLIP模型失败: {str(e)}")
            raise
        
        self.image_features_cache = {}  # 缓存图片特征
    
    def encode_images(self, image_paths: List[str]) -> Dict[str, torch.Tensor]:
        """对图片进行编码，生成嵌入向量"""
        result = {}
        
        for img_path in image_paths:
            if img_path in self.image_features_cache:
                result[img_path] = self.image_features_cache[img_path]
                continue
                
            try:
                image = Image.open(img_path).convert("RGB")
                image_input = self.preprocess(image).unsqueeze(0).to(self.device)
                
                with torch.no_grad():
                    image_features = self.model.encode_image(image_input)
                    # 归一化特征向量
                    image_features /= image_features.norm(dim=-1, keepdim=True)
                
                self.image_features_cache[img_path] = image_features
                result[img_path] = image_features
            except Exception as e:
                self.logger.error(f"处理图片时出错 {img_path}: {str(e)}")
        
        return result
    
    def encode_text(self, texts: List[str]) -> torch.Tensor:
        """对文本进行编码，生成嵌入向量"""
        text_tokens = clip.tokenize(texts).to(self.device)
        
        with torch.no_grad():
            text_features = self.model.encode_text(text_tokens)
            # 归一化特征向量
            text_features /= text_features.norm(dim=-1, keepdim=True)
            
        return text_features
    
    def _chunk_text(self, text: str, chunk_size: int = 77) -> List[str]:
        """将长文本分割成适合CLIP处理的小块"""
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            chunks.append(chunk)
            
        # 如果没有分块，至少返回一个空字符串
        if not chunks:
            chunks = [""]
            
        return chunks
    
    def index_images(self, image_directory: str, output_file: str = "image_embeddings.pkl") -> Dict[str, Dict]:
        """
        为指定目录中的所有图片生成CLIP嵌入向量并保存
        
        Args:
            image_directory: 图片目录路径
            output_file: 输出文件路径，用于保存嵌入向量
            
        Returns:
            包含图片路径和嵌入向量的字典
        """
        # 获取所有图片路径
        image_paths = []
        for root, _, files in os.walk(image_directory):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                    image_paths.append(os.path.join(root, file))
        
        self.logger.info(f"找到 {len(image_paths)} 张图片需要处理")
        
        # 生成嵌入向量
        image_embeddings = {}
        batch_size = 16  # 批处理大小，可根据内存调整
        
        for i in range(0, len(image_paths), batch_size):
            batch_paths = image_paths[i:i+batch_size]
            self.logger.info(f"处理批次 {i//batch_size + 1}/{(len(image_paths)-1)//batch_size + 1}, 包含 {len(batch_paths)} 张图片")
            
            # 使用encode_images方法生成嵌入向量
            batch_embeddings = self.encode_images(batch_paths)
            
            # 将张量转换为numpy数组以便保存
            for path, tensor in batch_embeddings.items():
                image_embeddings[path] = {
                    "path": path,
                    "embedding": tensor.cpu().numpy()[0],  # 转换为numpy数组
                    "filename": os.path.basename(path)
                }
        
        # 保存嵌入向量到文件
        with open(output_file, 'wb') as f:
            pickle.dump(image_embeddings, f)
        
        self.logger.info(f"成功为 {len(image_embeddings)} 张图片生成嵌入向量，已保存到 {output_file}")
        
        return image_embeddings
    
    def retrieve_images_for_response(self, 
                                   query_text: str, 
                                   embeddings_file: str = "image_embeddings.pkl",
                                   similarity_threshold: float = 0.2,
                                   max_images: int = 3) -> List[Dict]:
        """
        根据文本查询检索相关图片，并判断是否应在回答中引用
        
        Args:
            query_text: 查询文本
            embeddings_file: 包含图片嵌入向量的文件路径
            similarity_threshold: 相似度阈值，高于此值的图片将被考虑引用
            max_images: 最多返回的图片数量
            
        Returns:
            包含相关图片信息的列表，每项包含路径、相似度分数和是否应引用
        """
        # 加载图片嵌入向量
        if not os.path.exists(embeddings_file):
            self.logger.error(f"嵌入向量文件 {embeddings_file} 不存在")
            return []
        
        with open(embeddings_file, 'rb') as f:
            image_embeddings = pickle.load(f)
        
        # 生成查询文本的嵌入向量
        text_chunks = self._chunk_text(query_text)
        text_features = self.encode_text(text_chunks)
        
        # 计算相似度并排序
        results = []
        for path, data in image_embeddings.items():
            # 将numpy数组转换回tensor
            img_embedding = torch.tensor(data["embedding"]).to(self.device)
            
            # 计算与所有文本块的相似度
            similarity = torch.matmul(img_embedding, text_features.T).cpu().numpy()
            max_similarity = float(np.max(similarity))
            
            # 判断是否应该引用此图片
            should_include = max_similarity > similarity_threshold
            
            results.append({
                "path": path,
                "similarity_score": max_similarity,
                "filename": data["filename"],
                "should_include": should_include
            })
        
        # 按相似度排序
        results.sort(key=lambda x: x["similarity_score"], reverse=True)
        
        # 只返回应该引用的图片，最多max_images张
        filtered_results = [r for r in results if r["should_include"]][:max_images]
        
        self.logger.info(f"查询文本: '{query_text[:50]}...'")
        self.logger.info(f"找到 {len(filtered_results)} 张相关图片可引用")
        
        return filtered_results

class EnhancedVisionRAG:
    """增强版多模态文档处理器，解决CLIP嵌入长度限制问题并集成Qwen模型"""
    
    def __init__(
        self, 
        document_directory: str, 
        log_file: str = 'enhanced_vision_rag.log',
        api_key: str = None,
        use_qwen: bool = True
    ):
        """
        初始化增强版多模态文档处理器
        
        Args:
            document_directory: 文档目录
            log_file: 日志文件路径
            api_key: OpenAI API密钥
            use_qwen: 是否使用Qwen模型
        """
        # 配置日志
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
        
        # 设置API密钥
        self.api_key = api_key
        if api_key:
            os.environ["OPENAI_API_KEY"] = api_key
        
        # 设置目录
        self.document_directory = document_directory
        self.extracted_text_dir = os.path.join(document_directory, "extracted_text")
        self.extracted_images_dir = os.path.join(document_directory, "extracted_images")
        
        # 创建目录（如果不存在）
        os.makedirs(self.extracted_text_dir, exist_ok=True)
        os.makedirs(self.extracted_images_dir, exist_ok=True)
        
        # 初始化图像处理器
        self.use_qwen = use_qwen and QWEN_AVAILABLE
        if self.use_qwen:
            try:
                self.image_processor = QwenImageProcessor(logger=self.logger)
                self.logger.info("Qwen图像处理器初始化成功")
            except Exception as e:
                self.logger.error(f"Qwen图像处理器初始化失败: {e}")
                self.use_qwen = False
                self.image_processor = ImageUnderstanding()
        else:
            self.image_processor = ImageUnderstanding()
            self.logger.info("使用默认图像处理器")
        
        # 初始化CLIP嵌入模型
        self.clip_embedding = EnhancedClipEmbedding(logger=self.logger)
        
        # 初始化向量存储和索引
        self.storage_context = None
        self.index = None
        self.retriever_engine = None
        
        # 初始化多模态LLM
        if api_key:
            self.mm_llm = OpenAIMultiModal(
                model="gpt-4o", 
                api_key=api_key, 
                max_new_tokens=1500
            )
            self.logger.info("多模态LLM初始化成功")
        else:
            self.mm_llm = None
            self.logger.warning("未提供API密钥，多模态LLM未初始化")
        
        # 图像描述缓存
        self.image_descriptions = {}
        
        self.logger.info("EnhancedVisionRAG初始化完成")
    
    def process_uploaded_images(self, upload_dir: str, output_dir: str = None, embeddings_file: str = "image_embeddings.pkl") -> Dict[str, Dict]:
        """
        处理上传的图片，提取描述并保存元数据
        
        Args:
            upload_dir: 上传图片目录
            output_dir: 输出目录，默认为extracted_images_dir
            embeddings_file: 保存图片嵌入向量的文件路径
            
        Returns:
            Dict: 包含图片元数据的字典
        """
        if not os.path.exists(upload_dir):
            self.logger.error(f"上传目录不存在: {upload_dir}")
            return {}
        
        if output_dir is None:
            output_dir = self.extracted_images_dir
        
        os.makedirs(output_dir, exist_ok=True)
        
        # 收集所有图片路径
        image_paths = []
        for root, _, files in os.walk(upload_dir):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                    image_paths.append(os.path.join(root, file))
        
        if not image_paths:
            self.logger.warning(f"在上传目录中未找到图片: {upload_dir}")
            return {}
        
        self.logger.info(f"找到 {len(image_paths)} 张图片需要处理")
        
        # 处理图片并保存元数据
        image_metadata = {}
        
        # 初始化图片处理器
        if self.use_qwen:
            self.logger.info("使用Qwen模型分析图片")
            if not hasattr(self, 'qwen_processor'):
                self.qwen_processor = QwenImageProcessor(logger=self.logger)
            
            # 批量分析图片
            descriptions = self.qwen_processor.batch_analyze_images(image_paths)
        else:
            self.logger.info("不使用Qwen模型，将使用简单文件名作为描述")
            descriptions = {path: os.path.basename(path) for path in image_paths}
        
        # 复制图片到输出目录并保存元数据
        for src_path in image_paths:
            filename = os.path.basename(src_path)
            dst_path = os.path.join(output_dir, filename)
            
            try:
                # 复制图片
                shutil.copy2(src_path, dst_path)
                
                # 获取描述
                description = descriptions.get(src_path, f"图片: {filename}")
                
                # 保存元数据
                image_metadata[dst_path] = {
                    'original_path': src_path,
                    'saved_path': dst_path,
                    'description': description,
                    'filename': filename
                }
                
                self.logger.info(f"处理图片: {filename}")
                self.logger.debug(f"描述: {description}")
                
            except Exception as e:
                self.logger.error(f"处理图片时出错 {src_path}: {str(e)}")
        
        # 保存元数据到JSON文件
        metadata_file = os.path.join(output_dir, 'image_metadata.json')
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(image_metadata, f, ensure_ascii=False, indent=2)
        
        self.logger.info(f"已保存 {len(image_metadata)} 张图片的元数据到 {metadata_file}")
        
        # 生成并保存图片嵌入向量
        self.logger.info("开始生成图片嵌入向量...")
        
        # 初始化图片嵌入管理器
        embedding_manager = ImageEmbeddingManager(log_file=self.log_file)
        
        # 获取所有已处理图片的路径
        processed_image_paths = list(image_metadata.keys())
        
        # 生成嵌入向量并保存
        embeddings = embedding_manager.index_images(
            image_directory=output_dir,  # 使用输出目录，因为图片已经复制到这里
            output_file=os.path.join(output_dir, embeddings_file)
        )
        
        self.logger.info(f"已为 {len(embeddings)} 张图片生成嵌入向量并保存到 {os.path.join(output_dir, embeddings_file)}")
        
        # 将嵌入信息添加到元数据中
        for path, embed_data in embeddings.items():
            if path in image_metadata:
                image_metadata[path]['has_embedding'] = True
        
        # 更新元数据文件
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(image_metadata, f, ensure_ascii=False, indent=2)
        
        self.logger.info(f"已更新图片元数据，包含嵌入向量信息")
        
        # 保存图片描述字典，用于后续检索
        self.image_descriptions = {path: data['description'] for path, data in image_metadata.items()}
        
        return image_metadata
    
    def create_multimodal_index(self) -> Optional[MultiModalVectorStoreIndex]:
        """
        创建多模态索引
        
        Returns:
            Optional[MultiModalVectorStoreIndex]: 多模态索引
        """
        try:
            # 验证图像目录
            image_paths = []
            for root, _, files in os.walk(self.extracted_images_dir):
                for file in files:
                    if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
                        image_paths.append(os.path.join(root, file))
            
            if not image_paths:
                self.logger.error(f"在目录 {self.extracted_images_dir} 中未找到图片")
                return None
            
            # 创建Qdrant向量存储
            client = qdrant_client.QdrantClient(path="qdrant_mm_db")
            
            # 创建文本和图像向量存储
            text_store = QdrantVectorStore(
                client=client, 
                collection_name="text_collection",
                vector_size=1536
            )
            
            image_store = QdrantVectorStore(
                client=client, 
                collection_name="image_collection", 
                vector_size=1536
            )
            
            # 创建存储上下文
            storage_context = StorageContext.from_defaults(
                vector_store=text_store, 
                image_store=image_store
            )
            
            # 自定义文件过滤器
            def custom_file_filter(filename: str) -> bool:
                """只允许图像文件"""
                allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp']
                return any(filename.lower().endswith(ext) for ext in allowed_extensions)
            
            # 加载文档
            documents = SimpleDirectoryReader(
                input_dir=self.extracted_images_dir,
                file_filter=custom_file_filter
            ).load_data()
            
            self.logger.info(f"加载了 {len(documents)} 个文档")
            
            # 创建多模态索引
            index = MultiModalVectorStoreIndex.from_documents(
                documents,
                storage_context=storage_context,
                embed_model=self.clip_embedding
            )
            
            # 保存索引和存储上下文
            self.storage_context = storage_context
            self.index = index
            
            # 创建检索引擎
            self.retriever_engine = index.as_retriever(
                similarity_top_k=3, 
                image_similarity_top_k=3
            )
            
            self.logger.info("多模态索引创建成功")
            return index
            
        except Exception as e:
            self.logger.error(f"创建多模态索引失败: {e}")
            return None
    
    def process_query_with_images(self, query: str, embeddings_file: str = "image_embeddings.pkl") -> Dict[str, Any]:
        """
        处理包含图片检索的查询
        
        Args:
            query: 用户查询
            embeddings_file: 图片嵌入向量文件路径
            
        Returns:
            Dict: 包含响应和检索图片的字典
        """
        try:
            # 使用LLM生成初步响应
            response = self.mm_llm.complete(
                prompt=query,
                image_documents=SimpleDirectoryReader(
                    input_dir=self.extracted_images_dir
                ).load_data()
            )
            
            response_text = response.text
            
            # 限制检索文本长度，避免CLIP嵌入问题
            MAX_TOKENS = 1000
            retrieval_text = response_text[:MAX_TOKENS] if len(response_text) > MAX_TOKENS else response_text
            
            # 初始化图片嵌入管理器
            embedding_manager = ImageEmbeddingManager(log_file=self.log_file)
            
            # 检索相关图片
            embeddings_path = os.path.join(self.extracted_images_dir, embeddings_file)
            if os.path.exists(embeddings_path):
                retrieved_images = embedding_manager.retrieve_images_for_response(
                    query_text=query + " " + retrieval_text,
                    embeddings_file=embeddings_path,
                    similarity_threshold=0.2,
                    max_images=3
                )
            else:
                self.logger.warning(f"嵌入向量文件不存在: {embeddings_path}，将使用传统检索方法")
                # 如果嵌入文件不存在，使用传统检索方法
                if hasattr(self, 'retriever_engine') and self.retriever_engine:
                    retrieval_results = self.retriever_engine.retrieve(retrieval_text)
                    retrieved_images = []
                    
                    for res_node in retrieval_results:
                        if isinstance(res_node.node, ImageNode):
                            image_path = res_node.node.metadata["file_path"]
                            retrieved_images.append({
                                "path": image_path,
                                "similarity_score": res_node.score,
                                "description": self.image_descriptions.get(image_path, ""),
                                "should_include": True
                            })
                else:
                    retrieved_images = []
            
            # 整合结果
            result = {
                "response": response_text,
                "retrieved_images": retrieved_images
            }
            
            return result
        except Exception as e:
            self.logger.error(f"处理查询失败: {str(e)}")
            return {"error": str(e)}
    
    def plot_images(self, image_paths: List[str], max_images: int = 9):
        """
        绘制图像网格
        
        Args:
            image_paths: 图像路径列表
            max_images: 最大显示图像数
        """
        try:
            images_shown = 0
            plt.figure(figsize=(16, 9))
            
            for img_path in image_paths:
                if not os.path.isfile(img_path):
                    self.logger.warning(f"图像文件不存在: {img_path}")
                    continue
                
                try:
                    image = Image.open(img_path)
                    plt.subplot(3, 3, images_shown + 1)
                    plt.imshow(image)
                    plt.title(f"Image {images_shown + 1}")
                    plt.xticks([])
                    plt.yticks([])
                    
                    images_shown += 1
                    if images_shown >= max_images:
                        break
                
                except Exception as img_error:
                    self.logger.error(f"加载图像 {img_path} 时发生错误: {img_error}")
            
            plt.tight_layout()
            plt.show()
        
        except Exception as e:
            self.logger.error(f"绘制图像时发生错误: {e}")

async def main():
    """主函数"""
    try:
        # 初始化处理器
        processor = EnhancedVisionRAG(
            document_directory=r"C:\Users\dorot\Desktop\crawl爬虫\downloaded_document_images",
            api_key=os.environ.get("OPENAI_API_KEY"),
            use_qwen=True
        )
        
        # 处理上传的图片
        upload_dir = r"C:\Users\dorot\Desktop\crawl爬虫\uploaded_images"
        image_metadata = processor.process_uploaded_images(upload_dir)
        
        # 创建多模态索引
        processor.create_multimodal_index()
        
        # 查询示例
        query = "薪资分析师的职业发展"
        
        # 使用多模态查询方法
        result = processor.process_query_with_images(query)
        
        print("查询:", result['query'])
        print("回答:", result['response'])
        print("匹配图片:")
        for img in result['retrieved_images']:
            print(f"- {img['path']} (相似度: {img['similarity_score']:.2f})")
            if 'description' in img and img['description']:
                print(f"  描述: {img['description'][:100]}...")
        
        # 显示图片
        if 'retrieved_images' in result and result['retrieved_images']:
            processor.plot_images([img['path'] for img in result['retrieved_images']])
        
    except Exception as e:
        logging.error(f"主程序执行失败: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(main()) 