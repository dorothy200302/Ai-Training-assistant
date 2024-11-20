import os

import numpy as np
import openai
from dotenv import load_dotenv,find_dotenv
from langsmith.schemas import Feedback
from llama_index.core import Document, SimpleDirectoryReader
from llama_index.core.ingestion import transformations
from llama_index.core.postprocessor import MetadataReplacementPostProcessor, SentenceTransformerRerank
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.retrievers import AutoMergingRetriever
from llama_index.legacy.llms import OpenAI
from trulens.feedback.v2.feedback import Groundedness
from llama_index.core import Settings
from llama_index.core import VectorStoreIndex
from llama_index.core.node_parser import HierarchicalNodeParser, get_leaf_nodes
from trulens_eval import Feedback, TruLlama
from trulens_eval.feedback.provider.openai import OpenAI as OpenAIProvider
from trulens_eval.feedback.provider import OpenAI

_=load_dotenv(find_dotenv())
openai.api_key ="as-D73mmid1JVABYjxT4_ncuw " # 替换为你的 API 密钥
openai.base_url="https://gateway.agione.ai/openai/api/v2"
from llama_index.core.indices import load_index_from_storage
from llama_index.core.storage.storage_context import StorageContext
from llama_index.core.indices.vector_store.base import VectorStoreIndex
from llama_index.core.node_parser import HierarchicalNodeParser, get_leaf_nodes, SentenceWindowNodeParser

# from llama_index.query_engine import RetrievalQueryEngine
noder_parser = HierarchicalNodeParser.from_defaults(chunk_sizes=[2048,512,128])
documents=SimpleDirectoryReader(
    input_files=[r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf"]
).load_data()
document=Document(text="\n\n".join([doc.text for doc in documents]))
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.node_parser import SentenceSplitter
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings

Settings.llm = OpenAI(model="gpt-3.5-turbo",api_key='as-D73mmid1JVABYjxT4_ncuw', base_url='https://gateway.agione.ai/openai/api/v2',temperature=0)
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-small",api_key='as-D73mmid1JVABYjxT4_ncuw',
             base_url='https://gateway.agione.ai/openai/api/v2')
Settings.node_parser = SentenceSplitter(chunk_size=512, chunk_overlap=20)
Settings.num_output = 512
Settings.context_window = 3900
# from trulens_eval.feedback import Groundedness
def get_prebuilt_trulens_recorder(query_engine, app_id):
    # 创建OpenAI Provider
    openai_provider = OpenAIProvider(
        model_name="gpt-3.5-turbo",
        api_key='as-D73mmid1JVABYjxT4_ncuw',
        base_url='https://gateway.agione.ai/openai/api/v2'
    )
    
    # 定义反馈函数
    qa_relevance = (
        Feedback(openai_provider.relevance_with_cot_reasons, name="Answer Relevance")
        .on_input_output()
    )

    qs_relevance = (
        Feedback(openai_provider.relevance_with_cot_reasons, name="Context Relevance")
        .on_input()
        .on(TruLlama.select_source_nodes().node.text)
        .aggregate(np.mean)
    )

    # 使用 OpenAI provider 的 groundedness
    groundedness = (
        Feedback(openai_provider.groundedness_measure_with_cot_reasons, name="Groundedness")
        .on(TruLlama.select_source_nodes().node.text)
        .on_output()
    )

    # 组合所有反馈
    feedbacks = [qa_relevance, qs_relevance, groundedness]
    
    # 创建记录器
    tru_recorder = TruLlama(
        query_engine,
        app_id=app_id,
        feedbacks=feedbacks
    )
    
    return tru_recorder
#
# from llama_index import ServiceContext, VectorStoreIndex, StorageContext
# from llama_index.node_parser import SentenceWindowNodeParser
# from llama_index.indices.postprocessor import MetadataReplacementPostProcessor
# from llama_index.indices.postprocessor import SentenceTransformerRerank
# from llama_index import load_index_from_storage
import os


def build_sentence_window_index(
    documents,
    llm,
    embed_model="text-embedding-3-small",
    sentence_window_size=3,
    save_dir="sentence_index",
):
    # create the sentence window node parser w/ default settings
    node_parser = SentenceWindowNodeParser.from_defaults(
        window_size=sentence_window_size,
        window_metadata_key="window",
        original_text_metadata_key="original_text",
    )
    sentence_context = ServiceContext.from_defaults(
        llm=llm,
        embed_model=embed_model,
        node_parser=node_parser,
    )
    if not os.path.exists(save_dir):
        sentence_index = VectorStoreIndex.from_documents(
            documents, service_context=sentence_context
        )
        sentence_index.storage_context.persist(persist_dir=save_dir)
    else:
        sentence_index = load_index_from_storage(
            StorageContext.from_defaults(persist_dir=save_dir),
            service_context=sentence_context,
        )

    return sentence_index


def get_sentence_window_query_engine(
    sentence_index,
    similarity_top_k=6,
    rerank_top_n=2,
):
    # define postprocessors
    postproc = MetadataReplacementPostProcessor(target_metadata_key="window")
    rerank = SentenceTransformerRerank(
        top_n=rerank_top_n, model="BAAI/bge-reranker-base"
    )

    sentence_window_engine = sentence_index.as_query_engine(
        similarity_top_k=similarity_top_k, node_postprocessors=[postproc, rerank]
    )
    return sentence_window_engine

#
# from llama_index.node_parser import HierarchicalNodeParser
#
# from llama_index.node_parser import get_leaf_nodes
# from llama_index import StorageContext
# from llama_index.retrievers import AutoMergingRetriever
# from llama_index.indices.postprocessor import SentenceTransformerRerank
# from llama_index.query_engine import RetrieverQueryEngine


def build_automerging_index(
    documents,
    llm,
    embed_model,
    save_dir="merging_index",
    chunk_sizes=None,
):
    """
    构建自动合并索引
    :param documents: 要索引的文档
    :param llm: 语言模型
    :param embed_model: 嵌入模型
    :param save_dir: 索引保存目录
    :param chunk_sizes: 分块大小列表
    :return: 构建好的索引
    """
    chunk_sizes = chunk_sizes or [2048, 512, 128]
    
    # 更新全局设置
    Settings.llm = llm
    Settings.embed_model = embed_model
    
    # 创建节点解析器和获取节点
    node_parser = HierarchicalNodeParser.from_defaults(chunk_sizes=chunk_sizes)
    nodes = node_parser.get_nodes_from_documents(documents)
    leaf_nodes = get_leaf_nodes(nodes)
    
    # 直接创建索引
    index = VectorStoreIndex(nodes)

    return index



nodes=noder_parser.get_nodes_from_documents([document])


from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.query_engine import RetrieverQueryEngine

def get_automerging_query_engine(
        automerging_index,
        similarity_top_k=10,
        rerank_top_k=10,
) :
    base_retriever = automerging_index.as_retriever(
        similarity_top_k=similarity_top_k)
    
    retriever = AutoMergingRetriever(
            base_retriever,
            automerging_index.storage_context,
            verbose=True
    )
    
    # 修改这里：使用 top_n 替代 top_k
    rerank = SentenceTransformerRerank(
        top_n=rerank_top_k,  # 改为 top_n
        model="BAAI/bge-reranker-base"  # 添加模型参数
    )
    
    auto_merging_query_engine = RetrieverQueryEngine.from_args(
        retriever,
        node_postprocessors=[rerank]
    )
    
    return auto_merging_query_engine

index_0=build_automerging_index(
    documents,
    llm=OpenAI(model="gpt-3.5-turbo",api_key='as-D73mmid1JVABYjxT4_ncuw', base_url='https://gateway.agione.ai/openai/api/v2',temperature=0),
    embed_model=OpenAIEmbedding(model="text-embedding-3-small" ,api_key='as-D73mmid1JVABYjxT4_ncuw',
             base_url='https://gateway.agione.ai/openai/api/v2'),
    # chunk_size=[2048,512]
)
query_engine=get_automerging_query_engine(
    index_0,
    similarity_top_k=10,
    rerank_top_k=5
)
#评估
recorder=get_prebuilt_trulens_recorder(index_0,app_id="0")
eval_questions=[]
with open("eval_questions.txt","r",encoding="utf-8") as f:
    for line in f:
        eval_questions.append(line.strip())

def run_evals(eval_questions,tru_recorder,query_engine):
    for question in eval_questions:
        with tru_recorder as recording:
            response=query_engine.query(question)

from trulens_eval import Tru, __all__

Tru.get_leaderboard(app_id=[])
Tru().run_dashboard()











