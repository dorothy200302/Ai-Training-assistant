import sys
import os
from dev.core.logger import setup_logger
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import FAISS
from langchain_community.document_loaders import Docx2txtLoader
from langchain_community.document_loaders import PyPDFLoader, UnstructuredHTMLLoader, TextLoader, BSHTMLLoader
from sentence_transformers import SentenceTransformer
import pdfplumber
from langchain.schema import Document
import traceback
import datetime
from dev.prompts.outlinePrompt import OUTLINE_PROMPT
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.document_loaders import (
    PyPDFLoader, 
    TextLoader,
    Docx2txtLoader,
    UnstructuredPowerPointLoader
)
import logging
from ..Chatbot.test_embeddings import SiliconFlowEmbeddings

# 设置日志记录器
logger = setup_logger("training_generator")

class TrainingDocGenerator:
    def __init__(self, file_paths, model_name, background_informations):
        # 配置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("training_generator")
        
        self.file_paths = file_paths
        self.background_informations = background_informations
        
        # 初始化嵌入模型
        self.embeddings = SiliconFlowEmbeddings(
            api_key="sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"
        )
        
        try:
            # 加载所有文档
            documents = []
            for file_path in file_paths:
                try:
                    self.logger.info(f"Processing file: {file_path}")
                    
                    # 检查文件是否存在且不为空
                    if not os.path.exists(file_path):
                        self.logger.error(f"File not found: {file_path}")
                        continue
                        
                    if os.path.getsize(file_path) == 0:
                        self.logger.error(f"File is empty: {file_path}")
                        continue
                    
                    # 根据文件类型选择加载器
                    if file_path.endswith('.pdf'):
                        loader = PyPDFLoader(file_path)
                    elif file_path.endswith('.docx'):
                        # 使用更可靠的 docx 加载器
                        from langchain_community.document_loaders import UnstructuredWordDocumentLoader
                        loader = UnstructuredWordDocumentLoader(file_path, mode="elements")
                    elif file_path.endswith('.txt'):
                        loader = TextLoader(file_path, encoding='utf-8')
                    else:
                        self.logger.warning(f"Unsupported file type: {file_path}")
                        continue
                    
                    # 加载文档
                    docs = loader.load()
                    self.logger.info(f"Loaded {len(docs)} documents from {file_path}")
                    
                    # 检查和清理文档内容
                    for doc in docs:
                        content = doc.page_content.strip() if doc.page_content else ""
                        if content:  # 只添加非空文档
                            doc.page_content = content  # 更新清理后的内容
                            documents.append(doc)
                            self.logger.info(f"Added document with {len(content)} characters")
                        else:
                            self.logger.warning(f"Skipped empty document from {file_path}")
                
                except Exception as e:
                    self.logger.error(f"Error loading file {file_path}: {str(e)}")
                    continue
            
            if not documents:
                raise ValueError("No valid documents were loaded. Please check if the files contain readable content.")
            
            # 分割文档
            text_splitter = CharacterTextSplitter(
                chunk_size=500,
                chunk_overlap=50,
                length_function=len,
                separator="\n"
            )
            
            # 分割每个文档并检查结果
            split_docs = []
            for doc in documents:
                try:
                    # 先分割文本
                    splits = text_splitter.split_text(doc.page_content)
                    self.logger.info(f"Split document into {len(splits)} chunks")
                    
                    # 为每个分割创建新的 Document 对象
                    for split in splits:
                        if split and len(split.strip()) > 0:
                            split_docs.append(Document(
                                page_content=split,
                                metadata=doc.metadata
                            ))
                            self.logger.info(f"Added chunk with {len(split)} characters")
                
                except Exception as e:
                    self.logger.error(f"Error splitting document: {str(e)}")
                    continue
            
            if not split_docs:
                raise ValueError("No valid document chunks were created after splitting. Please check the document content.")
            
            self.logger.info(f"Created {len(split_docs)} total chunks")
            
            # 创建向量存储
            try:
                self.vector_store = FAISS.from_documents(split_docs, self.embeddings)
                self.logger.info("Successfully created vector store")
            except Exception as e:
                self.logger.error(f"Error creating vector store: {str(e)}")
                raise
                
        except Exception as e:
            self.logger.error(f"Error during initialization: {str(e)}")
            self.logger.error("Traceback:", exc_info=True)
            raise

    def generate_prompt(self):
        """生成提示词"""
        prompt = f"""
        背景信息：
        - 目标受众：{self.background_informations.get('audience_info', '')}
        - 公司名称：{self.background_informations.get('company_name', '')}
        - 公司文化：{self.background_informations.get('company_culture', '')}
        - 行业：{self.background_informations.get('company_industry', '')}
        - 目标岗位：{self.background_informations.get('user_role', '')}
        - 培训目标：{self.background_informations.get('project_goals', '')}
        - 内容需求：{self.background_informations.get('content_needs', '')}
        """
        return prompt

    def generate_training_outline(self, requirements=None):
        """使用模型生成培训大纲"""
        prompt_of_informations = self.generate_prompt()
        
        # 1. 从本地文档获取内容并记录来源
        docs = self.vector_store.similarity_search("培训课程设计")
        references = []
        local_context = []
        
        for i, doc in enumerate(docs):
            source = doc.metadata.get('source', 'Local Document')
            content = doc.page_content
            reference_id = f"[{i+1}]"
            references.append(f"{reference_id} {source}")
            local_context.append(f"{content} {reference_id}")
        
        context = "\n\n".join(local_context)
        
        # 2. 使用修改后的提示模板
        outline_prompt = PromptTemplate(
            template=prompt_of_informations + OUTLINE_PROMPT + """
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
        
        outline = qa_chain.invoke({
            "query": f"{self.background_informations.get('project_title')}培训课程设计"
        })
        
        logger.info("Generated training outline")
        return outline

    def generate_section_content(self, section_title, section_type="theory"):
        """使用模型生成章节内容"""
        
        
        # 不同类型内容的提示模板
        template = ""
        if section_type == "theory":
            template = """
            为章节 "{section_title}" 生成理论教学内容：
            1. 概念解释要清晰准确
            2. 包含具体的示例
            3. 突出重点难点
            4. 添加相关知识链接
            
            相关文档内容：
            {context}
            """
        elif section_type == "practice":
            template = """
            为章节 "{section_title}" 生成实践内容：
            1. 设计具体的练习任务
            2. 提供详细的操作步骤
            3. 包含常见问题和解决方案
            4. 添加评估标准
            
            相关文档内容：
            {context}
            """
        else:  # case_study
            template = """
            为章节 "{section_title}" 生成案例分析：
            1. 选择相关的实际案例
            2. 分析案例的关键点
            3. 提供解决方案
            4. 总结经验教训
            
            相关文档内容：
            {context}
            """
        logger.info(f"Generating section content for {section_title}")
        print("template",template)
        # 获取相关文档
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # 创建提示模板
        prompt = PromptTemplate(
            template=template,
            input_variables=["section_title", "context"]
        )
        print("section_content_prompt",prompt)
        # 创建链
        chain = LLMChain(
            llm=self.llm,
            prompt=prompt
        )
        
        # 运行链
        return chain.run(
            section_title=section_title,
            context=context
        )

    def generate_quiz(self, section_title):
        """使用模型生成测试题"""
        quiz_prompt ="""你是一个培训专家，
            为章节 "{section_title}" 生成测试题：
            1. 包含多种题型（选择题、判断题、简答题）
            2. 覆盖主要知识点
            3. 难度适中
            4. 提供答案和解析
            
            {context}
            """
         # 获取相关文档
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        # 创建提示模板
        prompt = PromptTemplate(
            template=quiz_prompt,
            input_variables=["section_title", "context"]
        )
        print("quiz_prompt",quiz_prompt)

        # 创建链
        chain = LLMChain(
            llm=self.llm,
            prompt=prompt
        )
        
        # 运行链
        return chain.run(
            section_title=section_title,
            context=context
        )

    def generate_summary(self, section_title):
        """使用模型生成章节总结"""
        summary_prompt ="""
            为章节 "{section_title}" 生成总结：
            1. 概括主要内容
            2. 强调关键点
            3. 提供应用建议
            4. 指出进阶方向
            
            {context}
            """
         # 获取相关文档
        docs = self.vector_store.similarity_search(section_title)
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # 创建提示模板
        prompt = PromptTemplate(
            template=summary_prompt,
            input_variables=["section_title", "context"]
        )
        print("summary_prompt",summary_prompt)

        # 创建链
        chain = LLMChain(
            llm=self.llm,
            prompt=prompt
        )
        
        # 运行链
        return chain.run(
            section_title=section_title,
            context=context
        )

    def _parse_outline(self, outline):
        """解析大纲文本，提取章节标题"""
        sections = []
        lines = outline.split('\n')
        
        for line in lines:
            line = line.strip()
            # 匹配章节标题格式 (## 1. [章节名称] 或 ### 1.1 [子章节])
            if line.startswith('##') or line.startswith('###'):
                # 提取方括号中的章节名称
                if '[' in line and ']' in line:
                    section_title = line[line.find('[')+1:line.find(']')]
                    sections.append(section_title)
                # 提取冒号后的章节名称
                elif ':' in line:
                    section_title = line.split(':')[1].strip()
                    sections.append(section_title)
                # 直接提标题文本
                else:
                    section_title = ' '.join(line.split()[1:]).strip()
                    print("section_title11",section_title)
                    if section_title:
                        sections.append(section_title)
        
        return sections

    async def generate_full_training_doc(self, outline: str) -> str:
        """生成完整的培训文档"""
        try:
            # 解析大纲中的章节
            sections = self.parse_sections(outline)
            logger.info(f"Parsed sections: {sections}")
            
            # 为每个章节生成内容
            full_doc = []
            full_doc.append(outline)  # 添加大纲
            
            for section in sections:
                content =  self.generate_section_content(section)
                full_doc.append(content)
            
            return "\n\n".join(full_doc)
            
        except Exception as e:
            logger.error(f"Error generating full training doc: {str(e)}")
            logger.error(traceback.format_exc())
            raise

    def review_content(self, content):
        """使用模型审查内容质量"""
        review_prompt = PromptTemplate(
            template="""\
            请审查以下培训内容的质量，检查：
            1. 内容的准确性和完整性
            2. 结构的合理性
            3. 表达的清晰度
            4. 示例的适当性
            5. 实践内容的可操作性
            
            内容：
            {content}
            """,
            input_variables=["content"]
        )
        
        response = self.llm.predict(review_prompt.format(content=content))
        return response
     
    def generate_document(self,  requirements=None):
        """生成完整的培训文档并进行质量审查"""
       
    
        
        outline = self.generate_training_outline()
        
        # 生成完整文档内容
        full_doc = self.generate_full_training_doc(outline)
        
  
        review_result = self.review_content(full_doc)
        
        # 根据审查结果优化内容
        if "需要改进" in review_result:
            # 重新生成有问题的部分
            full_doc = self.generate_full_document()
            
        return full_doc

    def save_full_doc(self, full_doc):
        """保存生成的培训文档"""
        # 获取当前时间戳
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 构建文件名
        model_names = []
        if hasattr(self, 'llm'):
            if hasattr(self.llm, 'model_name'):
                model_names.append(self.llm.model_name)
    
        if hasattr(self.embeddings_model, 'model_name'):
            model_names.append(self.embeddings_model.model_name)
        else:
            # SentenceTransformer模型名称通常在__init__时指定
            model_names.append("aspire/acge_text_embedding")
    
        model_str = "_".join(model_names)
    
        # 创建输出目录
        output_dir = "generated_docs"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        model_name=self.llm.model_name
        # 构建完整的文件名
        filename = f"{output_dir}/training_doc_{timestamp}_{model_name}_{model_str}.txt"
    
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filename), exist_ok=True)
    
        # Then write the file
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(full_doc)
    
        return filename
