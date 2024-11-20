import numpy as np
from llama_index.core import SimpleDirectoryReader, Document, ServiceContext, StorageContext, VectorStoreIndex
from llama_index.core.node_parser import HierarchicalNodeParser, get_leaf_nodes
from llama_index.core.postprocessor import SentenceTransformerRerank
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import AutoMergingRetriever
from llama_index.legacy.llms import openai
from openai import OpenAI
import PyPDF2
import PyPDF2
from trulens.core import Feedback
from trulens.feedback.v2.feedback import Groundedness


client = OpenAI(
  base_url = "https://gateway.agione.ai/openai/api/v2",
  api_key = "as-D73mmid1JVABYjxT4_ncuw"
)
# from llama_index.query_engine import RetrievalQueryEngine
noder_parser = HierarchicalNodeParser.from_defaults(chunk_sizes=[2048,512,128])
documents=SimpleDirectoryReader(
    input_files=[r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we receive feedback · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
                 r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we write customer stories · Resend.pdf"]
).load_data()
document=Document(text="\n\n".join([doc.text for doc in documents]))
# from llama_index.node_parser import HierarchicalNodeParser
# from llama_index.node_parser import get_leaf_nodes
nodes = noder_parser.get_nodes_from_documents([document])
leaf_nodes = get_leaf_nodes(nodes)
print(leaf_nodes[2].text)
nodes_by_id = {node.node_id: node for node in nodes}

parent_node = nodes_by_id[leaf_nodes[2].parent_node.node_id]
llm = OpenAI()
print("parent_node.text:",parent_node.text)
#
# auto_merging_context = ServiceContext.from_defaults(
#     llm=llm,
#     embed_model="local:BAAI/bge-small-en-v1.5",
#     node_parser=noder_parser,
# )
# from llama_index import VectorStoreIndex, StorageContext
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

Settings.llm = OpenAI(model="gpt-4")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small")
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=20)
Settings.num_output = 512
Settings.context_window = 3900
transformations = Settings.transformations
embed_model = Settings.embed_model
storage_context = StorageContext.from_defaults()
storage_context.docstore.add_documents(nodes)
index = VectorStoreIndex.from_documents(
    documents, embed_model=embed_model, transformations=transformations
)
# a document summary index needs both an llm and embed model
# for the constructor

# ... until you create a query engine
query_engine = index.as_query_engine(llm=llm)
# automerging_index = VectorStoreIndex(
#     leaf_nodes, storage_context=storage_context, service_context=auto_merging_context
# )
# from utils.utils import *
# auto_merging_engine=get_automerging_query_engine(automerging_index)
outline = query_engine.query("根据现有的网络资料补充并生成一份培训文档大纲...")

# outline = query_engine.query("根据现有的网络资料补充并生成一份培训文档大纲，内容对象为受训人员所以需要有详细的岗位知识和工作流程，"
#                           "需内容翔实有针对性直接面向新员工，并能有效提升员工的职业发展能力。")
print(outline)


completion = client.chat.completions.create(
  model="gpt-4",
    messages=[{"role": "user",
               "content": "根据现有的网络资料补充并生成一份培训文档大纲，内容对象为受训人员所以需要有详细的岗位知识和工作流程，"
                          "需内容翔实有针对性直接面向新员工，并能有效提升员工的职业发展能力。"}],
    temperature=0.2,
  top_p=0.7,
  max_tokens=100024,
  stream=True
)
outline=""
for chunk in completion:
  if chunk.choices[0].delta.content is not None:
      outline+=chunk.choices[0].delta.content
      print(chunk.choices[0].delta.content, end="")

# print("outline:",outline)
# completion = client.chat.completions.create(
#   model="gpt-4",
#     messages=[{"role": "user",
#                "content": f"以下是生成的培训文档大纲：\n{outline}\n\n请根据以上大纲生成详细的培训文档内容，大于3000字，确保内容翔实，针对新员工，提升其职业发展能力。"}],
#
#     temperature=0.2,
#   top_p=0.7,
#   max_tokens=100024,
#   stream=True
# )
# for chunk in completion:
#   if chunk.choices[0].delta.content is not None:
#       outline=chunk.choices[0].delta.content
#       print(chunk.choices[0].delta.content, end="")
#
#
#
#
#
#
#
#
#
#
#
