# Standard library imports
import re
import os
import json
import tempfile
import asyncio
import hashlib
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Any

# Third-party imports
import numpy as np
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential
import logging
import tiktoken


# LangChain imports
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import BaseOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_core.documents import Document
from langchain.chains import LLMChain, RetrievalQA
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    BSHTMLLoader
)
from langchain.chains.retrieval_qa.base import RetrievalQA

# Local imports
from TrainingDocGenerator import TrainingDocGenerator
# from dev.CloudStorage.aws import download_file_from_s3, upload_file_to_s3_by_key
# from dev.prompts.outlinePrompt import OUTLINE_PROMPT
# from dev.prompts.reviewPrompt import *
# from dev.models import *
# from dev.Generate.search import search_query_ideas
# from ..Chatbot.test_embeddings import SiliconFlowEmbeddings
# from .content_extractor import ContentExtractor
# from .ImageUnderstanding import ImageUnderstanding

# 创建简单的替代类
class ContentExtractor:
    def __init__(self, *args, **kwargs):
        pass
    
    def extract_content(self, *args, **kwargs):
        return {}

class ImageUnderstanding:
    def __init__(self, *args, **kwargs):
        pass
    
    def process_images(self, *args, **kwargs):
        return []

class Citation(BaseModel):
    """引用来源的结构定义"""
    source_id: int = Field(
        ...,
        description="引用来源的文档ID"
    )
    quote: str = Field(
        ...,
        description="引用的具体内容片段"
    )


class MultimodalContent:
    """多模态内容处理结果"""
    def __init__(self):
        self.text_content: str = ""
        self.images: List[Dict] = []
        self.tables: List[Dict] = []
        self.charts: List[Dict] = []

class QuotedAnswer(BaseModel):
    """带引用的回答结构"""
    answer: str = Field(
        ...,
        description="基于给定来源的回答内容"
    )
    citations: List[Citation] = Field(
        ...,
        description="支持该回答的引用列表"
    )

class AsyncTrainingDocGenerator(TrainingDocGenerator):
    """异步版本的培训文档生成器"""
    def __init__(self, file_paths, background_informations, model_name, user_email):
        # 调用父类的初始化方法，注意参数顺序
        super().__init__(file_paths=file_paths, model_name=model_name, background_informations=background_informations)
        
        if not file_paths:
            raise ValueError("file_paths must not be empty")
            
        if not user_email:
            raise ValueError("user_email must not be empty")
            
        if not isinstance(user_email, str):
            raise ValueError(f"user_email must be a string, got {type(user_email)}")
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        self.logger.info(f"Initializing AsyncTrainingDocGenerator with user_email: {user_email}")
        
        self.user_email = user_email  # Store user_email as instance variable
        self.cache = set()  # 用于缓存搜索结果
        self.vector_store_key = self._generate_cache_key(self.file_paths)  # Use self.file_paths here
        self.vector_store = None  # Initialize vector_store as None
        
        # Initialize reranker
        # self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        # Initialize text splitter with optimized chunk size
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2000,  # Increased chunk size for fewer chunks
            chunk_overlap=100,  # Moderate overlap
            length_function=len,
            is_separator_regex=False,
        )
           # 初始化处理器
        self.content_extractor = ContentExtractor()
        self.image_understanding = ImageUnderstanding()
         # 初始化向量存储
        self.text_vector_store = None
        self.visual_vector_store = None
        
        # Initialize document loader based on file type
        try:
            documents = []
            total_size = 0
            max_total_size = 10 * 1024 * 1024  # 10MB limit
            
            for path in self.file_paths:
                try:
                    # Check file size
                    file_size = os.path.getsize(path)
                    if file_size > 5 * 1024 * 1024:  # 5MB per file limit
                        self.logger.warning(f"File {path} is too large ({file_size} bytes), skipping")
                        continue
                        
                    total_size += file_size
                    if total_size > max_total_size:
                        self.logger.warning("Total file size exceeds limit, some files will be skipped")
                        break
                    
                    # Get file extension
                    file_ext = os.path.splitext(path)[1].lower()
                    
                    # Choose appropriate loader based on file type
                    if file_ext == '.pdf':
                        loader = PyPDFLoader(path)
                        docs = loader.load()
                    elif file_ext in ['.docx', '.doc']:
                        loader = Docx2txtLoader(path)
                        docs = loader.load()
                    elif file_ext == '.txt':
                        loader = TextLoader(path, encoding='utf-8')
                        docs = loader.load()
                    elif file_ext == '.html':
                        loader = BSHTMLLoader(path)
                        docs = loader.load()
                    else:
                        self.logger.warning(f"Unsupported file type for {path}")
                        continue
                    
                    # Split documents into chunks
                    for doc in docs:
                        chunks = self.text_splitter.split_text(doc.page_content)
                        for chunk in chunks:
                            documents.append(Document(
                                page_content=chunk,
                                metadata={'source': path}
                            ))
                            
                except Exception as e:
                    self.logger.error(f"Error processing file {path}: {str(e)}")
                    continue
            
            # Create vector store if we have documents
            if documents:
                # Try to load from cache first
                cache_dir = os.path.join(os.path.dirname(__file__), 'cache')
                os.makedirs(cache_dir, exist_ok=True)
                cache_path = os.path.join(cache_dir, self.vector_store_key)
                
                if os.path.exists(cache_path):
                    try:
                        self.logger.info(f"Loading vector store from cache: {cache_path}")
                        self.vector_store = FAISS.load_local(cache_path, self.embeddings)
                        self.logger.info("Vector store loaded from cache successfully")
                    except Exception as e:
                        self.logger.warning(f"Failed to load vector store from cache: {str(e)}")
                        self.vector_store = None
                
                if not self.vector_store:
                    self.logger.info("Creating new vector store")
                    # Process documents in batches to reduce API calls
                    batch_size = 50
                    for i in range(0, len(documents), batch_size):
                        batch = documents[i:i + batch_size]
                        if i == 0:
                            self.vector_store = FAISS.from_documents(batch, self.embeddings)
                        else:
                            batch_store = FAISS.from_documents(batch, self.embeddings)
                            self.vector_store.merge_from(batch_store)
                    
                    # Save to cache
                    try:
                        self.logger.info(f"Saving vector store to cache: {cache_path}")
                        self.vector_store.save_local(cache_path)
                        self.logger.info("Vector store saved to cache successfully")
                    except Exception as e:
                        self.logger.warning(f"Failed to save vector store to cache: {str(e)}")
                
                self.logger.info("Vector store initialized successfully")
            else:
                self.logger.warning("No valid documents to process")
                
        except Exception as e:
            self.logger.error(f"Error initializing vector store: {str(e)}")
            raise

        # 初始化token计数器
        self.token_usage = {
            'prompt_tokens': 0,
            'completion_tokens': 0,
            'total_tokens': 0
        }
        
        # 初始化token编码器
        self.tokenizer = tiktoken.encoding_for_model("gpt-3.5-turbo")
        
        # 记录开始时间
        self.start_time = datetime.now()
        
        # 价格配置(每1000个token的价格,单位:元)
        self.price_config = {
            'prompt_tokens': 0.002,  # 输入token价格
            'completion_tokens': 0.004  # 输出token价格
        }

        # Initialize table processor
        self.table_processor = self.TableProcessor()
        
        # Initialize PPT generator
        self.ppt_generator = self.PPTGenerator()
        
        # Configure generation parameters
        self.outline_versions = []
        self.generation_config = {
            'max_outline_versions': 3,
            'outline_timeout': 10,  # 10 seconds timeout
            'temperature_values': [0.5, 0.7, 0.9]  # Different outline creativity
        }

    def count_tokens(self, text: str) -> int:
        """计算文本的token数量"""
        try:
            return len(self.tokenizer.encode(text))
        except Exception as e:
            self.logger.error(f"Token counting error: {str(e)}")
            return 0

    def update_token_usage(self, prompt_tokens: int, completion_tokens: int):
        """更新token使用统计"""
        self.token_usage['prompt_tokens'] += prompt_tokens
        self.token_usage['completion_tokens'] += completion_tokens
        self.token_usage['total_tokens'] = self.token_usage['prompt_tokens'] + self.token_usage['completion_tokens']

    def calculate_cost(self) -> Dict[str, float]:
        """计算费用"""
        return {
            'prompt_cost': (self.token_usage['prompt_tokens'] / 1000) * self.price_config['prompt_tokens'],
            'completion_cost': (self.token_usage['completion_tokens'] / 1000) * self.price_config['completion_tokens'],
            'total_cost': ((self.token_usage['prompt_tokens'] / 1000) * self.price_config['prompt_tokens'] +
                         (self.token_usage['completion_tokens'] / 1000) * self.price_config['completion_tokens'])
        }

    async def _process_documents(self):
        """处理上传的文档"""
        try:
            multimodal_contents = []
            
            for path in self.file_paths:
                # 获取文件类型
                file_type = os.path.splitext(path)[1][1:].lower()
                processor = get_file_processor(file_type)
                
                # 提取内容
                with open(path, 'rb') as f:
                    # 提取文本
                    text_content = await processor.extract_text(f)
                    f.seek(0)
                    
                    # 提取表格
                    tables = await processor.extract_tables(f)
                    f.seek(0)
                    
                    # 提取图片和图表
                    images = await processor.extract_images(f)
                    
                    # 创建多模态内容
                    content = MultimodalContent()
                    content.text_content = text_content
                    
                    # 处理图片和图表
                    for img_data in images:
                        analysis = await self.image_understanding.analyze_image(img_data)
                        if analysis['type'] == 'chart':
                            content.charts.append(analysis)
                        else:
                            content.images.append(analysis)
                    
                    # 处理表格
                    content.tables = tables
                    multimodal_contents.append(content)
            
            # 初始化向量存储
            await self._initialize_vector_stores(multimodal_contents)
            
        except Exception as e:
            self.logger.error(f"Document processing error: {str(e)}")
            raise
    
    async def _initialize_vector_stores(self, contents: List[MultimodalContent]):
        """初始化向量存储"""
        try:
            # 处理文本内容
            text_documents = []
            for content in contents:
                chunks = self.text_splitter.split_text(content.text_content)
                text_documents.extend([
                    Document(page_content=chunk, metadata={"type": "text"})
                    for chunk in chunks
                ])
            
            # 处理视觉内容
            visual_documents = []
            for content in contents:
                # 处理图片
                for img in content.images:
                    visual_documents.append(
                        Document(
                            page_content=img['content'],
                            metadata={"type": "image"}
                        )
                    )
                
                # 处理图表
                for chart in content.charts:
                    visual_documents.append(
                        Document(
                            page_content=chart['content'],
                            metadata={"type": "chart"}
                        )
                    )
                
                # 处理表格
                for table in content.tables:
                    visual_documents.append(
                        Document(
                            page_content=json.dumps(table, ensure_ascii=False),
                            metadata={"type": "table"}
                        )
                    )
            
            # 创建向量存储
            self.text_vector_store = FAISS.from_documents(text_documents, self.embeddings)
            self.visual_vector_store = FAISS.from_documents(visual_documents, self.embeddings)
            
        except Exception as e:
            self.logger.error(f"Vector store initialization error: {str(e)}")
            raise
    
    async def hybrid_retrieve(self, query: str, k: int = 5) -> List[Document]:
        """混合检索"""
        try:
            # 文本检索
            text_results = self.text_vector_store.similarity_search(query, k=k)
            
            # 视觉内容检索
            visual_results = self.visual_vector_store.similarity_search(query, k=k//2)
            
            # 结果融合
            all_results = text_results + visual_results
            
            # 根据相关性排序
            sorted_results = sorted(
                all_results,
                key=lambda x: x.metadata.get('score', 0),
                reverse=True
            )
            
            return sorted_results[:k]
            
        except Exception as e:
            self.logger.error(f"Hybrid retrieval error: {str(e)}")
            raise
    
    def _enhance_prompt_with_visuals(self, query: str, retrieved_docs: List[Document]) -> str:
        """增强提示词，加入视觉内容"""
        prompt = f"基于以下文本和视觉信息回答问题：\n\n问题：{query}\n\n"
        
        # 添加文本内容
        text_docs = [doc for doc in retrieved_docs if doc.metadata['type'] == 'text']
        if text_docs:
            prompt += "\n文本内容：\n"
            for doc in text_docs:
                prompt += f"{doc.page_content}\n"
        
        # 添加图片描述
        image_docs = [doc for doc in retrieved_docs if doc.metadata['type'] == 'image']
        if image_docs:
            prompt += "\n图片描述：\n"
            for doc in image_docs:
                prompt += f"[图片] {doc.page_content}\n"
        
        # 添加图表描述
        chart_docs = [doc for doc in retrieved_docs if doc.metadata['type'] == 'chart']
        if chart_docs:
            prompt += "\n图表描述：\n"
            for doc in chart_docs:
                prompt += f"[图表] {doc.page_content}\n"
        
        # 添加表格内容
        table_docs = [doc for doc in retrieved_docs if doc.metadata['type'] == 'table']
        if table_docs:
            prompt += "\n表格内容：\n"
            for doc in table_docs:
                prompt += f"[表格] {doc.page_content}\n"
        
        return prompt
    
    #   async def generate_training_outline(self, requirements=None):
    #     """生成培训大纲"""
    #     try:
    #         # 构建查询
    #         query = "生成一个培训大纲"
    #         if requirements:
    #             query += f"，要求：{requirements}"
            
    #         # 混合检索
    #         retrieved_docs = await self.hybrid_retrieve(query)
            
    #         # 构建增强提示词
    #         prompt = self._enhance_prompt_with_visuals(query, retrieved_docs)
            
    #         # 生成大纲
    #         response = await self.llm.agenerate(prompt)
            
    #         return response.generations[0].text
            
    #     except Exception as e:
    #         self.logger.error(f"Outline generation error: {str(e)}")
    #         raise
    
    # async def generate_section_content(self, section_title: str, section_type: str = "theory") -> str:
    #     """生成章节内容"""
    #     try:
    #         # 构建查询
    #         query = f"生成'{section_title}'章节的{section_type}内容"
            
    #         # 混合检索
    #         retrieved_docs = await self.hybrid_retrieve(query)
            
    #         # 构建增强提示词
    #         prompt = self._enhance_prompt_with_visuals(query, retrieved_docs)
            
    #         # 生成内容
    #         response = await self.llm.agenerate(prompt)
            
    #         return response.generations[0].text
            
    #     except Exception as e:
    #         self.logger.error(f"Section content generation error: {str(e)}")
    #         raise
# 
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_training_outline(self, requirements=True):
        """使用模型生成培训大纲，包含搜索查询和引用"""
        self.logger.info("Starting generate_training_outline")
        
        try:
            if not self.vector_store:
                self.logger.error("Vector store not initialized")
                raise ValueError("Vector store initialization failed. Please check file processing.")

            # 1. 创建搜索查询的 prompt
            self.logger.info("Creating search query prompt")
            search_prompt = PromptTemplate(
                template="""根据以下背景信息，生成3-5个搜索查询来查找相关的培训大纲结构和最佳实践：
                {background_info}
                
                请以JSON格式返回查询：
                {{"queries": ["查询1", "查询2", "查询3"]}}
                """,
                input_variables=["background_info"]
            )
            
            # 2. 生成搜索查询
            self.logger.info("Generating search queries")
            try:
                chain = LLMChain(llm=self.llm, prompt=search_prompt)
                json_str = await chain.arun(background_info=json.dumps(self.background_informations))
                self.logger.info(f"Generated search queries JSON: {json_str}")
            except Exception as e:
                self.logger.error(f"Error generating search queries: {str(e)}")
                raise TypeError(f"Error generating search queries: {str(e)}")
            
            # 3. 解析查询并搜索
            try:
                queries_dict = json.loads(json_str)
                if not isinstance(queries_dict, dict) or "queries" not in queries_dict:
                    self.logger.warning("Invalid queries format, using default queries")
                    queries_dict = {"queries": [
                        f"培训大纲最佳实践 {self.background_informations}",
                        f"培训文档结构 {self.background_informations}",
                        "培训文档结构",
                        "新员工培训内容"
                    ]}
            except json.JSONDecodeError:
                self.logger.error(f"JSON parsing error: {json_str}")
                queries_dict = {"queries": [
                    f"培训大纲最佳实践 {self.background_informations}",
                    f"培训文档结构 {self.background_informations}",
                    "培训文档结构",
                    "新员工培训内容"
                ]}

            # 4. 获取本地文档内容
            search_results = []
            try:
                self.logger.info("Performing similarity search")
                # Use a meaningful query instead of empty string
                query = f"培训大纲 {json.dumps(self.background_informations)}"
                docs = self.vector_store.similarity_search(query, k=5)  # Limit to top 5 results
                
                if docs:
                    local_context = "\n\n".join([doc.page_content for doc in docs])
                    search_results.append(f"本地文档:\n{local_context}")
                    self.logger.info(f"Found {len(docs)} relevant documents")
                else:
                    self.logger.warning("No relevant documents found in similarity search")
            except Exception as e:
                self.logger.error(f"Error in similarity search: {str(e)}", exc_info=True)
                search_results.append("没有其他上下文")

            # 5. 创建大纲生成的 prompt
            self.logger.info("Creating outline generation prompt")
            outline_prompt = PromptTemplate(
                template="""作为专业的培训文档专家，请根据以下信息生成详细的培训大纲：

                背景信息：
                {background_info}

                参考资料：
                {search_results}

                要求：
                1. 清晰且结构化的大纲
                2. 使用数字编号（1., 1.1, 1.1.1）
                3. 包含必要的章节（介绍、主要内容、总结）
                4. 考虑实用性和完整性
                5. 适当使用[1]、[2]格式引用参考资料

                请生成大纲：""",
                input_variables=["background_info", "search_results"]
            )

            # 6. 生成大纲
            self.logger.info("Generating outline")
            chain = LLMChain(llm=self.llm, prompt=outline_prompt)
            outline = await chain.arun(
                background_info=json.dumps(self.background_informations),
                search_results="\n\n".join(search_results) if search_results else "没有其他上下文"
            )

            if not outline or len(outline.strip()) < 10:  # Basic validation
                self.logger.error("Generated outline is empty or too short")
                raise ValueError("Failed to generate a valid outline")

            # 7. 格式化引用
            self.logger.info("Formatting citations")
            outline = insert_references(outline)
            
            self.logger.info("Outline generation completed successfully")
            self.logger.info(f"Outline length: {len(outline)}")
            self.logger.debug(f"Outline preview: {outline[:200]}...")

            # 计算输入token
            prompt_tokens = self.count_tokens(str(self.background_informations))
            
            # 计算输出token
            completion_tokens = self.count_tokens(outline)
            
            # 更新使用统计
            self.update_token_usage(prompt_tokens, completion_tokens)
            
            return outline

        except Exception as e:
            self.logger.error(f"Error in generate_training_outline: {str(e)}", exc_info=True)
            raise

    # async def _rerank_documents(self, query: str, docs: List[Document], top_k: int = 5) -> List[Document]:
    #     """
    #     Rerank documents using Cross-Encoder model.
    #     
    #     Args:
    #         query: The search query
    #         docs: List of retrieved documents
    #         top_k: Number of top documents to return after reranking
    #     
    #     Returns:
    #         List of reranked documents
    #     """
    #     logging.info("Reranking documents")
    #     if not docs:
    #         logging.info("No documents to rerank")
    #         return []
    #     
    #     # Prepare pairs of (query, document) for reranking
    #     pairs = [(query, doc.page_content) for doc in docs]
    #     
    #     # Get scores from Cross-Encoder
    #     scores = self.reranker.predict(pairs)
    #     
    #     # Create list of (score, doc) tuples and sort by score
    #     scored_docs = list(zip(scores, docs))
    #     scored_docs.sort(key=lambda x: x[0], reverse=True)
    #     
    #     # Return top_k documents
    #     logging.info(f"Returning top {top_k} documents")
    #     return [doc for _, doc in scored_docs[:top_k]]

    def _generate_cache_key(self, file_paths: List[str]) -> str:
        """生成缓存键，基于文件内容的哈希"""
        logging.info("Generating cache key")
        content_hash = hashlib.md5()
        for path in sorted(file_paths):
            with open(path, 'rb') as f:
                content_hash.update(f.read())
        return f"vectors_{content_hash.hexdigest()}.faiss"

    def parse_sections(self, outline: str) -> List[str]:
        """解析大纲中的章节"""
        logging.info("Parsing sections")
        try:
            # 使用正则表达式匹配章节标题
            # 匹配模式：数字+点+空格+文本
            sections = []
            lines = outline.split('\n')
            current_section = []
            
            for line in lines:
                # 清理行
                line = line.strip()
                if not line:
                    continue
                
                # 检查是否是新章节（例如：1. 章节标题）
                if re.match(r'^\d+\.', line):
                    if current_section:
                        sections.append('\n'.join(current_section))
                    current_section = [line]
                else:
                    current_section.append(line)
        
            # 添加最后一个章节
            if current_section:
                sections.append('\n'.join(current_section))
        
            logging.info(f"Parsed sections: {sections}")
            return sections
        
        except Exception as e:
            logging.error(f"Error parsing sections: {str(e)}")
            return []

    def _save_vectors_to_cloud(self):
        """保存向量数据到云存储"""
        logging.info("Saving vectors to cloud")
        try:
            # 创建临时文件
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = os.path.join(temp_dir, self.vector_store_key)
                # 保存向量存储到临时文件
                self.vector_store.save_local(temp_path)
                
                # 上传到云存储
                s3_url = upload_file_to_s3_by_key(
                    self.vector_store_key,
                    temp_path
                )
                # 保存文档URL和用户邮箱到数据库
                doc = Document(
                    url=s3_url,
                    user_email=self.user_email  # 假设user_email是在类初始化时设置的
                )
                doc.save()
                logging.info(f"Successfully saved vectors to cloud: {s3_url}")
                
        except Exception as e:
            logging.error(f"Failed to save vectors to cloud: {str(e)}")

    def _load_vectors_from_cloud(self):
        """从云存储加载向量数据"""
        logging.info("Loading vectors from cloud")
        try:
                # 从云存储下载文件
                local_paths = download_file_from_s3(
                    self.vector_store_key,
                    self.user_email
                )
                
                if local_paths == "error":
                    raise Exception("Failed to download vectors from cloud")
                
                # 加载向量存储
                for local_path in local_paths:
                    return FAISS.load_local(local_path)
                
        except Exception as e:
            logging.error(f"Failed to load vectors from cloud: {str(e)}")
            raise

    def format_docs_with_id(self, docs: List[Document]) -> str:
        """格式化文档内容，包含引用ID"""
        logging.info("Formatting documents with ID")
        formatted = []
        for i, doc in enumerate(docs):
            formatted.append(f"""
Source ID: {i}
Document: {self.format_citation(doc.metadata.get('source', 'Unknown'))}
Content: {doc.page_content}
""")
        return "\n\n".join(formatted)
    
    async def chat_completion_with_backoff(self, messages: list, temperature: float = 0.7, max_tokens: int = 2000) -> any:
        """使用退避重试机制的chat completion调用"""
        logging.info("Starting chat completion")
        logging.info(f"Messages: {messages}")
        logging.info(f"Temperature: {temperature}")
        logging.info(f"Max tokens: {max_tokens}")
        
        try:
            # Handle different message formats
            if isinstance(messages, list):
                if len(messages) == 0:
                    raise ValueError("Empty messages list")
                
                if isinstance(messages[0], dict):
                    if "content" in messages[0]:
                        prompt = messages[0]["content"]
                    else:
                        prompt = str(messages[0])
                else:
                    prompt = str(messages[0])
            elif isinstance(messages, dict):
                if "system_prompt" in messages and "user_prompt" in messages:
                    prompt = f"{messages['system_prompt']}\n\n{messages['user_prompt']}"
                else:
                    prompt = str(messages)
            else:
                prompt = str(messages)
            
            logging.info(f"Using prompt: {prompt[:200]}...")  # Log first 200 chars
            
            # 使用LangChain的invoke方法
            logging.info("Calling LLM")
            response = await self.llm.ainvoke(prompt)
            logging.info("LLM call completed")
            
            # 提取content字段
            if hasattr(response, 'content'):
                content = response.content
            elif isinstance(response, dict):
                content = response.get('content', '')
            elif isinstance(response, str):
                content = response
            else:
                content = str(response)
            
            logging.info(f"Response length: {len(content)}")
            logging.info(f"Response preview: {content[:200]}...")  # Log first 200 chars
            return content
            
        except Exception as e:
            logging.error(f"Error in chat_completion_with_backoff: {str(e)}")
            print(f"Error in chat_completion_with_backoff: {str(e)}")
            return None

    async def generate_fulldoc_with_template(self, template: str):
        """使用模型生成完整的培训文档，适应不同的模板结构"""
        logging.info("Starting generate_fulldoc_with_template")
        logging.info(f"Template: {template}")
        
        try:
            # 使用模板生成大纲的 prompt
            outline_prompt = PromptTemplate(
                template="""作为专业的培训文档专家，请参考以下模板结构和背景信息，生成一个详细的培训大纲：

                模板结构：
                {template}

                背景信息：
                {background_info}

                要求：
                1. 参考模板的结构和风格
                2. 使用数字编号（1., 1.1, 1.1.1）
                3. 确保包含所有必要的章节
                4. 保持内容的完整性和实用性
                5. 适当扩展模板中未提及但必要的内容

                请生成大纲：""",
                input_variables=["template", "background_info"]
            )

            # 生成大纲
            logging.info("Generating outline based on template")
            chain = LLMChain(llm=self.llm, prompt=outline_prompt)
            outline = await chain.arun(
                template=template,
                background_info=json.dumps(self.background_informations)
            )

            if not outline:
                logging.error("Failed to generate outline")
                return None
                
            sections = self._parse_outline(outline)
            logging.info(f"Parsed sections: {sections}")
            full_doc = [outline]
            
            # Process all sections in parallel
            all_section_contents = await asyncio.gather(
                *[self.process_section(section) for section in sections]
            )
            
            # Flatten results and add to document
            for section_content in all_section_contents:
                full_doc.extend([
                    f"\n\n## {section_content['title']}",
                    section_content['main_content'],
                    "\n\n### 实践内容",
                    section_content['practice'],
                    "\n\n### 案例分析",
                    section_content['case_study'],
                    "\n\n### 测试题",
                    section_content['quiz']
                ])
                if 'optimization' in section_content:
                    full_doc.extend([
                        "\n\n### 优化建议",
                        section_content['optimization']
                    ])
            
            final_doc = '\n'.join(full_doc)
            
            return final_doc
            
        except Exception as e:
            logging.error(f"Error in generate_fulldoc_with_template: {str(e)}")
            raise

    async def process_section(self, section: str) -> dict:
        """并行处理单个章节的所有内容"""
        try:
            # Generate main content first
            main_content = await self.generate_section_content_async(section, "main")
            
            # Generate additional content
            tasks = [
                self.generate_section_content_async(section, "practice"),
                self.generate_section_content_async(section, "case_study"),
                self.generate_quiz_async(section),
            ]
            
            results = await asyncio.gather(*tasks)
            
            # Structure the section content as dictionary
            section_content = {
                'title': section,
                'main_content': main_content,
                'practice': results[0],
                'case_study': results[1],
                'quiz': results[2]
            }
            
            # Only add optimization suggestions at the end of the document
            if section.lower().strip() == "总结":
                optimization_task = await self.generate_section_content_async(section, "optimization")
                section_content['optimization'] = optimization_task
                self.optimization_suggestions = optimization_task
                logging.info(f"Generated optimization suggestions: {optimization_task}")
            
            return section_content
        except Exception as e:
            logging.error(f"Error processing section {section}: {str(e)}")
            return {
                'title': section,
                'main_content': f"Error generating content: {str(e)}",
                'practice': '',
                'case_study': '',
                'quiz': ''
            }

    async def generate_section_content_async(self, section_title: str, section_type: str) -> str:
        """异步生成章节内容，包含搜索和引用"""
        logging.info("Generating section content")
        prompt_of_informations = self.generate_prompt()
        
        # 1. 生成搜索查询
        search_queries = await self._generate_search_queries(section_title)
        
        all_retrieved_docs = []
        # 对每个查询进行搜索
        for query in search_queries:  
            # 使用向量存储进行检索
            docs = self.vector_store.similarity_search(query)
            if docs:
                all_retrieved_docs.extend(docs)
        
        # 只在最后进行一次rerank
        all_docs = all_retrieved_docs[:10] if all_retrieved_docs else []
        
        # 3. 从本地文档获取内容
        local_context = "\n\n".join([doc.page_content for doc in all_docs])
        
        # 4. 组合所有参考资料
        references = []
        if all_docs:
            references.extend([
                f"[{i+1}] {doc.metadata.get('source', 'Local Document')}"
                for i, doc in enumerate(all_docs)
            ])

        # 5. 根据不同类型生成内容模板
        if section_type == "theory":
            template = prompt_of_informations + """
            特长：制定专业，系统，易懂的理论教学内容。
            现请根据培训文档中的以下章节内容生成理论教学内容:
            
            章节标题: {section_title}
            
            要求:
            1. 概念解释要清晰准确
            2. 包含具体的示例
            3. 突出重点难点
            4. 添加相关知识链接
            5. 适当引用参考资料，使用[数字]格式
            
            相关文档内容:
            {context}
            
            参考资料：
            {references}
            """
        elif section_type == "practice":
            template = prompt_of_informations + """
            特长：制定实用，可操作性强，循序渐进的实践内容。
            现请根据培训文档中的以下章节内容生成实践内容：
            
            章节标题: {section_title}
            
            要求：
            1. 设计具体的练习任务
            2. 提供详细的操作步骤
            3. 包含常见问题和解决方案
            4. 添加评估标准
            5. 适当引用参考资料，使用[数字]格式
            
            相关文档内容：
            {context}
            
            参考资料：
            {references}
            """
        elif section_type == "case_study":
            template = prompt_of_informations + """
            特长：制定贴合实际，分析深入，启发性强的案例分析。
            现请根据培训文档中的以下章节内容生成案例分析：
            
            章节标题: {section_title}
            
            要求：
            1. 选择相关的实际案例
            2. 分析案例的关键点
            3. 提供解决方案
            4. 总结经验教训
            5. 适当引用参考资料，使用[数字]格式
            
            相关文档内容：
            {context}
            
            参考资料：
            {references}
            """
        # elif section_type == "optimization":
        #     template = prompt_of_informations + """
        #     特长：制定优化建议。
        #     现请根据培训文档中的以下章节内容生成优化建议：
            
        #     章节标题: {section_title}
            
        #     要求：
        #     1. 总结主要内容和关键点
        #     2. 提出优化建议
        #     3. 解释优化理由
        #     4. 适当引用参考资料，使用[数字]格式
            
        #     相关文档内容：
        #     {context}
            
        #     参考资料：
        #     {references}
        #     """
        else:  # main
            template = prompt_of_informations + """
            特长：制定详细，准确，易懂的章节内容。
            现请根据培训文档中的以下章节内容生成章节内容：
            
            章节标题: {section_title}
            
            要求：
            1. 概念解释要清晰准确
            2. 包含具体的示例
            3. 突出重点难点
            4. 添加相关知识链接
            5. 适当引用参考资料，使用[数字]格式
            
            相关文档内容：
            {context}
            
            参考资料：
            {references}
            """
        
        # 6. 创建提示模板并生成内容
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context", "references"]
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        content = await chain.arun(
            section_title=section_title,
            context=local_context,
            references="\n".join(references)
        )
        
        # 7. Review and optimize the content
        review_chain = LLMChain(llm=self.llm, prompt=PromptTemplate(
            template=SECTION_REVIEW_PROMPT,
            input_variables=["section_title", "section_type", "content"]
        ))
        content = await review_chain.arun(
            section_title=section_title,
            section_type=section_type,
            content=content
        )
        
        # 8. 插入引用
        content = insert_references(content)
        
        # 9. 如果启用了图片检索功能，检索并插入相关图片
        if hasattr(self, 'enable_image_retrieval') and self.enable_image_retrieval and hasattr(self, 'image_retriever'):
            try:
                # 将内容分成段落
                paragraphs = content.split('\n\n')
                enhanced_paragraphs = []
                
                # 首先基于章节标题检索图片
                title_images = self.retrieve_relevant_images(
                    text=section_title,
                    top_k=1,
                    similarity_threshold=0.25  # 对标题要求更高的相似度
                )
                
                # 如果有基于标题的图片，在第一段后插入
                if title_images and len(paragraphs) > 0:
                    enhanced_paragraphs.append(paragraphs[0])
                    img = title_images[0]
                    enhanced_paragraphs.append(f"\n![{img['filename']}]({img['path']})\n")
                    paragraphs = paragraphs[1:]
                
                # 处理剩余段落
                for i, para in enumerate(paragraphs):
                    enhanced_paragraphs.append(para)
                    
                    # 每3个段落检索一次图片
                    if (i + 1) % 3 == 0 and len(para) > 100:
                        # 基于段落内容检索图片
                        para_images = self.retrieve_relevant_images(
                            text=para,
                            top_k=1,
                            similarity_threshold=0.2
                        )
                        
                        # 如果找到相关图片，插入到段落后
                        if para_images:
                            img = para_images[0]
                            enhanced_paragraphs.append(f"\n![{img['filename']}]({img['path']})\n")
                
                # 重新组合内容
                content = '\n\n'.join(enhanced_paragraphs)
                logging.info("Added relevant images to section content")
            except Exception as e:
                logging.error(f"Error adding images to section content: {str(e)}")
                # 如果添加图片失败，继续使用原始内容
        
        logging.info("Section content generated successfully")
        logging.info(f"Section content length: {len(content)}")
        logging.info(f"Section content preview: {content[:200]}...")  
        return content

    async def generate_quiz_async(self, section_title: str) -> str:
        logging.info("Generating quiz")
        prompt_of_informations=self.generate_prompt()
        """异步生成测试题"""
        template =prompt_of_informations+ """
        特长：制定专业，针对性强，贴合度高的测试题。
        现请根据培训文档中的以下章节内容生成测试题：
        可以参考相关可靠的网上资料制定，
        章节标题: {section_title}
        
        要求：
        1. 包含多种题型（选择题、判断题、简答题）
        2. 每种题型至少2题
        3. 提供答案和解析
        4. 测试重点知识点
        
        相关文档内容：
        {context}
        """
        
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context"]
        )
        print("quiz_prompt",prompt)
        chain = LLMChain(llm=self.llm, prompt=prompt)
        quiz = await chain.arun(
            section_title=section_title,
            context=context
        )
        
        logging.info("Quiz generated successfully")
        logging.info(f"Quiz length: {len(quiz)}")
        logging.info(f"Quiz preview: {quiz[:200]}...")  
        return quiz

    async def generate_summary_async(self, section_title: str) -> str:
        logging.info("Generating summary")
        prompt_of_informations=self.generate_prompt()
        """异步生成章节总结"""
        template =prompt_of_informations+ """
        特长：制定条理清晰，专业实用，概括性强的总结内容。
        现请根据培训文档中的以下章节内容生成总结：
        
        章节标题: {section_title}
        
        要求：
        1. 概括主要内容和关键点
        2. 突出重要概念和原理
        3. 总结实践要点
        4. 提供进一步学习建议
        
        相关文档内容：
        {context}
        """
        
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context"]
        )
        print("summary_prompt",prompt)
        chain = LLMChain(llm=self.llm, prompt=prompt)
        summary = await chain.arun(
            section_title=section_title,
            context=context
        )
        
        logging.info("Summary generated successfully")
        logging.info(f"Summary length: {len(summary)}")
        logging.info(f"Summary preview: {summary[:200]}...")  
        return summary

    def _parse_outline(self, outline):
        """解析大纲，支持字符串或列表格式"""
        logging.info("Parsing outline")
        sections = []
        
        # 如果是列表格式，直接提取标题
        if isinstance(outline, list):
            for item in outline:
                if isinstance(item, dict) and 'title' in item:
                    sections.append(item['title'])
                    # 如果有子章节，也添加进去
                    if 'subsections' in item and isinstance(item['subsections'], list):
                        for subsection in item['subsections']:
                            if isinstance(subsection, dict) and 'title' in subsection:
                                sections.append(subsection['title'])
        
        # 如果是字符串格式，使用原有的解析逻辑
        elif isinstance(outline, str):
            lines = outline.split('\n')
            for line in lines:
                line = line.strip()
                if line.startswith('##') or line.startswith('###'):
                    if '[' in line and ']' in line:
                        section_title = line[line.find('[')+1:line.find(']')]
                        sections.append(section_title)
                    elif ':' in line:
                        section_title = line.split(':')[1].strip()
                        sections.append(section_title)
                    else:
                        section_title = ' '.join(line.split()[1:]).strip()
                        if section_title:
                            sections.append(section_title)
        
        logging.info(f"Parsed sections: {sections}")
        return sections
    
    async def generate_full_training_doc_async(self, outline: str) -> str:
        """异步生成完整的培训文档"""
        logging.info("Generating full training document")
        sections = self._parse_outline(outline)
        print("解析到的章节:", sections)
        
        # 并行处理所有章节
        all_section_contents = await asyncio.gather(
            *[self.process_section(section) for section in sections]
        )
        
        # 构建完整文档
        full_doc = []
        for section_content in all_section_contents:
            try:
                full_doc.extend([
                    f"\n\n## {section_content['title']}",
                    section_content['main_content'],
                    "\n\n### 实践内容",
                    section_content['practice'],
                    "\n\n### 案例分析",
                    section_content['case_study'],
                    "\n\n### 测试题",
                    section_content['quiz']
                ])
                if 'optimization' in section_content:
                    full_doc.extend([
                        "\n\n### 优化建议",
                        section_content['optimization']
                    ])
            except Exception as e:
                logging.error(f"Error processing section content: {str(e)}")
                continue
        
        # 合并所有内容
        complete_doc = '\n'.join(full_doc)
        
        # 计算输入token
        prompt_tokens = self.count_tokens(outline)
        
        # 计算输出token
        completion_tokens = self.count_tokens(complete_doc)
        
        # 更新使用统计
        self.update_token_usage(prompt_tokens, completion_tokens)
        
        return complete_doc

    async def save_full_doc(self, full_doc: str) -> str:
        """异步保存完整的培训文档"""
        logging.info("Saving full document")
        try:
            # 创建输出目录
            os.makedirs('output', exist_ok=True)
            
            # 生成文件名
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'output/training_doc_{timestamp}.md'
            
            # 写入文件
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(full_doc)
            
            logging.info(f"Full document saved to: {filename}")
            return filename
            
        except Exception as e:
            logging.error(f"Error saving full doc: {str(e)}")
            print(f"Error saving full doc: {str(e)}")
            raise

    async def save_evaluation_results(self, evaluation_results: dict, outline: str, full_doc: str) -> Tuple[str, str]:
        """异步保存评估结果"""
        logging.info("Saving evaluation results")
        try:
            # 创建输出目录
            os.makedirs('output', exist_ok=True)
            
            # 生成文件名
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            eval_filename = f'output/evaluation_{timestamp}.json'
            doc_filename = f'output/document_{timestamp}.md'
            
            # 保存评估结果
            with open(eval_filename, 'w', encoding='utf-8') as f:
                json.dump(evaluation_results, f, ensure_ascii=False, indent=2)
            
            # 保存文档
            with open(doc_filename, 'w', encoding='utf-8') as f:
                f.write(f"# 培训大纲\n\n{outline}\n\n# 培训文档\n\n{full_doc}")
            
            logging.info(f"Evaluation results saved to: {eval_filename}")
            logging.info(f"Document saved to: {doc_filename}")
            return eval_filename, doc_filename
            
        except Exception as e:
            logging.error(f"Error saving evaluation results: {str(e)}")
            print(f"Error saving evaluation results: {str(e)}")
            raise

    async def evaluate_full_doc(self, outline: str, full_doc: str) -> dict:
        """异步评估生成的文档"""
        logging.info("Evaluating full document")
        try:
            # 简单的评估逻辑
            evaluation = {
                "timestamp": datetime.now().isoformat(),
                "outline_length": len(outline),
                "document_length": len(full_doc),
                "sections": len(self.parse_sections(outline)),
                "quality_metrics": {
                    "has_outline": bool(outline.strip()),
                    "has_content": bool(full_doc.strip()),
                }
            }
            logging.info("Evaluation completed")
            logging.info(f"Evaluation results: {evaluation}")
            return evaluation
            
        except Exception as e:
            logging.error(f"Error evaluating document: {str(e)}")
            print(f"Error evaluating document: {str(e)}")
            return {}

    async def _generate_search_queries(self, section_title: str) -> List[str]:
        """为章节生成搜索查询"""
        # Cache key for search queries
        cache_key = hashlib.md5(section_title.encode()).hexdigest()
        cache_dir = os.path.join(os.path.dirname(__file__), 'cache', 'queries')
        os.makedirs(cache_dir, exist_ok=True)
        cache_path = os.path.join(cache_dir, f"{cache_key}.json")
        
        # Try to load from cache
        if os.path.exists(cache_path):
            try:
                with open(cache_path, 'r', encoding='utf-8') as f:
                    cached_data = json.load(f)
                    if cached_data.get('title') == section_title:
                        self.logger.info(f"Loading search queries from cache for: {section_title}")
                        return cached_data.get('queries', [])
            except Exception as e:
                self.logger.warning(f"Failed to load search queries from cache: {str(e)}")
        
        # Generate new queries if not in cache
        try:
            search_prompt = PromptTemplate(
                input_variables=["title"],
                template="基于以下章节标题，生成3-5个相关的搜索查询，用于检索相关内容：{title}\n\n生成的查询应该覆盖不同角度，每行一个查询。"
            )
            
            chain = LLMChain(llm=self.llm, prompt=search_prompt)
            result = await chain.arun(title=section_title)
            
            # Parse queries from result
            queries = [q.strip() for q in result.split('\n') if q.strip()]
            
            # Save to cache
            try:
                with open(cache_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'title': section_title,
                        'queries': queries,
                        'timestamp': datetime.now().isoformat()
                    }, f, ensure_ascii=False, indent=2)
            except Exception as e:
                self.logger.warning(f"Failed to save search queries to cache: {str(e)}")
            
            return queries
            
        except Exception as e:
            self.logger.error(f"Error generating search queries: {str(e)}")
            return []

    async def initialize_vector_store(self):
        """Initialize or reload the vector store"""
        try:
            # Try to load from cache first
            cache_dir = os.path.join(os.path.dirname(__file__), 'cache')
            os.makedirs(cache_dir, exist_ok=True)
            cache_path = os.path.join(cache_dir, self.vector_store_key)
            
            if os.path.exists(cache_path):
                try:
                    self.logger.info(f"Loading vector store from cache: {cache_path}")
                    self.vector_store = FAISS.load_local(cache_path, self.embeddings)
                    self.logger.info("Vector store loaded from cache successfully")
                    return
                except Exception as e:
                    self.logger.warning(f"Failed to load vector store from cache: {str(e)}")
                    self.vector_store = None
            
            # If cache loading failed or doesn't exist, create new vector store
            documents = []
            for path in self.file_paths:
                try:
                    # Get file extension
                    file_ext = os.path.splitext(path)[1].lower()
                    
                    # Choose appropriate loader
                    if file_ext == '.pdf':
                        loader = PyPDFLoader(path)
                    elif file_ext in ['.docx', '.doc']:
                        loader = Docx2txtLoader(path)
                    elif file_ext == '.txt':
                        loader = TextLoader(path, encoding='utf-8')
                    elif file_ext == '.html':
                        loader = BSHTMLLoader(path)
                    else:
                        self.logger.warning(f"Unsupported file type for {path}")
                        continue
                    
                    docs = loader.load()
                    for doc in docs:
                        chunks = self.text_splitter.split_text(doc.page_content)
                        for chunk in chunks:
                            documents.append(Document(
                                page_content=chunk,
                                metadata={'source': path}
                            ))
                            
                except Exception as e:
                    self.logger.error(f"Error processing file {path}: {str(e)}")
                    continue
            
            if documents:
                # Improved batching process
                batch_size = 100  # Increased batch size
                total_batches = (len(documents) + batch_size - 1) // batch_size
                
                self.logger.info(f"Processing {len(documents)} documents in {total_batches} batches")
                
                # Initialize empty FAISS index for the first batch
                if len(documents) > 0:
                    first_batch = documents[0:min(batch_size, len(documents))]
                    self.vector_store = FAISS.from_documents(first_batch, self.embeddings)
                    
                    # Process remaining batches with progress tracking
                    if len(documents) > batch_size:
                        for batch_num in range(1, total_batches):
                            start_idx = batch_num * batch_size
                            end_idx = min((batch_num + 1) * batch_size, len(documents))
                            batch = documents[start_idx:end_idx]
                            
                            self.logger.info(f"Processing batch {batch_num + 1}/{total_batches}")
                            batch_store = FAISS.from_documents(batch, self.embeddings)
                            self.vector_store.merge_from(batch_store)
                            
                            # Log progress
                            progress = (batch_num + 1) / total_batches * 100
                            self.logger.info(f"Embedding progress: {progress:.1f}%")
                
                # Save to cache
                try:
                    self.logger.info(f"Saving vector store to cache: {cache_path}")
                    self.vector_store.save_local(cache_path)
                    self.logger.info("Vector store saved to cache successfully")
                except Exception as e:
                    self.logger.warning(f"Failed to save vector store to cache: {str(e)}")
            else:
                self.logger.warning("No valid documents to process")
                
        except Exception as e:
            self.logger.error(f"Error initializing vector store: {str(e)}")
            raise
    
    def get_usage_statistics(self) -> Dict[str, any]:
        """获取使用统计信息"""
        duration = (datetime.now() - self.start_time).total_seconds()
        costs = self.calculate_cost()
        
        return {
            'token_usage': self.token_usage,
            'duration_seconds': duration,
            'costs': costs,
            'start_time': self.start_time.isoformat(),
            'end_time': datetime.now().isoformat()
        }

    async def save_document(self, content: str, format: str = 'md') -> str:
        """保存文档并记录最终统计信息"""
        try:
            # 创建输出目录
            os.makedirs('output', exist_ok=True)
            
            # 生成文件名
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'output/training_doc_{timestamp}.{format}'
            
            # 保存文档
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
                
            # 保存使用统计
            stats_filename = f'output/usage_stats_{timestamp}.json'
            with open(stats_filename, 'w', encoding='utf-8') as f:
                json.dump(self.get_usage_statistics(), f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Document saved to: {filename}")
            self.logger.info(f"Usage statistics saved to: {stats_filename}")
            
            return filename
            
        except Exception as e:
            self.logger.error(f"Error saving document: {str(e)}")
            raise

    async def generate_multiple_outlines(self, requirements=None) -> List[str]:
        """生成多个版本的大纲供选择"""
        try:
            outlines = []
            tasks = []
            
            # 使用不同的temperature生成多个版本
            for temp in self.generation_config['temperature_values']:
                task = asyncio.create_task(
                    self._generate_single_outline(requirements, temperature=temp)
                )
                tasks.append(task)
            
            # 等待所有任务完成或超时
            done, pending = await asyncio.wait(
                tasks,
                timeout=self.generation_config['outline_timeout']
            )
            
            # 处理完成的任务
            for task in done:
                try:
                    outline = await task
                    if outline:
                        outlines.append(outline)
                except Exception as e:
                    logger.error(f"Error generating outline: {str(e)}")
            
            # 取消未完成的任务
            for task in pending:
                task.cancel()
            
            # 存储生成的大纲版本
            self.outline_versions = outlines
            
            return outlines
            
        except Exception as e:
            logger.error(f"Error generating multiple outlines: {str(e)}")
            raise

    async def _generate_single_outline(self, requirements=None, temperature=0.7) -> str:
        """生成单个版本的大纲"""
        prompt_of_informations = self.generate_prompt()
        
        # 获取相关文档内容
        docs = self.vector_store.similarity_search("培训课程设计")
        references = []
        local_context = []
        
        for i, doc in enumerate(docs):
            source = doc.metadata.get('source', 'Local Document')
            content = doc.page_content
            reference_id = f"[{i+1}]"
            references.append(f"{reference_id} {source}")
            local_context.append(f"{content} {reference_id}")
        

        
        # 使用修改后的提示模板
        outline_prompt = PromptTemplate(
            template=prompt_of_informations + OUTLINE_PROMPT + """
            请生成一个独特的培训大纲版本，考虑以下要素：
            1. 内容的完整性和逻辑性
            2. 章节的合理组织
            3. 重点内容的突出
            4. 实践环节的设计
            
            在使用文档内容时，请使用[1]、[2]等格式标注引用来源。
            在大纲最后添加"参考文档"部分列出所有引用的文档。
            
            参考文档内容：
            {context}
            
            引用格式示例：
            - 根据[1]的最佳实践...
            - 参考[2]的培训方法...
            
            参考文档：
            {references}
            """,
            input_variables=["context", "references"]
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=self.llm,
            chain_type="stuff",
            retriever=self.vector_store.as_retriever(),
            chain_type_kwargs={
                "prompt": outline_prompt
            }
        )
        
        # 设置temperature以控制创意度
        self.llm.temperature = temperature
        
        outline = await qa_chain.ainvoke({
            "query": f"{self.background_informations.get('project_title')}培训课程设计"
        })
        
        return outline['result'] if isinstance(outline, dict) else outline

    class TableProcessor:
        """处理复杂表格样式的类"""
        def __init__(self):
            self.supported_styles = ['simple', 'grid', 'pipe', 'html']
            
        def parse_table(self, markdown_table: str) -> dict:
            """解析markdown表格，返回结构化数据"""
            # 实现表格解析逻辑
            pass
            
        def format_table(self, table_data: dict, style: str = 'grid') -> str:
            """将表格数据格式化为指定样式"""
            # 实现表格格式化逻辑
            pass

    class PPTGenerator:
        """处理PPT生成的类"""
        def __init__(self):
            self.template_path = "templates/ppt/"
            
        def create_presentation(self, content: str) -> None:
            """创建PPT演示文稿"""
            # 实现PPT生成逻辑
            pass
            
        def add_slide(self, content: str, slide_type: str = 'content') -> None:
            """添加幻灯片"""
            # 实现幻灯片添加逻辑
            pass

    def retrieve_relevant_images(self, text: str, top_k: int = 3, similarity_threshold: float = 0.2) -> List[Dict[str, Any]]:
        """
        检索与给定文本相关的图片
        
        Args:
            text: 用于检索的文本
            top_k: 返回的最大图片数量
            similarity_threshold: 相似度阈值，低于此值的图片将被过滤
            
        Returns:
            包含图片路径、文件名和相似度分数的字典列表
        """
        if not hasattr(self, 'image_retriever') or not self.image_retriever:
            logging.warning("Image retriever not initialized")
            return []
            
        try:
            # 使用图片检索器检索相关图片
            results = self.image_retriever.retrieve_images(
                query_text=text,
                top_k=top_k,
                similarity_threshold=similarity_threshold
            )
            
            # 格式化结果
            formatted_results = []
            for img_path, score in results:
                # 获取文件名
                filename = os.path.basename(img_path)
                
                formatted_results.append({
                    "path": img_path,
                    "filename": filename,
                    "similarity_score": score
                })
                
            logging.info(f"Retrieved {len(formatted_results)} images for text: {text[:50]}...")
            return formatted_results
            
        except Exception as e:
            logging.error(f"Error retrieving images: {str(e)}")
            return []

def insert_references(content: str) -> str:
    """
    Insert reference numbers from square brackets into the content.
    Example: [Source 1] -> [1]
    """
    logging.info("Inserting references")
    if not content:
        return content
    # Find all references like [Source X] and replace with [X]
    content = re.sub(r'\[Source (\d+)\]', r'[\1]', content)
    logging.info("References inserted")
    return content