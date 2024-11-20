import sys
import os

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_openai import OpenAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain.chains import RetrievalQA, LLMChain
from langchain.vectorstores import FAISS
from langchain_community.document_loaders import Docx2txtLoader
from langchain.document_loaders import PyPDFLoader, UnstructuredHTMLLoader, TextLoader
from sentence_transformers import SentenceTransformer
import pdfplumber
from langchain.schema import Document
import traceback
import datetime
from langchain.document_loaders import BSHTMLLoader
from dev.prompts.outlinePrompt import OUTLINE_PROMPT
from langchain_community.retrievers import WikipediaRetriever



class TrainingDocGenerator:
     def generate_prompt(self):
        try:
            # 确保 background_informations 是字典类型
            if not isinstance(self.background_informations, dict):
                raise ValueError("background_informations must be a dictionary")

            prompt = (
                f"你是一个在{self.background_informations.get('industry_info', '')}行业经验丰富,信息完备的培训专家，"
                f"特长：制定全面，专业，贴合度高的培训文档。\n"
                f"现请针对{self.background_informations.get('audience_info', '')}的职工培训文档，\n"
                f"背景信息为：公司名称：{self.background_informations.get('company_name', '')}\n"
                f"公司文化和价值观：{self.background_informations.get('company_culture', '')}\n"
                f"行业位置：{self.background_informations.get('company_industry', '')}\n"
                f"竞争优势：{self.background_informations.get('company_competition', '')}\n"
                f"用户角色：{self.background_informations.get('user_role', '')}\n"
                f"行业背景：{self.background_informations.get('industry_info', '')}\n"
                f"职位名称：{self.background_informations.get('project_title', '')}\n"
                f"职位职责：{self.background_informations.get('project_dutys', '')}\n"
                f"培训主要目标：{self.background_informations.get('project_goals', '')}\n"
                f"需要覆盖的主题：{self.background_informations.get('project_theme', '')}\n"
                f"主要目的：{self.background_informations.get('project_aim', '')}\n"
                f"内容需求：{self.background_informations.get('content_needs', '')}\n"
                f"格式与风格：{self.background_informations.get('format_style', '')}"
            )
            return prompt
        except Exception as e:
            print(f"生成提示时出错: {str(e)}")
            print(f"background_informations: {self.background_informations}")
            raise





     def merge_documents(self, file_paths):
        """合并多个文档"""
        all_documents = []
        print(f"开始处理文件列表: {file_paths}")
        
        for file_path in file_paths:
            try:
                print(f"正在处理文件: {file_path}")
                if file_path.endswith('.pdf'):
                    loader = PyPDFLoader(file_path)
                    documents = loader.load()
                    all_documents.extend(documents)
                elif file_path.endswith('.docx'):
                    loader = Docx2txtLoader(file_path)
                    documents = loader.load()
                    all_documents.extend(documents)
                elif file_path.endswith('.html'):
                    loader = BSHTMLLoader(file_path)
                    documents = loader.load()
                    all_documents.extend(documents)
                else:
                    print(f"不支持的文件类型: {file_path}")
                    
            except Exception as e:
                print(f"处理文件 {file_path} 时出错: {str(e)}")
                traceback.print_exc()
                continue
        
        print(f"成功处理的文档数量: {len(all_documents)}")
        return all_documents
     def __init__(self, file_paths, model_name, background_informations):
        print(f"初始化 TrainingDocGenerator，文件路径: {file_paths}")
        self.model_name = model_name
        self.background_informations = background_informations
        # 确保 file_paths 是列表
        if isinstance(file_paths, str):
            file_paths = [file_paths]
        documents = self.merge_documents(file_paths)
        # 这里是LLM的选择和配置
        self.llm = ChatOpenAI(
            model_name='gpt-4o-mini',
            temperature=0.7,
            base_url='https://gateway.agione.ai/openai/api/v2',
            api_key='as-D73mmid1JVABYjxT4_ncuw',
            request_timeout=120
        )
        
        
        # 初始化 embeddings 模型
        self.embeddings_model = SentenceTransformer("aspire/acge_text_embedding")
        
       
        
        self.embeddings = OpenAIEmbeddings(base_url='https://gateway.agione.ai/openai/api/v2',
                                            api_key='as-D73mmid1JVABYjxT4_ncuw',
                                            model="text-embedding-3-small")
        
        # 文本分割器
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        # 创建一个WikipediaRetriever实例
        self.retriever = WikipediaRetriever(top_k_results=6, doc_content_chars_max=2000)

        # 将文档分割并存储到向量数据库
        split_docs = self.text_splitter.split_documents(documents)
        self.vector_store = FAISS.from_documents(split_docs, self.embeddings)

        

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
            print(f"解析到的章节: {sections}")
            
            # 为每个章节生成内容
            full_doc = []
            full_doc.append(outline)  # 添加大纲
            
            for section in sections:
                content =  self.generate_section_content(section)
                full_doc.append(content)
            
            return "\n\n".join(full_doc)
            
        except Exception as e:
            print(f"Error generating full training doc: {str(e)}")
            raise

     def review_content(self, content):
        """使用模型审查内容质量"""
        review_prompt = PromptTemplate(
            template="""
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

# background_informations={
#     "company_name":"123",
#     "company_culture":"客户第一，团队合作，拥抱变化，诚信，激情，敬业",
#     "company_industry":"互联网",
#     "company_competition":"行业领先",
#     "user_role":"市场营销经理",
#     "industry_info":"互联网",
#     "project_title":"市场营销经理",
#     "project_dutys":"负责公司市场营销策略的制定和执行",
#     "project_goals":"了解公司市场营销策略的制定和执行",
#     "project_theme":"了解公司市场营销策略的制定和执行",
#     "project_aim":"了解公司市场营销策略的制定和执行",
#     "content_needs":"市场营销策略的制定和执行",
#     "format_style":" ",
#     "audience_info":
#         "主要受:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强"
    

# }

# g=TrainingDocGenerator(file_paths=[
#     r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
#     r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
#     r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
#     r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
#     r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach CI_CD · Resend.html",

# ], model_name="chatgpt-4o-mini",background_informations=background_informations)
# outline=g.generate_training_outline()
# full_doc=g.generate_full_training_doc(outline)
# print(full_doc)

# import time
# import datetime



# saved_file = g.save_full_doc(full_doc)
# print(f"Document saved to: {saved_file}")






