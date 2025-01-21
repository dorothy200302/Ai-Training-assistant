from langchain.document_loaders import (
    PyPDFLoader, 
    TextLoader,
    Docx2txtLoader,
    UnstructuredPowerPointLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredFileLoader
)
from langchain.text_splitter import CharacterTextSplitter
from langchain.vectorstores import FAISS
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
import os
from .test_embeddings import SiliconFlowEmbeddings
from typing import List
import logging

logger = logging.getLogger(__name__)

class DocumentChat:
    def __init__(self, model_name="deepseek-chat"):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            openai_api_key="sk-3767598f60e9415e852ff4c43ccc0852",
            openai_api_base="https://api.deepseek.com/v1",
            temperature=0.7,
            max_tokens=2000
        )
        
        self.embeddings = SiliconFlowEmbeddings()
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            output_key="answer",
            return_messages=True
        )
        self.vector_store = None
        self.text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separator="\n"
        )

    async def load_document(self, file_paths: List[str]) -> str:
        """加载文档并创建向量存储"""
        try:
            if not file_paths:
                raise ValueError("No files provided")

            texts = []
            metadatas = []
            
            for file_path in file_paths:
                logger.info(f"开始处理文件: {file_path}")
                
                if not os.path.exists(file_path):
                    logger.error(f"文件不存在: {file_path}")
                    continue
                
                # 检查文件大小
                file_size = os.path.getsize(file_path)
                logger.info(f"文件大小: {file_size} bytes")
                
                # 检查文件是否可读
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read(1024)  # 读取前1KB检查文件是否可读
                        if not content:
                            logger.error(f"文件为空: {file_path}")
                            continue
                except Exception as e:
                    logger.error(f"文件读取失败 {file_path}: {str(e)}")
                    continue
                
                file_ext = os.path.splitext(file_path)[1].lower()
                logger.info(f"文件类型: {file_ext}")
                
                try:
                    # 根据文件类型选择加载器
                    if file_ext == '.pdf':
                        loader = PyPDFLoader(file_path)
                        logger.info("使用 PDF 加载器")
                    elif file_ext in ['.docx', '.doc']:
                        loader = Docx2txtLoader(file_path)
                        logger.info("使用 Word 加载器")
                    elif file_ext == '.txt':
                        loader = TextLoader(file_path, encoding='utf-8')
                        logger.info("使用文本加载器")
                    else:
                        logger.warning(f"不支持的文件类型: {file_ext}")
                        continue
                    
                    # 加载文档
                    logger.info("开始加载文档内容...")
                    docs = loader.load()
                    logger.info(f"成功加载文档，页数: {len(docs)}")
                    
                    # 处理每个文档
                    for i, doc in enumerate(docs):
                        if not doc.page_content:
                            logger.warning(f"第 {i+1} 页内容为空")
                            continue
                            
                        content_length = len(doc.page_content.strip())
                        logger.info(f"第 {i+1} 页内容长度: {content_length}")
                        
                        if content_length < 10:
                            logger.warning(f"第 {i+1} 页内容过短，跳过")
                            continue
                            
                        # 分割文本
                        logger.info(f"开始分割第 {i+1} 页文本...")
                        chunks = self.text_splitter.split_text(doc.page_content)
                        logger.info(f"生成 {len(chunks)} 个文本块")
                        
                        texts.extend(chunks)
                        metadatas.extend([{'source': file_path, 'page': i+1}] * len(chunks))
                    
                except Exception as e:
                    logger.error(f"处理文件失败 {file_path}: {str(e)}")
                    continue

            if not texts:
                raise ValueError("未能从文档中提取有效文本内容")

            logger.info(f"总共生成 {len(texts)} 个文本块")
            
            # 创建向量存储
            logger.info("开始创建向量存储...")
            self.vector_store = FAISS.from_texts(
                texts=texts,
                embedding=self.embeddings,
                metadatas=metadatas
            )
            logger.info("向量存储创建成功")
            
            return f"成功加载 {len(texts)} 个文本块，来自 {len(file_paths)} 个文档"
            
        except Exception as e:
            error_msg = f"处理文档时出错: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def chat(self, query: str) -> str:
        """处理用户查询"""
        if not self.vector_store:
            return "请先加载文档！"
            
        try:
            qa_chain = ConversationalRetrievalChain.from_llm(
                llm=self.llm,
                retriever=self.vector_store.as_retriever(
                    search_kwargs={"k": 3}
                ),
                memory=self.memory,
                return_source_documents=True,
                verbose=True
            )
            
            result = qa_chain.invoke({"question": query})
            return result['answer']
            
        except Exception as e:
            error_msg = f"处理查询时出错: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

# # 使用示例
# def main():
#     # 初始化聊天系统
#     chat_system = DocumentChat(api_key="as-D73mmid1JVABYjxT4_ncuw")
    
#     # 修复文件路径 - 使用原始字符串和正确的完整路径
#     file_paths = [r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里新人入职培训内容和流程-三茅人力资源网.pdf",
# r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴集团介绍-阿里巴巴集团.html",

#                   r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴张丽俊组织发展课程笔记分享 - 知乎.pdf"]
#     print(chat_system.load_document(file_paths))  # 注意：需要传入列表
    
   
#     # 第二步：基于大纲生成详细计划
#     detailed_plan = chat_system.chat("""阿里的企业文化是？
#     """)
    
#     print("\n详细培训计划：", detailed_plan)

# if __name__ == "__main__":
#     main()

# # 创建实例