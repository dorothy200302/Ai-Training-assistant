from typing import Dict, List
from datetime import datetime
import json
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Settings
from llama_index.core.node_parser import HierarchicalNodeParser
from llama_index.core.retrievers import AutoMergingRetriever
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.postprocessor import SentenceTransformerRerank
import openai
from pathlib import Path
from llama_index.readers.file import PyMuPDFReader

loader = PyMuPDFReader()
docs0 = loader.load(file_path=Path(r"C:\Users\dorot\PycharmProjects\langchain1\training_docs\What is our brand's voice and tone · Resend.pdf"))

from llama_index.core import Document

doc_text = "\n\n".join([d.get_content() for d in docs0])
docs = [Document(text=doc_text)]
from llama_index.core.node_parser import HierarchicalNodeParser, SentenceSplitter

node_parser = HierarchicalNodeParser.from_defaults()
nodes = node_parser.get_nodes_from_documents(docs)

from llama_index.core.node_parser import get_leaf_nodes, get_root_nodes

leaf_nodes = get_leaf_nodes(nodes)
root_nodes = get_root_nodes(nodes)
from llama_index.core.storage.docstore import SimpleDocumentStore
from llama_index.core import StorageContext
from llama_index.llms.openai import OpenAI

docstore = SimpleDocumentStore()
docstore.add_documents(nodes)

storage_context = StorageContext.from_defaults(docstore=docstore)

llm = OpenAI(model="gpt-4o-mini",
             api_key="as-D73mmid1JVABYjxT4_ncuw",
             api_base="https://gateway.agione.ai/openai/api/v2")
from llama_index.core import VectorStoreIndex

base_index = VectorStoreIndex(
    leaf_nodes,
    storage_context=storage_context,
)
from llama_index.core.retrievers import AutoMergingRetriever

base_retriever = base_index.as_retriever(similarity_top_k=6)
retriever = AutoMergingRetriever(base_retriever, storage_context, verbose=True)
query_str = """
基于以下培训需求和相关文档，生成一个详细的培训大纲：
请生成包含以下部分的大纲：
1. 培训概述
2. 学习目标
3. 主要章节（包含每章节的核心内容和时长）
4. 实践环节
5. 考核方式

要求：
- 结构清晰，层次分明
- 符合目标受众水平
- 每个章节标注预计时长
- 包含具体的学习目标
"""

nodes = retriever.retrieve(query_str)
base_nodes = base_retriever.retrieve(query_str)
from llama_index.core.response.notebook_utils import display_source_node

for node in nodes:
    display_source_node(node, source_length=10000)

for node in base_nodes:
    display_source_node(node, source_length=10000)
from llama_index.core.query_engine import RetrieverQueryEngine

query_engine = RetrieverQueryEngine.from_args(retriever)
base_query_engine = RetrieverQueryEngine.from_args(base_retriever)

response = query_engine.query(query_str)
base_response = base_query_engine.query(query_str)

print(str(response))
print(str(base_response))
