import os
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader

documents = SimpleDirectoryReader(r"C:\Users\dorot\PycharmProjects\langchain1\training_docs" ).load_data()
index = VectorStoreIndex.from_documents(documents)
query_engine = index.as_query_engine()
response = query_engine.query("""基于以下培训需求和相关文档，生成一个详细的培训大纲：
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
- 包含具体的学习目标""")
print(response)