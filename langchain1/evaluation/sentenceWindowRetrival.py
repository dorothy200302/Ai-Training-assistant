# from llama_index.node_parser import SentenceWindowNodeParser
import os
import openai
from dotenv import load_dotenv,find_dotenv
from llama_index.core import SimpleDirectoryReader, ServiceContext, VectorStoreIndex, load_index_from_storage, \
    StorageContext
from llama_index.core.node_parser import SentenceWindowNodeParser
from llama_index.legacy import Document
from llama_index.legacy.llms import OpenAI
from torch.distributed.pipelining import pipeline

from utils.utils import get_sentence_window_query_engine, get_prebuilt_trulens_recorder

_=load_dotenv(find_dotenv())
openai.api_key = os.environ["OPENAI_API_KEY"]  # 替换为你的 API 密钥
# from llama_index import SimpleDirectoryReader
# Use a pipeline as a high-level helper

pipe = pipeline("feature-extraction", model="BAAI/bge-small-en-v1.5")
documents=SimpleDirectoryReader(
    input_files=[""]
).load_data()
print(documents[0])
document=Document(text="\n\n".join([doc.text for doc in documents]))
node_parser = SentenceWindowNodeParser.from_defaults(
    window_size=3,
    window_metadata_key="window",
    original_text_metadata_key="original_text"
)

text = "This is a test sentence. It contains some words."
node = node_parser.get_nodes_from_documents([Document(text=text)])
print(node[1] .metadata["window"])
llm=OpenAI(model="gpt-3.5-turbo",temperature=0.1)
sentence_context=ServiceContext.from_defaults(
    llm=llm,
    embed_model="",
    node_parser=node_parser
)
if not os.path.exists("index.bin"):
    sentence_index=VectorStoreIndex.from_documents(
      [document],service_context=sentence_context
    )
    sentence_index.storage_context.persist(persist_dir="")
else:
    sentence_index=load_index_from_storage(
      StorageContext.from_defaults(persist_dir=""),
     service_context=sentence_context
    )
def build_sentence_window_index(documents, llm,embed_model,
                                sentence_window_size=3
                                ,persist_dir="/"):
    node_parser=SentenceWindowNodeParser.from_defaults(
        window_size=sentence_window_size,
        window_metadata_key="window",
        original_text_metadata_key="original_text"
    )
    sentence_context=ServiceContext.from_defaults(
        llm=llm,
        embed_model=embed_model,
        node_parser=node_parser
    )
    if not os.path.exists(os.path.join(persist_dir,"index.bin")):
        sentence_index=VectorStoreIndex.from_documents(
            documents,service_context=sentence_context
        )
        sentence_index.storage_context.persist(persist_dir=persist_dir)
    else:
        sentence_index=load_index_from_storage(
            StorageContext.from_defaults(persist_dir=persist_dir),
            service_context=sentence_context
        )
    return sentence_index
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-reranker-base")
# def get_sentence_window_query_engine(sentence_index,similarity_top_k=10,rerank_top_k=5):
#     postproc=MetadataReplacementPostprocessor(
#         target_metadata_key="window")
#     rerank=SentenceTransformerReranke(
#         top_n=rerank_top_k,
#         model=model)
#     sentence_window_engine=sentence_index.as_query_engine(
#         similarity_top_k=similarity_top_k,
#         node_postprocessor=[postproc,rerank])
#     return sentence_window_engine

#调用
# index=build_sentence_window_index(documents,llm,embed_model="",persist_dir="")
# query_engine=get_sentence_window_query_engine(index)

#测试
def run_evals(eval_queries,tru_recorder,query_engine):
    for query in eval_queries:
        with tru_recorder as recording:
            response=query_engine.query(query)
from trulens_eval import Tru
Tru().reset_Database()
sentence_index_1=build_sentence_window_index(documents,llm,
                                             sentence_window_size=1,
                                             embed_model="",persist_dir="")
sentence_window_engine_1=get_sentence_window_query_engine(sentence_index_1)
tru_recorder_1=get_prebuilt_trulens_recorder(sentence_window_engine_1)
eval_queries=[]
run_evals(eval_queries,tru_recorder_1,sentence_window_engine_1)
Tru().run_dashboard()















