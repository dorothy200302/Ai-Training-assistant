import os
import openai
from dotenv import load_dotenv,find_dotenv
from llama_index.core import SimpleDirectoryReader, Document, ServiceContext, VectorStoreIndex
from llama_index.legacy.llms import OpenAI
from trulens.feedback.v2.feedback import Groundedness

from evaluation.sentenceWindowRetrival import build_sentence_window_index, get_sentence_window_query_engine

_=load_dotenv(find_dotenv())
openai.api_key = os.environ["OPENAI_API_KEY"]  # 替换为你的 API 密钥
# from llama_index import SimpleDirectoryReader
# from llama_index import Document
# Use a pipeline as a high-level helper
from transformers import pipeline

pipe = pipeline("feature-extraction", model="BAAI/bge-small-en-v1.5")
documents=SimpleDirectoryReader(
    input_files=[""]
).load_data()
print(documents[0])
document=Document(text="\n\n".join([doc.text for doc in documents]))
# from llama_index import VectorStoreIndex
# from llama_index import ServiceContext
# from llama_index.llms import OpenAI
# Load model directly
from transformers import AutoTokenizer, AutoModel

tokenizer = AutoTokenizer.from_pretrained("BAAI/bge-small-en-v1.5")
model = AutoModel.from_pretrained("BAAI/bge-small-en-v1.5")
llm=OpenAI(model="gpt-3.5-turbo",temperature=0.1)
service_context=ServiceContext.from_defaults(
    llm=llm,
    embed_model=model)
index=VectorStoreIndex.from_documents([document],service_context=service_context)
query_engine=index.as_query_engine()
eval_query=[]
with open("eval_query.txt","r") as f:
    for line in f:
        i=line.strip()
        eval_query.append(line.strip())

from trulens_eval import Tru
tru=Tru()
tru.reset_database()

tru_recorder=get_prebuilt_trulens_recorder(query_engine,app_id="")
with tru_recorder as recording:
    for question in eval_query:
        response=query_engine.query(question)

records,feedback=tru.get_records_and_feedback(app_ids=[])
print(records.head())

#improve
from llama_index.llms import OpenAI
llm=OpenAI(model="gpt-3.5-turbo",temperature=0.1)
sentence_index=build_sentence_window_index(documents,
                                           llm,embedding_model=model
                                           )
sentence_window_query_engine=get_sentence_window_query_engine(sentence_index)
print(sentence_window_query_engine.query("What is the capital of France?"))
tru_recorder_window=get_prebuilts_trulens_recorder(sentence_window_query_engine,
                                                   app_id="sentence_window_que"
                                                          "ry_engine")
for question in eval_query:
    with tru_recorder_window as recording:
        response=sentence_window_query_engine.query(question)
        print(question)
        print(str(response))
tru.get_leaderboard(app_ids=[])
tru.run_dashboard()
#//localhost:8501/
automerging_index=build_automerging_index(documents,
                                          llm,embedding_model=model
                                          )
automerging_query_engine=get_automerging_query_engine(automerging_index)
print(automerging_query_engine.query("What is the capital of France?"))
tru_recorder_automerging=get_prebuilt_trulens_recorder(automerging_query_engine,
                                                      app_id="automerging_query_engine")
for question in eval_query:
    with tru_recorder_automerging as recording:
        response=automerging_query_engine.query(question)
        print(question)
        print(str(response))
tru.get_leaderboard(app_ids=[])


import nest_asyncio
nest_asyncio.apply()
from trulens_eval import OpenAI as fOpenAI
provider=fOpenAI()
from trulens_eval import Feedback
f_qa_relevance=Feedback(provider.relevance_with_cot_reasons,
                        name="answer_relevance").on_input().on_output()

from trulens_eval import TruLlama
context_selection=TruLlama.select_surce_nodes().node.text
import numpy as np
f_qs_relevance=(Feedback(provider.relevance_with_cot_reasons,
                         name="context_relevance")
                .on_input()
                .on(context_selection)
                .aggregate(np.mean))

grouded=Groundedness(groundedness_provider=provider)
f_groundedness=(Feedback(grouded.groundedness_measure_with_cot_reasons,
                         name="groundedness")
                         .on(context_selection)
                .on_output()
                .aggregate(grouded.grounded_statements_aggregator))

tru_recoder=TruLlama(
    sentence_window_query_engine,
    app_id="sentence_window_query_engine",
    feedbacks=[f_qa_relevance,f_qs_relevance,f_groundedness]
)







