from llama_index.core import SummaryIndex, VectorStoreIndex
from llama_index.core.tools import QueryEngineTool
from dotenv import load_dotenv,find_dotenv
_=load_dotenv(find_dotenv())
import nest_asyncio
nest_asyncio.apply()
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Settings
import os
from transformers import AutoTokenizer, AutoModelForMaskedLM
hf_endpoint = os.getenv('HF_ENDPOINT')
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
    
)
from typing import Any

from llama_index.core.llms import (
    CustomLLM,
    CompletionResponse,
    CompletionResponseGen,
    LLMMetadata,
)
from llama_index.core.llms.callbacks import llm_completion_callback
from transformers import AutoTokenizer, AutoModelForCausalLM
from llama_index.core import Settings, VectorStoreIndex, SimpleDirectoryReader
from llama_index.embeddings.huggingface import HuggingFaceEmbedding


# class GLMCustomLLM(CustomLLM):
#     context_window: int = 8192  # 上下文窗口大小
#     num_output: int = 8000  # 输出的token数量
#     model_name: str = "glm-4-9b-chat"  # 模型名称
#     tokenizer: object = None  # 分词器
#     model: object = None  # 模型
#     dummy_response: str = "My response"
#
#     def __init__(self, pretrained_model_name_or_path):
#         super().__init__()
#
#         # GPU方式加载模型
#         self.tokenizer = AutoTokenizer.from_pretrained(pretrained_model_name_or_path, device_map="cuda",
#                                                        trust_remote_code=True)
#         self.model = AutoModelForCausalLM.from_pretrained(pretrained_model_name_or_path, device_map="cuda",
#                                                           trust_remote_code=True).eval()
#
#         # CPU方式加载模型
#         # self.tokenizer = AutoTokenizer.from_pretrained(pretrained_model_name_or_path, device_map="cpu", trust_remote_code=True)
#         # self.model = AutoModelForCausalLM.from_pretrained(pretrained_model_name_or_path, device_map="cpu", trust_remote_code=True)
#         self.model = self.model.float()
#
#     @property
#     def metadata(self) -> LLMMetadata:
#         """Get LLM metadata."""
#         # 得到LLM的元数据
#         return LLMMetadata(
#             context_window=self.context_window,
#             num_output=self.num_output,
#             model_name=self.model_name,
#         )
#
#     # @llm_completion_callback()
#     # def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
#     #     return CompletionResponse(text=self.dummy_response)
#     #
#     # @llm_completion_callback()
#     # def stream_complete(
#     #     self, prompt: str, **kwargs: Any
#     # ) -> CompletionResponseGen:
#     #     response = ""
#     #     for token in self.dummy_response:
#     #         response += token
#     #         yield CompletionResponse(text=response, delta=token)
#
#     @llm_completion_callback()  # 回调函数
#     def complete(self, prompt: str, **kwargs: Any) -> CompletionResponse:
#         # 完成函数
#         print("完成函数")
#
#         inputs = self.tokenizer.encode(prompt, return_tensors='pt').cuda()  # GPU方式
#         # inputs = self.tokenizer.encode(prompt, return_tensors='pt')  # CPU方式
#         outputs = self.model.generate(inputs, max_length=self.num_output)
#         response = self.tokenizer.decode(outputs[0])
#         return CompletionResponse(text=response)
#
#     @llm_completion_callback()
#     def stream_complete(
#             self, prompt: str, **kwargs: Any
#     ) -> CompletionResponseGen:
#         # 流式完成函数
#         print("流式完成函数")
#
#         inputs = self.tokenizer.encode(prompt, return_tensors='pt').cuda()  # GPU方式
#         # inputs = self.tokenizer.encode(prompt, return_tensors='pt')  # CPU方式
#         outputs = self.model.generate(inputs, max_length=self.num_output)
#         response = self.tokenizer.decode(outputs[0])
#         for token in response:
#             yield CompletionResponse(text=token, delta=token)
#
#
# if __name__ == "__main__":
#     # 定义你的LLM
#     pretrained_model_name_or_path = r'/home/nlp/model/LLM/THUDM/glm-4-9b-chat'
#     embed_model_path = '/home/nlp/model/Embedding/BAAI/bge-m3'
#
#     Settings.embed_model = HuggingFaceEmbedding(
#         model_name=f"{embed_model_path}", device='cuda'
#
#     )
# Load model directly
# Load model directly
from transformers import AutoTokenizer, AutoModelForCausalLM
tokenizer = AutoTokenizer.from_pretrained("hfl/chinese-roberta-wwm-ext")
model = AutoModelForCausalLM.from_pretrained("hfl/chinese-roberta-wwm-ext", is_decoder=True)
from llama_index.core.llms import  CustomLLM
# Load model directly
# Load model directly
from transformers import AutoTokenizer, AutoModelForCausalLM

tokenizer = AutoTokenizer.from_pretrained("HuggingFaceH4/zephyr-7b-alpha")
model = AutoModelForCausalLM.from_pretrained("HuggingFaceH4/zephyr-7b-alpha")
Settings.llm = model
from llama_index.core import SimpleDirectoryReader
# load documents
documents = SimpleDirectoryReader(input_files=["测试文件.pdf","测试文件.pdf"]).load_data()
from llama_index.core.node_parser import SentenceSplitter
splitter = SentenceSplitter(chunk_size=1024)
nodes = splitter.get_nodes_from_documents(documents)

vector_index = VectorStoreIndex(nodes)
query_engine = vector_index.as_query_engine(similarity_top_k=2)
from llama_index.core.vector_stores import MetadataFilters
# llm=
from typing import List
from llama_index.core.vector_stores import FilterCondition

from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.core import Settings


def vector_query(
        query: str,
        page_numbers: List[str]
) -> str:
    """Perform a vector search over an index.

    query (str): the string query to be embedded.
    page_numbers (List[str]): Filter by set of pages. Leave BLANK if we want to perform a vector search
        over all pages. Otherwise, filter by the set of specified pages.

    """

    metadata_dicts = [
        {"key": "page_label", "value": p} for p in page_numbers
    ]

    query_engine = vector_index.as_query_engine(
        similarity_top_k=2,
        filters=MetadataFilters.from_dicts(
            metadata_dicts,
            condition=FilterCondition.OR
        )
    )
    response = query_engine.query(query)
    return response

from llama_index.core.tools import FunctionTool

vector_query_tool = FunctionTool.from_defaults(
    name="vector_tool",
    fn=vector_query##函数
)
from llama_index.core import SummaryIndex
from llama_index.core.tools import QueryEngineTool

summary_index = SummaryIndex(nodes)
summary_query_engine = summary_index.as_query_engine(
    response_mode="tree_summarize",
    use_async=True,
)
summary_tool = QueryEngineTool.from_defaults(
    name="summary_tool",
    query_engine=summary_query_engine,
    description=(
        "Useful if you want to get a summary of ducuments based on a query."
    ),
)
def mystery(x: int, y: int) -> int:
    """Mystery function that operates on top of two numbers."""
    return (x + y) * (x + y)


mystery_tool = FunctionTool.from_defaults(fn=mystery)
# Load model directly
from transformers import AutoTokenizer, AutoModelForMaskedLM

tokenizer = AutoTokenizer.from_pretrained("hfl/chinese-roberta-wwm-ext")
model = AutoModelForMaskedLM.from_pretrained("hfl/chinese-roberta-wwm-ext")
response = model.predict_and_call(
    [vector_query_tool, summary_tool,mystery_tool],#选择性使用
    "根据文档内容给出一份培训文档 大纲，内容对象为受训人员所以需要有详细的岗位知识和工作流程，需内容翔实有针对性直接面向新员工，并能有效提升员工的职业发展能力。",
    verbose=True
)




















