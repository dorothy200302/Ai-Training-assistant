import nest_asyncio
from pathlib import Path
nest_asyncio.apply()
import llama_index.core
import os
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

PHOENIX_API_KEY = "dc82745df983bbb53b4:ecf8f83"
os.environ["OTEL_EXPORTER_OTLP_HEADERS"] = f"api_key={PHOENIX_API_KEY}"
llama_index.core.set_global_handler(
    "arize_phoenix", endpoint="https://app.phoenix.arize.com"
)
from llama_index.core import Settings
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

# 定义重试装饰器
@retry(
    stop=stop_after_attempt(5),  # 最多重试5次
    wait=wait_exponential(multiplier=1, min=4, max=60),  # 指数退避
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutError))
)
async def make_api_request(func, *args, **kwargs):
    return await func(*args, **kwargs)

# 配置 HTTP 客户端
http_client = httpx.Client(
    timeout=httpx.Timeout(
        connect=60.0,    # 连接超时
        read=300.0,      # 读取超时
        write=60.0,      # 写入超时
        pool=60.0        # 连接池超时
    ),
    verify=False,        # 如果有SSL问题，可以临时禁用验证
    proxies=None         # 如果需要代理可以在这里配置
)

# 更新OpenAI配置
embed_model = OpenAIEmbedding(
    model="text-embedding-3-small",
    api_key="as-D73mmid1JVABYjxT4_ncuw",
    base_url="https://gateway.agione.ai/openai/api/v2",
    http_client=http_client,
    max_retries=5
)

llm = OpenAI(
    model="gpt-4o-mini",
    temperature=0.5,
    api_key="as-D73mmid1JVABYjxT4_ncuw",
    base_url="https://gateway.agione.ai/openai/api/v2",
    http_client=http_client,
    max_retries=5
)

Settings.embed_model = embed_model
Settings.llm = llm
from llama_parse import LlamaParse

parser = LlamaParse(
    api_key="llx-goF4TjJmzE73z5hoWgm4eOlJnLnXgWNTtb4FK59DJ5eNgZfn",
    result_type="markdown",
    use_vendor_multimodal_model=True,
    vendor_multimodal_model_name="anthropic-sonnet-3.5",
)
data_dir = "test/test_data"
out_image_dir = "test/test_data/images"
paper_dicts = {}
papers = [
    r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we approach marketing · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we evolve our knowledge base · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we help users · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we scale support · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about design · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we think about swag · Resend.pdf",
        r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\How we write customer stories · Resend.pdf"
          ]
for paper_path in papers:
    paper_base = Path(paper_path).stem
    full_paper_path = str(Path(data_dir) / paper_path)
    md_json_objs = parser.get_json_result(full_paper_path)
    json_dicts = md_json_objs[0]["pages"]

    image_path = str(Path(out_image_dir) / paper_base)
    image_dicts = parser.get_images(md_json_objs, download_path=image_path)
    paper_dicts[paper_path] = {
        "paper_path": full_paper_path,
        "json_dicts": json_dicts,
        "image_path": image_path,
    }
from llama_index.core.schema import TextNode
from typing import Optional
from copy import deepcopy
from pathlib import Path
# NOTE: these are utility functions to sort the dumped images by the page number
# (they are formatted like "{uuid}-{page_num}.jpg"
import re


def get_page_number(file_name):
    """获取图片文件名中的页码"""
    match = re.search(r"-page-(\d+)\.jpg$", str(file_name))
    if match:
        return int(match.group(1))
    return 0


def _get_sorted_image_files(image_dir):
    """按页码顺序获取图片文件"""
    raw_files = [f for f in list(Path(image_dir).iterdir()) if f.is_file()]
    sorted_files = sorted(raw_files, key=get_page_number)
    return sorted_files

# attach image metadata to the text nodes
def get_text_nodes(json_dicts, paper_path, image_dir=None):
    """将文档分割成节点，并附加图片元数据"""
    nodes = []

    image_files = _get_sorted_image_files(image_dir) if image_dir is not None else None
    md_texts = [d["md"] for d in json_dicts]

    for idx, md_text in enumerate(md_texts):
        chunk_metadata = {
            "page_num": idx + 1,
            "parsed_text_markdown": md_text,
            "paper_path": paper_path,
        }
        if image_files is not None:
            image_file = image_files[idx]
            chunk_metadata["image_path"] = str(image_file)
        chunk_metadata["parsed_text_markdown"] = md_text
        node = TextNode(
            text="",
            metadata=chunk_metadata,
        )
        nodes.append(node)

    return nodes

# this will combine all nodes from all papers into a single list
all_text_nodes = []
text_nodes_dict = {}
for paper_path, paper_dict in paper_dicts.items():
    json_dicts = paper_dict["json_dicts"]
    text_nodes = get_text_nodes(
        json_dicts, paper_dict["paper_path"], image_dir=paper_dict["image_path"]
    )
    all_text_nodes.extend(text_nodes)
    text_nodes_dict[paper_path] = text_nodes
all_text_nodes = []
for paper_path, text_nodes in text_nodes_dict.items():
    all_text_nodes.extend(text_nodes)
print(all_text_nodes[10].get_content(metadata_mode="all"))

import os
from llama_index.core import (
    StorageContext,
    SummaryIndex,
    VectorStoreIndex,
    load_index_from_storage,
)

# Vector Indexing
if not os.path.exists("storage_nodes_papers"):
    # 如果索引不存在，创建新的向量索引
    index = VectorStoreIndex(all_text_nodes)
    index.set_index_id("vector_index")
    index.storage_context.persist("./storage_nodes_papers")
else:
    # 如果索引存在，从磁盘加载
    storage_context = StorageContext.from_defaults(persist_dir="storage_nodes_papers")
    index = load_index_from_storage(storage_context, index_id="vector_index")


# Summary Index dictionary - store map from paper path to a summary index around it
paper_summary_indexes = {
    paper_path: SummaryIndex(text_nodes_dict[paper_path]) for paper_path in papers
}
from llama_index.core.tools import FunctionTool
from llama_index.core.schema import NodeWithScore
from typing import List


# function tools
def chunk_retriever_fn(query: str) -> List[NodeWithScore]:
    """从语料库中检索相关的文档片段"""
    retriever = index.as_retriever(similarity_top_k=5)
    nodes = retriever.retrieve(query)
    return nodes


def _get_document_nodes(
    nodes: List[NodeWithScore], top_n: int = 2
) -> List[NodeWithScore]:
    """Get document nodes from a set of chunk nodes.

    Given chunk nodes, "de-reference" into a set of documents, with a simple weighting function (cumulative total) to determine ordering.

    Cutoff by top_n.

    """
    paper_paths = {n.metadata["paper_path"] for n in nodes}
    paper_path_scores = {f: 0 for f in paper_paths}
    for n in nodes:
        paper_path_scores[n.metadata["paper_path"]] += n.score

    # Sort paper_path_scores by score in descending order
    sorted_paper_paths = sorted(
        paper_path_scores.items(), key=itemgetter(1), reverse=True
    )
    # Take top_n paper paths
    top_paper_paths = [path for path, score in sorted_paper_paths[:top_n]]

    # use summary index to get nodes from all paper paths
    all_nodes = []
    for paper_path in top_paper_paths:
        # NOTE: input to retriever can be blank
        all_nodes.extend(
            paper_summary_indexes[Path(paper_path).name].as_retriever().retrieve("")
        )

    return all_nodes


def doc_retriever_fn(query: str) -> float:
    """Document retriever that retrieves entire documents from the corpus.

    ONLY use for research questions that may require searching over entire research reports.

    Will be slower and more expensive than chunk-level retrieval but may be necessary.
    """
    retriever = index.as_retriever(similarity_top_k=5)
    nodes = retriever.retrieve(query)
    return _get_document_nodes(nodes)


chunk_retriever_tool = FunctionTool.from_defaults(fn=chunk_retriever_fn)
doc_retriever_tool = FunctionTool.from_defaults(fn=doc_retriever_fn)
from llama_index.llms.openai import OpenAI
from pydantic.v1 import BaseModel, Field
from typing import List
from IPython.display import display, Markdown, Image


class TextBlock(BaseModel):
    """Text block."""

    text: str = Field(..., description="The text for this block.")


class ImageBlock(BaseModel):
    """Image block."""

    file_path: str = Field(..., description="File path to the image.")


class ReportOutput(BaseModel):
    """Data model for a report.

    Can contain a mix of text and image blocks. MUST contain at least one image block.

    """

    blocks: List[TextBlock | ImageBlock] = Field(
        ..., description="A list of text and image blocks."
    )

    def render(self) -> None:
        """Render as HTML on the page."""
        # for b in self.blocks:
        #     if isinstance(b, TextBlock):
        #         display(Markdown(b.text))
        #     else:
        #         display(Image(filename=b.file_path))
        print(self.blocks)


report_gen_system_prompt = """\
You are a report generation assistant tasked with producing a well-formatted context given parsed context.

You will be given context from one or more reports that take the form of parsed text.

You are responsible for producing a report with interleaving text and images - in the format of interleaving text and "image" blocks.
Since you cannot directly produce an image, the image block takes in a file path - you should write in the file path of the image instead.

How do you know which image to generate? Each context chunk will contain metadata including an image render of the source chunk, given as a file path. 
Include ONLY the images from the chunks that have heavy visual elements (you can get a hint of this if the parsed text contains a lot of tables).
You MUST include at least one image block in the output.

You MUST output your response as a tool call in order to adhere to the required output format. Do NOT give back normal text.

"""
report_gen_llm = OpenAI(
    model="gpt-4o-mini",
    api_key="as-D73mmid1JVABYjxT4_ncuw",
    base_url="https://gateway.agione.ai/openai/api/v2",
    system_prompt=report_gen_system_prompt,
    http_client=http_client,
    max_retries=3
)
report_gen_sllm = llm.as_structured_llm(output_cls=ReportOutput)
from llama_index.core.workflow import Workflow

from typing import Any, List
from operator import itemgetter

from llama_index.core.llms.function_calling import FunctionCallingLLM
from llama_index.core.llms.structured_llm import StructuredLLM
from llama_index.core.memory import ChatMemoryBuffer
from llama_index.core.llms import ChatMessage
from llama_index.core.tools.types import BaseTool
from llama_index.core.tools import ToolSelection
from llama_index.core.workflow import Workflow, StartEvent, StopEvent, Context, step
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import CompactAndRefine
from llama_index.core.workflow import Event


class InputEvent(Event):
    input: List[ChatMessage]


class ChunkRetrievalEvent(Event):
    tool_call: ToolSelection


class DocRetrievalEvent(Event):
    tool_call: ToolSelection


class ReportGenerationEvent(Event):
    pass


class ReportGenerationAgent(Workflow):
    """报告生成代理类"""
    def __init__(self, chunk_retriever_tool, doc_retriever_tool, llm=None, report_gen_sllm=None, **kwargs):
        """初始化报告生成代理"""
        super().__init__(**kwargs)
        self.chunk_retriever_tool = chunk_retriever_tool
        self.doc_retriever_tool = doc_retriever_tool

        self.llm = llm 
        self.summarizer = CompactAndRefine(llm=self.llm)
        assert self.llm.metadata.is_function_calling_model

        self.report_gen_sllm = report_gen_sllm
        self.report_gen_summarizer = CompactAndRefine(llm=self.report_gen_sllm)

        self.memory = ChatMemoryBuffer.from_defaults(llm=llm)
        self.sources = []

    @step(pass_context=True)
    async def prepare_chat_history(self, ctx: Context, ev: StartEvent) -> InputEvent:
        """准备聊天历史记录"""
        # clear sources
        self.sources = []

        ctx.data["stored_chunks"] = []
        ctx.data["query"] = ev.input

        # get user input
        user_input = ev.input
        user_msg = ChatMessage(role="user", content=user_input)
        self.memory.put(user_msg)

        # get chat history
        chat_history = self.memory.get()
        return InputEvent(input=chat_history)

    @step(pass_context=True)
    async def handle_llm_input(
        self, ctx: Context, ev: InputEvent
    ) -> ChunkRetrievalEvent | DocRetrievalEvent | ReportGenerationEvent | StopEvent:
        """处理语言模型输入"""
        chat_history = ev.input

        response = await self.llm.achat_with_tools(
            [self.chunk_retriever_tool, self.doc_retriever_tool],
            chat_history=chat_history,
        )
        self.memory.put(response.message)

        tool_calls = self.llm.get_tool_calls_from_response(
            response, error_on_no_tool_call=False
        )
        if not tool_calls:
            # all the content should be stored in the context, so just pass along input
            return ReportGenerationEvent(input=ev.input)

        for tool_call in tool_calls:
            if tool_call.tool_name == self.chunk_retriever_tool.metadata.name:
                return ChunkRetrievalEvent(tool_call=tool_call)
            elif tool_call.tool_name == self.doc_retriever_tool.metadata.name:
                return DocRetrievalEvent(tool_call=tool_call)
            else:
                return StopEvent(result={"response": "Invalid tool."})

    @step(pass_context=True)
    async def handle_retrieval(
        self, ctx: Context, ev: ChunkRetrievalEvent | DocRetrievalEvent
    ) -> InputEvent:
        """处理检索请求"""
        query = ev.tool_call.tool_kwargs["query"]
        if isinstance(ev, ChunkRetrievalEvent):
            retrieved_chunks = self.chunk_retriever_tool(query).raw_output
        else:
            retrieved_chunks = self.doc_retriever_tool(query).raw_output
        ctx.data["stored_chunks"].extend(retrieved_chunks)

        # synthesize an answer given the query to return to the LLM.
        response = self.summarizer.synthesize(query, nodes=retrieved_chunks)
        self.memory.put(
            ChatMessage(
                role="tool",
                content=str(response),
                additional_kwargs={
                    "tool_call_id": ev.tool_call.tool_id,
                    "name": ev.tool_call.tool_name,
                },
            )
        )

        # send input event back with updated chat history
        return InputEvent(input=self.memory.get())

    @step(pass_context=True)
    async def generate_report(
        self, ctx: Context, ev: ReportGenerationEvent
    ) -> StopEvent:
        """生成最终报告"""
        # given all the context, generate query
        response = self.report_gen_summarizer.synthesize(
            ctx.data["query"], nodes=ctx.data["stored_chunks"]
        )

        return StopEvent(result={"response": response})

# # 创建代理实例
# agent = ReportGenerationAgent(
#     chunk_retriever_tool,
#     doc_retriever_tool,
#     llm=llm,
#     report_gen_sllm=report_gen_sllm,
#     verbose=True,
#     timeout=60.0,
# )

# 运行异步函数
async def main():
    """主函数"""
    # 1. 直接设置背景信息
    background_informations = {
        "audience_info": "主要受众:abc集团新入职员工,受众特点:年轻化，学历高，学习能力强",
        "company_name": "123",
        "company_culture": "客户第一，团队合作，拥抱变化，诚信，激情，敬业",
        "company_industry": "互联网",
        "company_competition": "行业领先",
        "user_role": "市场营销经理",
        "project_goals": "了解公司市场营销策略的制定和执行",
        "content_needs": "市场营销策略的制定和执"
    }

    # 2. 创建代理实例
    agent = ReportGenerationAgent(
        chunk_retriever_tool,
        doc_retriever_tool,
        llm=llm,
        report_gen_sllm=report_gen_sllm,
        verbose=True,
        timeout=68.0,
    )

    # 3. 构建提示词并生成培训文档
    prompt = f"""
    基于以下背景信息文档内容生成培训文档：
    
    背景信息：
    - 目标受众：{background_informations['audience_info']}
    - 公司名称：{background_informations['company_name']}
    - 公司文化：{background_informations['company_culture']}
    - 行业：{background_informations['company_industry']}
    - 目标岗位：{background_informations['user_role']}
    - 培训目标：{background_informations['project_goals']}
    - 内容需求：{background_informations['content_needs']}
    
    
    请生成一份专业的培训文档，包含：
   
    """

    try:
        # 使用安全的API调用
        ret = await agent.run(input=prompt)
        
        # ... 后面的保存代码保持不变 ...
        
    except Exception as e:
        print(f"执行过程中发生错误: {str(e)}")
        # 可以在这里添加重试或其他错误处理逻辑
        raise

# 执行异步主函数
import asyncio
result = asyncio.run(main())
# Save generated docs to file
import os
import json
from datetime import datetime

def save_generated_docs(ret):
    # Create generated_docs directory if it doesn't exist
    docs_dir = "generated_docs"
    if not os.path.exists(docs_dir):
        os.makedirs(docs_dir)
        
    # Generate timestamp for unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"training_doc_{timestamp}.json"
    filepath = os.path.join(docs_dir, filename)
    
    # Save response to JSON file
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(ret, f, ensure_ascii=False, indent=2)
        
    print(f"Generated document saved to: {filepath}")

# Call save function after getting response
save_generated_docs(result)

# 添加图片路径验证和错误处理
def process_image(image_path):
    """处理图片，确保路径存在且可访问"""
    try:
        # 规范化路径
        abs_path = os.path.abspath(image_path)
        if not os.path.exists(abs_path):
            print(f"Warning: Image not found at {abs_path}")
            return None
            
        # 验证文件是否为图片
        if not any(abs_path.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png']):
            print(f"Warning: File is not an image: {abs_path}")
            return None
            
        return abs_path
    except Exception as e:
        print(f"Error processing image {image_path}: {str(e)}")
        return None

# 在处理文档时使用
for paper_path in papers:
    try:
        # ... existing code ...
        image_dicts = parser.get_images(...)
        for image_dict in image_dicts:
            image_path = image_dict.get('image_path')
            if image_path:
                validated_path = process_image(image_path)
                if validated_path:
                    image_dict['image_path'] = validated_path
                else:
                    # 如果图片无效，从处理列表中移除
                    image_dicts.remove(image_dict)
    except Exception as e:
        print(f"Error processing paper {paper_path}: {str(e)}")
        continue



