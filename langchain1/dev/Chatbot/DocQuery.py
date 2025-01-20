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
import httpx
from .test_embeddings import SiliconFlowEmbeddings
from typing import List
import logging

logger = logging.getLogger(__name__)

class DocumentChat:
    def __init__(self, model_name):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            openai_api_key="sk-3767598f60e9415e852ff4c43ccc0852",
            openai_api_base="https://api.deepseek.com/v1",
            temperature=0.7,
            max_tokens=2000
        )
        
        self.embeddings = SiliconFlowEmbeddings(
            api_key="sk-jfiddowyvulysbcxctumczcxqwiwtrfuldjgfvpwujtvncbg"
        )
        
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            output_key="answer",
            return_messages=True
        )
        self.vector_store = None
        self.text_splitter = CharacterTextSplitter(
            chunk_size=500,  # 减小块大小
            chunk_overlap=50,  # 减小重叠
            length_function=len,
            is_separator_regex=False
        )

    async def load_document(self, file_paths: List[str]) -> None:
        """加载文档并创建向量存储"""
        try:
            texts = []
            metadatas = []
            
            for file_path in file_paths:
                # 检查文件是否存在
                if not os.path.exists(file_path):
                    continue
                    
                # 根据文件类型选择加载器
                file_ext = os.path.splitext(file_path)[1].lower()
                try:
                    if file_ext == '.pdf':
                        loader = PyPDFLoader(file_path)
                    elif file_ext in ['.docx', '.doc']:
                        loader = Docx2txtLoader(file_path)
                    elif file_ext == '.txt':
                        loader = TextLoader(file_path, encoding='utf-8')
                    else:
                        continue
                    
                    # 加载文档
                    docs = loader.load()
                    
                    # 分割文本
                    for doc in docs:
                        chunks = self.text_splitter.split_text(doc.page_content)
                        texts.extend(chunks)
                        metadatas.extend([{'source': file_path} for _ in chunks])
                        
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {str(e)}")
                    continue
            
            # 确保有文本要处理
            if not texts:
                raise ValueError("No valid text content found in documents")
                
            # 创建向量存储
            self.vector_store = FAISS.from_texts(
                texts=texts,
                embedding=self.embeddings,
                metadatas=metadatas
            )
            
        except Exception as e:
            error_msg = f"处理文档时出错: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)

    def chat(self, query):
        """与文档进行对话"""
        if not self.vector_store:
            return "请先加载文档！"
        
        # 创建对话链
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store.as_retriever(
                search_kwargs={"k": 3}  # 检索最相关的3个文档片段
            ),
            memory=self.memory,
            return_source_documents=True,
            verbose=True  # 添加详细输出以便调试
        )
        
        # 使用 invoke 替代直接调用
        result = qa_chain.invoke({"question": query})
        
        # 打印源文档以便调试
        print("\n相关文档片段:")
        for doc in result['source_documents']:
            print(f"- {doc.page_content[:200]}...")
        
        return result['answer']

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
