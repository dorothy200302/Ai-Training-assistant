from langchain.document_loaders import PyPDFLoader, TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS
from langchain.chat_models import ChatOpenAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationalRetrievalChain
import os

class DocumentChat:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key="as-D73mmid1JVABYjxT4_ncuw",
            api_base="https://gateway.agione.ai/openai/api/v2"
        )
        self.llm = ChatOpenAI(
            model_name="gpt-4o-mini",
            api_key="as-D73mmid1JVABYjxT4_ncuw",
            api_base="https://gateway.agione.ai/openai/api/v2",
            temperature=0.7
        )
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )
        self.vector_store = None

    def load_document(self, file_path):
        """加载并处理文档"""
        # 根据文件类型选择加载器
        if file_path.endswith('.pdf'):
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path)
        
        # 加载文档
        documents = loader.load()
        
        # 分割文档
        text_splitter = CharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        texts = text_splitter.split_documents(documents)
        
        # 创建向量存储
        self.vector_store = FAISS.from_documents(texts, self.embeddings)
        
        return f"文档 {file_path} 已成功加载"

    def chat(self, query):
        """与文档进行对话"""
        if not self.vector_store:
            return "请先加载文档！"
        
        # 创建对话链
        qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store.as_retriever(),
            memory=self.memory,
            return_source_documents=True
        )
        
        # 获取回答
        result = qa_chain({"question": query})
        
        return result['answer']
    
    

# 使用示例
def main():
    # 初始化聊天系统
    chat_system = DocumentChat()
    
    # 加载文档
    print(chat_system.load_document(r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf"))
    
   
            
    response = chat_system.chat("阿里巴巴的工作要求是什么")
    print("\nAI回答:", response)

if __name__ == "__main__":
    main()
