# 导入异步嵌套支持，用于处理异步操作
import nest_asyncio
nest_asyncio.apply()

# 导入环境变量相关库
from dotenv import load_dotenv,find_dotenv
import os
import openai

# 定义需要处理的PDF文档路径列表
papers = [
    r"C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf",
]

# 导入自定义的路由引擎和路径处理模块
from router_engine import *
from pathlib import Path

# 创建文档到工具的映射字典
papers_to_tools_dict={}
for paper in papers:
    # 为每个文档创建向量工具和摘要工具
    vector_tool,summary_tool=get_doc_tools(paper,Path(paper).stem)
    papers_to_tools_dict[paper]=[vector_tool,summary_tool]

# 将所有文档的工具展平到一个列表中
initial_tools=[t for paper in papers for t in
               papers_to_tools_dict[paper]]

# 导入OpenAI和错误处理相关的库
from llama_index.llms.openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential
from llama_index.core.callbacks import CallbackManager
from llama_index.core.callbacks import LlamaDebugHandler

# 配置调试处理器和回调管理器
llama_debug = LlamaDebugHandler(print_trace_on_error=True)
callback_manager = CallbackManager([llama_debug])

# 设置OpenAI的API配置
OpenAI.api_base="https://gateway.agione.ai/openai/api/v2"
OpenAI.api_key="as-D73mmid1JVABYjxT4_ncuw"

# 初始化OpenAI LLM客户端
llm = OpenAI(
    model="gpt-4o-mini",
    api_key="as-D73mmid1JVABYjxT4_ncuw",
    api_base="https://gateway.agione.ai/openai/api/v2",
    timeout=120,  # 设置超时时间为120秒
    max_retries=3,  # 设置最大重试次数为3次
    callback_manager=callback_manager
)

# 添加重试装饰器的查询函数
@retry(
    stop=stop_after_attempt(3),  # 最多重试3次
    wait=wait_exponential(multiplier=1, min=4, max=10)  # 使用指数退避策略
)
def make_agent_query(agent, query_text):
    """
    执行代理查询的函数，包含重试机制
    :param agent: 代理对象
    :param query_text: 查询文本
    :return: 查询响应
    """
    try:
        response = agent.query(query_text)
        return response
    except Exception as e:
        print(f"Error during query: {str(e)}")
        raise

# 创建代理并执行查询
try:
    # 初始化函数调用代理工作器
    agent_worker = FunctionCallingAgentWorker.from_tools(
        initial_tools,
        llm=llm,
        verbose=True,
    )
    # 创建代理运行器
    agent = AgentRunner(agent_worker)
    
    # 使用带重试机制的查询函数执行查询
    response = make_agent_query(agent, "根据现有的网络资料补充并生成一份培训文档大纲...")
    print(str(response))

except Exception as e:
    print(f"Failed to complete query after retries: {str(e)}")

# 以下注释掉的代码是用于处理多个论文的示例代码
# 包括创建对象索引、检索器等功能


