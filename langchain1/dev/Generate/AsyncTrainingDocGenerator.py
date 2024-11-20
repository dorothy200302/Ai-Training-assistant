# Standard library imports
import re
import os
import json
import tempfile
import asyncio
import hashlib
from datetime import datetime
from typing import List, Dict, Tuple

# Third-party imports
import numpy as np
from pydantic import BaseModel, Field
import backoff
from tenacity import retry, stop_after_attempt, wait_exponential
from fastapi import HTTPException
import logging

# LangChain imports
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain, RetrievalQA
from langchain.schema import Document, SystemMessage, HumanMessage
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.retrievers import WikipediaRetriever

# Transformer imports
from sentence_transformers import CrossEncoder, SentenceTransformer
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Local imports
from dev.Generate.TrainingDocGenerator import TrainingDocGenerator
from dev.CloudStorage.aws import download_file_from_s3, upload_file_to_s3_by_key
from dev.prompts.outlinePrompt import OUTLINE_PROMPT
from dev.prompts.reviewPrompt import *
from dev.models import *
from dev.Generate.search import search_query_ideas

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
        super().__init__(background_informations=background_informations, file_paths=file_paths, model_name=model_name)
        
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
        self.vector_store_key = self._generate_cache_key(file_paths)
        
        # Initialize reranker
        self.reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        # Initialize text splitter with smaller chunk size
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,  # Reduced from 1000
            chunk_overlap=100,  # Reduced from 200
            length_function=len,
            is_separator_regex=False,
        )
        
        # Configure LLM with timeout and retries
        if model_name=="grok-beta":
            self.llm=ChatOpenAI(
                model_name="grok-beta",
                base_url='https://api.x.ai/v1',
                api_key='xai-hToMyvvyeZieK687T3MFsqY2s8VibWRgvg1727PKWILihXQ4yqB3VPuJKC5klm2oMk1sjl26xCR886P2',
                temperature=0.7,
                max_tokens=4000,
                request_timeout=60,  # 60 second timeout
                max_retries=3
            )
        elif model_name=="gpt-4o-mini":
            self.llm=ChatOpenAI(
                model_name="gpt-4o-mini",
                base_url='https://gateway.agione.ai/openai/api/v2',
                api_key='as-D73mmid1JVABYjxT4_ncuw',
                temperature=0.6,
                max_tokens=2000,
                request_timeout=60,  # 60 second timeout
                max_retries=3
            )
            
        # Initialize document loader based on file type
        try:
            documents = []
            total_size = 0
            max_total_size = 10 * 1024 * 1024  # 10MB limit
            
            for path in file_paths:
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
                        from langchain.document_loaders import PyPDFLoader
                        loader = PyPDFLoader(path)
                        docs = loader.load()
                    elif file_ext in ['.docx', '.doc']:
                        from langchain.document_loaders import Docx2txtLoader
                        loader = Docx2txtLoader(path)
                        docs = loader.load()
                    elif file_ext == '.txt':
                        from langchain.document_loaders import TextLoader
                        loader = TextLoader(path, encoding='utf-8')
                        docs = loader.load()
                    elif file_ext == '.html':
                        from langchain.document_loaders import BSHTMLLoader
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
                self.vector_store = FAISS.from_documents(
                    documents,
                    OpenAIEmbeddings(
                        base_url='https://gateway.agione.ai/openai/api/v2',
                        api_key='as-D73mmid1JVABYjxT4_ncuw',
                        request_timeout=30,  # 30 second timeout
                        max_retries=2
                    )
                )
                
                # Save vector store
                vector_store_path = os.path.join(tempfile.gettempdir(), f"vectors_{self.vector_store_key}.faiss")
                self.vector_store.save_local(vector_store_path)
                self.logger.info(f"Vector store saved to: {vector_store_path}")
            else:
                self.logger.warning("No documents were processed successfully")
                self.vector_store = None
                
        except Exception as e:
            self.logger.error(f"Error initializing vector store: {str(e)}")
            self.vector_store = None
    
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
                template="""Based on the following background information, generate 3-5 search queries to find relevant training outline structures and best practices:
                {background_info}
                
                Please return the queries in JSON format as follows:
                {{"queries": ["query1", "query2", "query3"]}}
                """,
                input_variables=["background_info"]
            )
            
            # 2. 生成搜索查询
            self.logger.info("Generating search queries")
            chain = LLMChain(llm=self.llm, prompt=search_prompt)
            json_str = await chain.arun(background_info=json.dumps(self.background_informations))
            self.logger.info(f"Generated search queries JSON: {json_str}")
            
            # 3. 解析查询并搜索
            try:
                queries_dict = json.loads(json_str)
                if not isinstance(queries_dict, dict) or "queries" not in queries_dict:
                    self.logger.warning("Invalid queries format, using default queries")
                    queries_dict = {"queries": ["training outline best practices", "training document structure", "new employee training content"]}
            except json.JSONDecodeError:
                self.logger.error(f"JSON parsing error: {json_str}")
                queries_dict = {"queries": ["training outline best practices", "training document structure", "new employee training content"]}

            # 4. 获取本地文档内容
            search_results = []
            try:
                self.logger.info("Performing similarity search")
                # Add timeout to similarity search
                async def search_with_timeout():
                    return self.vector_store.similarity_search("")
                docs = await asyncio.wait_for(search_with_timeout(), timeout=30.0)
                
                if docs:
                    local_context = "\n\n".join([doc.page_content for doc in docs])
                    search_results.append(f"Local documents:\n{local_context}")
                    self.logger.info(f"Found {len(docs)} relevant documents")
                else:
                    self.logger.warning("No relevant documents found in similarity search")
            except asyncio.TimeoutError:
                self.logger.error("Similarity search timed out")
                search_results.append("Search timed out, proceeding with partial results")
            except Exception as e:
                self.logger.error(f"Error in similarity search: {str(e)}", exc_info=True)
                search_results.append("No additional context available")

            # 5. 创建大纲生成的 prompt
            self.logger.info("Creating outline generation prompt")
            outline_prompt = PromptTemplate(
                template="""As a professional training document expert, please generate a detailed training outline based on the following information:

                Background Information:
                {background_info}

                Reference Materials:
                {search_results}

                Requirements:
                1. Clear and structured outline
                2. Use numerical numbering (1., 1.1, 1.1.1)
                3. Include essential sections (Introduction, Main Content, Summary)
                4. Consider practicality and completeness
                5. Cite references using [1], [2] format where appropriate

                Please generate the outline:""",
                input_variables=["background_info", "search_results"]
            )

            # 6. 生成大纲
            self.logger.info("Generating outline")
            chain = LLMChain(llm=self.llm, prompt=outline_prompt)
            outline = await chain.arun(
                background_info=json.dumps(self.background_informations, ensure_ascii=False),
                search_results="\n\n".join(search_results) if search_results else "No additional context available"
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
            return outline

        except Exception as e:
            self.logger.error(f"Error in generate_training_outline: {str(e)}", exc_info=True)
            raise

    async def _rerank_documents(self, query: str, docs: List[Document], top_k: int = 5) -> List[Document]:
        """
        Rerank documents using Cross-Encoder model.
        
        Args:
            query: The search query
            docs: List of retrieved documents
            top_k: Number of top documents to return after reranking
        
        Returns:
            List of reranked documents
        """
        logging.info("Reranking documents")
        if not docs:
            logging.info("No documents to rerank")
            return []
        
        # Prepare pairs of (query, document) for reranking
        pairs = [(query, doc.page_content) for doc in docs]
        
        # Get scores from Cross-Encoder
        scores = self.reranker.predict(pairs)
        
        # Create list of (score, doc) tuples and sort by score
        scored_docs = list(zip(scores, docs))
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        # Return top_k documents
        logging.info(f"Returning top {top_k} documents")
        return [doc for _, doc in scored_docs[:top_k]]

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
            # First generate the outline
            logging.info("Generating outline")
            outline = await self.generate_training_outline()  
            if not outline:
                logging.error("Failed to generate outline")
                raise ValueError("Failed to generate outline")
            logging.info("Outline generated successfully")
            logging.info(f"Outline preview: {outline[:200]}...")  

            # Then generate the full document based on the outline
            system_prompt = f"""You are a professional document writer. 
            Your task is to generate a detailed document based on the provided outline.
            The document should be well-structured, professional, and follow markdown format.
            Use appropriate headings (##, ###) for different sections.
            Include all necessary information from the outline."""

            user_prompt = f"""Please generate a detailed document based on this outline:

            {outline}

            Additional context:
            {json.dumps(self.background_informations, indent=2)}

            Requirements:
            1. Follow the outline structure exactly
            2. Use markdown formatting
            3. Be detailed and professional
            4. Include all sections from the outline
            5. Keep the content factual and relevant"""

            logging.info("Generating full document")
            response = await self.chat_completion_with_backoff({
                "system_prompt": system_prompt,
                "user_prompt": user_prompt
            }, temperature=0.7, max_tokens=4000)

            if not response:
                logging.error("Failed to generate document content")
                raise ValueError("Failed to generate document content")

            # Clean and format the response
            document_content = response.strip()
            if not document_content.startswith('#'):
                document_content = f"# {template}\n\n{document_content}"
            
            logging.info("Document generation completed")
            logging.info(f"Document length: {len(document_content)}")
            logging.info(f"Document preview: {document_content[:200]}...")  
            return document_content

        except Exception as e:
            logging.error(f"Error in generate_fulldoc_with_template: {str(e)}")
            print(f"Error in generate_fulldoc_with_template: {str(e)}")
            raise

    async def generate_section_content_async(self, section_title: str, section_type: str) -> str:
        """异步生成章节内容，包含搜索和引用"""
        logging.info("Generating section content")
        prompt_of_informations = self.generate_prompt()
        
        # 1. 生成搜索查询
        search_queries = await self._generate_search_queries(section_title)
        
        all_docs = []
        # 对每个查询进行搜索
        for query in search_queries.get('queries', []):
            # 使用向量存储进行检索
            docs = self.vector_store.similarity_search(query)
            if docs:
                # Rerank the retrieved documents
                reranked_docs = await self._rerank_documents(query, docs)
                all_docs.extend(reranked_docs)
        
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
            现请根据培训文档中的以下章节内容生成理论教学内容：
            
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
        else:  # case_study
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
        full_doc = [outline]
        
        async def process_section(section: str) -> List[str]:
            """并行处理单个章节的所有内容"""
            tasks = [
                self.generate_section_content_async(section, "theory"),
                self.generate_section_content_async(section, "practice"),
                self.generate_section_content_async(section, "case_study"),
                self.generate_quiz_async(section),
                self.generate_summary_async(section)
            ]
            
            results = await asyncio.gather(*tasks)
            
            return [
                f"\n\n## {section} - 理论内容\n{results[0]}",
                f"\n\n## {section} - 实践内容\n{results[1]}",
                f"\n\n## {section} - 案例分析\n{results[2]}",
                f"\n\n## {section} - 测试题\n{results[3]}",
                f"\n\n## {section} - 总结\n{results[4]}"
            ]
        
        # 并行处理所有章节
        all_section_contents = await asyncio.gather(
            *[process_section(section) for section in sections]
        )
        
        # 展平结果列表并添加到文档中
        for section_contents in all_section_contents:
            full_doc.extend(section_contents)
        
        logging.info("Full document generated successfully")
        logging.info(f"Full document length: {len(full_doc)}")
        logging.info(f"Full document preview: {full_doc[:200]}...")  
        return "\n\n".join(full_doc)

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
    

# 测试代码
async def main():
    background_informations = {
        "audience_info": "主要众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
        "company_name": "123",
        "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情敬业",
        "company_industry": "互联网",
        "company_competition": "行业领先",
        "user_role": "市场营销经理",
        "industry_info": "互联网",
        "project_title": "市场营销经理",
        "project_dutys": "负责公司市场营销略的制定和执行",
        "project_goals": "了解公司市场营销策略的制定和执行",
        "project_theme": "了解司市场营销策略的制定和执行",
        "project_aim": "了解公司市场营销策略的制定和执行",
        "content_needs": "市场营销策略的制定和执行",
        "format_style": " "
    }
    
    file_paths = [
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",
        r".venv/share/How we receive feedback · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
    ]
    
    # 记录开始时间
    g = AsyncTrainingDocGenerator(file_paths=file_paths, model_name="gpt-4o-mini", user_email="3218961440@qq.com",
                                background_informations=background_informations)
    
    # 使用await调用异步函数
    outline = await g.generate_training_outline()
    full_doc = await g.generate_full_training_doc(outline)
    print(full_doc)

    # 保存结果
    saved_file = await g.save_full_doc(full_doc)
    evaluation_results = await g.evaluate_full_doc(outline, full_doc)
    eval_file, doc_file = await g.save_evaluation_results(evaluation_results, outline, full_doc)
    
    print(f"Document saved to: {saved_file}")
    print(f"Evaluation results saved to: {eval_file}")
    print(f"Document saved to: {doc_file}")

if __name__ == "__main__":
    asyncio.run(main())
