import os
import sys
import torch
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
import logging
from tqdm import tqdm
import json
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 添加src目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

class MultimodalRetriever:
    def __init__(self, model_path="pretrained_model/bge-visualized", use_gpu=True):
        """
        初始化多模态检索器
        
        Args:
            model_path: BGE-Visualized模型路径
            use_gpu: 是否使用GPU
        """
        self.model_path = model_path
        self.config_path = os.path.join(model_path, "config")
        self.use_gpu = use_gpu and torch.cuda.is_available()
        self.device = torch.device("cuda" if self.use_gpu else "cpu")
        
        # 加载模型
        self._load_model()
        
        # 存储文档和图像的嵌入向量
        self.document_embeddings = []
        self.document_metadata = []
        self.image_embeddings = []
        self.image_metadata = []
    
    def _load_model(self):
        """加载BGE-Visualized模型"""
        logger.info("加载BGE-Visualized模型...")
        
        try:
            from src.visual_bge.modeling import Visualized_BGE
            
            # 检查模型文件
            if os.path.exists(os.path.join(self.model_path, "Visualized_m3.pth")):
                model_weight = os.path.join(self.model_path, "Visualized_m3.pth")
                logger.info(f"使用 Visualized_m3.pth 模型权重")
                model_name = "bge-m3"
            elif os.path.exists(os.path.join(self.model_path, "Visualized_base_en_v1.5.pth")):
                model_weight = os.path.join(self.model_path, "Visualized_base_en_v1.5.pth")
                logger.info(f"使用 Visualized_base_en_v1.5.pth 模型权重")
                model_name = "bge-base-en-v1.5"
            else:
                raise FileNotFoundError("找不到模型权重文件")
            
            # 加载模型
            self.model = Visualized_BGE(
                model_name_bge=model_name,
                model_weight=model_weight,
                normlized=True,
                from_pretrained=self.config_path
            )
            
            # 设置为评估模式
            self.model.eval()
            if self.use_gpu:
                self.model = self.model.to(self.device)
                logger.info("使用GPU进行推理")
            else:
                logger.info("使用CPU进行推理")
                
            logger.info("模型加载成功!")
            
        except Exception as e:
            logger.error(f"加载模型失败: {e}")
            raise
    
    def encode_text(self, texts):
        """
        编码文本
        
        Args:
            texts: 文本列表
            
        Returns:
            文本嵌入向量
        """
        if not isinstance(texts, list):
            texts = [texts]
            
        with torch.no_grad():
            # 使用tokenizer处理文本
            text_tokens = self.model.tokenizer(texts, return_tensors="pt", padding=True, truncation=True, max_length=512)
            
            # 将输入移动到设备上
            for key in text_tokens:
                text_tokens[key] = text_tokens[key].to(self.device)
                
            # 编码文本
            text_embeddings = self.model.encode_text(text_tokens)
            
            # 将嵌入向量移动到CPU上
            text_embeddings = text_embeddings.cpu().numpy()
            
        return text_embeddings
    
    def encode_image(self, image_paths):
        """
        编码图像
        
        Args:
            image_paths: 图像路径列表
            
        Returns:
            图像嵌入向量
        """
        if not isinstance(image_paths, list):
            image_paths = [image_paths]
            
        image_embeddings = []
        
        for image_path in image_paths:
            try:
                # 加载图像
                image = Image.open(image_path).convert("RGB")
                
                # 预处理图像
                image_tensor = self.model.preprocess_val(image).unsqueeze(0)
                
                # 将图像移动到设备上
                image_tensor = image_tensor.to(self.device)
                
                # 编码图像
                with torch.no_grad():
                    embedding = self.model.encode_image(image_tensor)
                    
                # 将嵌入向量移动到CPU上
                embedding = embedding.cpu().numpy()
                
                image_embeddings.append(embedding)
                
            except Exception as e:
                logger.error(f"编码图像 {image_path} 失败: {e}")
                image_embeddings.append(np.zeros((1, 1024)))
        
        return np.vstack(image_embeddings)
    
    def index_documents(self, documents, metadata=None):
        """
        索引文本文档
        
        Args:
            documents: 文档列表
            metadata: 元数据列表
        """
        logger.info(f"索引 {len(documents)} 个文档...")
        
        # 编码文档
        embeddings = self.encode_text(documents)
        
        # 存储嵌入向量和元数据
        self.document_embeddings.append(embeddings)
        
        if metadata is None:
            metadata = [{"id": i, "text": doc} for i, doc in enumerate(documents)]
            
        self.document_metadata.extend(metadata)
        
        logger.info(f"文档索引完成，总共 {len(self.document_metadata)} 个文档")
    
    def index_images(self, image_paths, metadata=None):
        """
        索引图像
        
        Args:
            image_paths: 图像路径列表
            metadata: 元数据列表
        """
        logger.info(f"索引 {len(image_paths)} 张图像...")
        
        # 编码图像
        embeddings = self.encode_image(image_paths)
        
        # 存储嵌入向量和元数据
        self.image_embeddings.append(embeddings)
        
        if metadata is None:
            metadata = [{"id": i, "path": path} for i, path in enumerate(image_paths)]
            
        self.image_metadata.extend(metadata)
        
        logger.info(f"图像索引完成，总共 {len(self.image_metadata)} 张图像")
    
    def search(self, query, k=5, search_type="text", query_type="text"):
        """
        搜索最相似的文档或图像
        
        Args:
            query: 查询文本或图像路径
            k: 返回的结果数量
            search_type: 搜索类型，"text"或"image"
            query_type: 查询类型，"text"或"image"
            
        Returns:
            最相似的文档或图像及其相似度分数
        """
        # 编码查询
        if query_type == "text":
            query_embedding = self.encode_text([query])[0]
        elif query_type == "image":
            query_embedding = self.encode_image([query])[0]
        else:
            raise ValueError(f"不支持的查询类型: {query_type}")
        
        # 计算相似度
        if search_type == "text":
            if not self.document_embeddings:
                logger.warning("没有索引任何文档")
                return []
                
            embeddings = np.vstack(self.document_embeddings)
            metadata = self.document_metadata
        elif search_type == "image":
            if not self.image_embeddings:
                logger.warning("没有索引任何图像")
                return []
                
            embeddings = np.vstack(self.image_embeddings)
            metadata = self.image_metadata
        else:
            raise ValueError(f"不支持的搜索类型: {search_type}")
        
        # 计算余弦相似度
        similarities = np.dot(embeddings, query_embedding) / (
            np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_embedding)
        )
        
        # 获取最相似的k个结果
        top_k_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_k_indices:
            results.append({
                "metadata": metadata[idx],
                "similarity": float(similarities[idx])
            })
        
        return results
    
    def save_index(self, output_dir):
        """
        保存索引
        
        Args:
            output_dir: 输出目录
        """
        os.makedirs(output_dir, exist_ok=True)
        
        # 保存文档嵌入向量
        if self.document_embeddings:
            document_embeddings = np.vstack(self.document_embeddings)
            np.save(os.path.join(output_dir, "document_embeddings.npy"), document_embeddings)
            
            # 保存文档元数据
            with open(os.path.join(output_dir, "document_metadata.json"), "w", encoding="utf-8") as f:
                json.dump(self.document_metadata, f, ensure_ascii=False, indent=2)
        
        # 保存图像嵌入向量
        if self.image_embeddings:
            image_embeddings = np.vstack(self.image_embeddings)
            np.save(os.path.join(output_dir, "image_embeddings.npy"), image_embeddings)
            
            # 保存图像元数据
            with open(os.path.join(output_dir, "image_metadata.json"), "w", encoding="utf-8") as f:
                json.dump(self.image_metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"索引已保存到 {output_dir}")
    
    def load_index(self, input_dir):
        """
        加载索引
        
        Args:
            input_dir: 输入目录
        """
        # 加载文档嵌入向量
        document_embeddings_path = os.path.join(input_dir, "document_embeddings.npy")
        if os.path.exists(document_embeddings_path):
            document_embeddings = np.load(document_embeddings_path)
            self.document_embeddings = [document_embeddings]
            
            # 加载文档元数据
            with open(os.path.join(input_dir, "document_metadata.json"), "r", encoding="utf-8") as f:
                self.document_metadata = json.load(f)
                
            logger.info(f"加载了 {len(self.document_metadata)} 个文档的索引")
        
        # 加载图像嵌入向量
        image_embeddings_path = os.path.join(input_dir, "image_embeddings.npy")
        if os.path.exists(image_embeddings_path):
            image_embeddings = np.load(image_embeddings_path)
            self.image_embeddings = [image_embeddings]
            
            # 加载图像元数据
            with open(os.path.join(input_dir, "image_metadata.json"), "r", encoding="utf-8") as f:
                self.image_metadata = json.load(f)
                
            logger.info(f"加载了 {len(self.image_metadata)} 张图像的索引")


def main():
    """主函数"""
    # 创建多模态检索器
    retriever = MultimodalRetriever()
    
    # 准备示例文档
    documents = [
        "人工智能是计算机科学的一个分支，它致力于开发能够模拟人类智能的系统。",
        "深度学习是机器学习的一个子领域，它使用多层神经网络来学习数据的表示。",
        "计算机视觉是人工智能的一个领域，它使计算机能够从图像或视频中获取信息。",
        "自然语言处理使计算机能够理解、解释和生成人类语言。",
        "强化学习是一种机器学习方法，它通过与环境交互来学习如何做出决策。"
    ]
    
    # 索引文档
    retriever.index_documents(documents)
    
    # 准备示例图像
    image_dir = os.path.join("pretrained_model", "bge-visualized", "imgs")
    if os.path.exists(image_dir):
        image_paths = [os.path.join(image_dir, f) for f in os.listdir(image_dir) if f.endswith(('.png', '.jpg', '.jpeg'))]
        
        if image_paths:
            # 索引图像
            retriever.index_images(image_paths)
            
            # 使用图像进行搜索
            query_image = image_paths[0]
            logger.info(f"使用图像查询: {query_image}")
            
            # 图像到文本搜索
            results = retriever.search(query_image, k=3, search_type="text", query_type="image")
            logger.info("图像到文本搜索结果:")
            for i, result in enumerate(results):
                logger.info(f"  {i+1}. 相似度: {result['similarity']:.4f}, 文本: {result['metadata']['text']}")
            
            # 图像到图像搜索
            results = retriever.search(query_image, k=3, search_type="image", query_type="image")
            logger.info("图像到图像搜索结果:")
            for i, result in enumerate(results):
                logger.info(f"  {i+1}. 相似度: {result['similarity']:.4f}, 图像: {result['metadata']['path']}")
    
    # 使用文本进行搜索
    query_text = "深度学习和神经网络"
    logger.info(f"使用文本查询: {query_text}")
    
    # 文本到文本搜索
    results = retriever.search(query_text, k=3, search_type="text", query_type="text")
    logger.info("文本到文本搜索结果:")
    for i, result in enumerate(results):
        logger.info(f"  {i+1}. 相似度: {result['similarity']:.4f}, 文本: {result['metadata']['text']}")
    
    # 文本到图像搜索
    if retriever.image_embeddings:
        results = retriever.search(query_text, k=3, search_type="image", query_type="text")
        logger.info("文本到图像搜索结果:")
        for i, result in enumerate(results):
            logger.info(f"  {i+1}. 相似度: {result['similarity']:.4f}, 图像: {result['metadata']['path']}")
    
    # 保存索引
    output_dir = "index"
    retriever.save_index(output_dir)
    logger.info(f"索引已保存到 {output_dir}")
    
    logger.info("演示完成!")


if __name__ == "__main__":
    main() 