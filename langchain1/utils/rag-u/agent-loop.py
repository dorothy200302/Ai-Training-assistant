import nest_asyncio
from langsmith.schemas import Feedback
from trulens.feedback.v2.feedback import Groundedness

nest_asyncio.apply()
from dotenv import load_dotenv,find_dotenv
import os
import openai
_=load_dotenv(find_dotenv())
openai.api_key = os.environ["OPENAI_API_KEY"]

import router_engine as re
vector_tool,summaty_tool=re.get_doc_tools("meta.pdf","meta")
from llama_index.llms.openai import OpenAI
llm=OpenAI(model="gpt-3.5-turbo")
from llama_index.core.agent import FunctionCallingAgentWorker
from llama_index.core.agent import AgentRunner
agent_worker=FunctionCallingAgentWorker.from_tools(
    [vector_tool,summaty_tool,llm],
    llm=llm,
    verbose=True
)
agent=AgentRunner(agent_worker)
response=agent.query(
    "Tell me about the agent roles in MetaGPT, "
    "and then how they communicate with each other."
)#复杂多步问题
print(response.source_nodes[0].get_content(metadata_mode="all"))
from llama_index.legacy.readers import SimpleDirectoryReader
from llama_index.core.indices import load_index_from_storage
from llama_index.legacy.schema import Document
from llama_index.core.service_context import ServiceContext
from llama_index.core.storage.storage_context import StorageContext
from llama_index.core.indices.vector_store.base import VectorStoreIndex
from llama_index.core.node_parser import HierarchicalNodeParser,get_leaf_nodes
from trulens_eval import TruLlama
import numpy as np

def get_prebuilt_trulens_recorder(query_engine, app_id):

    qa_relevance = (
        Feedback(openai.relevance_with_cot_reasons, name="Answer Relevance")
        .on_input_output()
    )

    qs_relevance = (
        Feedback(openai.relevance_with_cot_reasons, name = "Context Relevance")
        .on_input()
        .on(TruLlama.select_source_nodes().node.text)
        .aggregate(np.mean)
    )

#     grounded = Groundedness(groundedness_provider=openai, summarize_provider=openai)
    grounded = Groundedness(groundedness_provider=openai)

    groundedness = (
        Feedback(grounded.groundedness_measure_with_cot_reasons, name="Groundedness")
            .on(TruLlama.select_source_nodes().node.text)
            .on_output()
            .aggregate(grounded.grounded_statements_aggregator)
    )

    feedbacks = [qa_relevance, qs_relevance, groundedness]
    tru_recorder = TruLlama(
        query_engine,
        app_id=app_id,
        feedbacks=feedbacks
    )
    return tru_recorder
#
#debug and control
agent_worker=FunctionCallingAgentWorker.from_tools(
    [vector_tool,summaty_tool,llm],
    llm=llm,
    verbose=True
)
agent=AgentRunner(agent_worker)
task=agent.create_task("tell me about the agent roles in MetaGPT, and then how they communicate with each other.")
step_output=agent.run_step(task.task_id)
completed_steps=agent.get_completed_step(task.task_id)
print(f"Num completed for task {task.task_id}: {len(completed_steps)}")
print(completed_steps[0].output.sources[0].raw_output)
upcoming_steps = agent.get_upcoming_steps(task.task_id)
print(f"Num upcoming steps for task {task.task_id}: {len(upcoming_steps)}")
upcoming_steps[0]
step_output = agent.run_step(
    task.task_id, input="What about how agents share information?"
)
step_output = agent.run_step(task.task_id)
print(step_output.is_last)
response = agent.finalize_response(task.task_id)
print(str(response))













