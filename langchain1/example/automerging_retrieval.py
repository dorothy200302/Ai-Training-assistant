import os
from llama_index import VectorStoreIndex, SimpleDirectoryReader
from llama_index.retrievers import AutoMergingRetriever
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.embeddings import OpenAIEmbeddings
from llama_index.settings import Settings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set OpenAI API key
# os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

def create_query_engine(docs_dir: str) -> RetrieverQueryEngine:
    """创建文档查询引擎"""
    # 1. 加载文档
    print(f"正在从 {docs_dir} 加载文档...")
    documents = SimpleDirectoryReader(docs_dir).load_data()

    # 2. 创建索引
    print("创建文档索引...")
    index = VectorStoreIndex(documents)

    # 3. 创建检索器
    base_retriever = index.as_retriever(similarity_top_k=5)
    retriever = AutoMergingRetriever(base_retriever, index.storage_context)

    # 4. 创建查询引擎
    query_engine = RetrieverQueryEngine.from_args(retriever)
    
    print("查询引擎创建成功！")
    return query_engine

def main():
    # 设置文档目录
    docs_dir = r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf"  # 替换为您的文档目录

    # 创建查询引擎
    query_engine = create_query_engine(docs_dir)
    query = "基于以下培训需求和相关文档，生成一个详细的培训大纲："
    response = query_engine.query(query)
    print(response)
    