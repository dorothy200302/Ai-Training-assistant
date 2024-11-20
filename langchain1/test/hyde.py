from llama_index.core import VectorStoreIndex, SimpleDirectoryReader
from llama_index.core.indices.query.query_transform.base import (
    HyDEQueryTransform,
)
from langchain.embeddings.openai import OpenAIEmbeddings

from llama_index.core.query_engine import TransformQueryEngine

# load documents, build index
documents = SimpleDirectoryReader(r"C:\Users\dorot\PycharmProjects\langchain1\training_docs").load_data()
index = VectorStoreIndex(documents)
embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-small",  # 使用适当的模型
        openai_api_base='https://gateway.agione.ai/openai/api/v2',
        openai_api_key="as-D73mmid1JVABYjxT4_ncuw",
        timeout=60,
        max_retries=3
    )

# run query with HyDE query transform
query_str =  """基于以下培训需求和相关文档，生成一个详细的培训大纲：
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
- 包含具体的学习目标"""
hyde = HyDEQueryTransform(include_original=True)
query_engine = index.as_query_engine()
query_engine = TransformQueryEngine(query_engine, query_transform=hyde)
response = query_engine.query(query_str)
print(response)