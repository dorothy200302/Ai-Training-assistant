from pathlib import Path
from llama_index.readers.file import PyMuPDFReader
import os
import openai

# openai.api_key = os.environ["OPENAI_API_KEY"]

loader = PyMuPDFReader()
docs0 = loader.load(file_path=Path(r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf"))

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

llm = OpenAI(model="gpt-3.5-turbo",api_key='as-D73mmid1JVABYjxT4_ncuw', base_url='https://gateway.agione.ai/openai/api/v2',temperature=0)
from llama_index.core import VectorStoreIndex

base_index = VectorStoreIndex(
    leaf_nodes,
    storage_context=storage_context,
)
from llama_index.core.retrievers import AutoMergingRetriever

base_retriever = base_index.as_retriever(similarity_top_k=6)
retriever = AutoMergingRetriever(base_retriever, storage_context, verbose=True)
query_str = (
    "阿里员工培训手册大纲?"
)

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
