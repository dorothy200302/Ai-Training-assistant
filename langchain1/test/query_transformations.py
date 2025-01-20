import sys
import os
import re
from langchain.docstore.document import Document
from langchain.vectorstores import FAISS
from enum import Enum
from langchain.embeddings.openai import OpenAIEmbeddings
from langchain_openai import ChatOpenAI
from typing import Any, Dict, List, Tuple
from pydantic import BaseModel, Field
import argparse

from dotenv import load_dotenv

load_dotenv()

# os.environ["OPENAI_API_KEY"] = os.getenv('OPENAI_API_KEY')

sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))  # Add the parent directory to the path

from helper_functions import *

from openai import OpenAI


class QuestionGeneration(Enum):
    """
    Enum class to specify the level of question generation for document processing.
    """
    DOCUMENT_LEVEL = 1
    FRAGMENT_LEVEL = 2


DOCUMENT_MAX_TOKENS = 4000
DOCUMENT_OVERLAP_TOKENS = 100
FRAGMENT_MAX_TOKENS = 128
FRAGMENT_OVERLAP_TOKENS = 16
QUESTION_GENERATION = QuestionGeneration.DOCUMENT_LEVEL
QUESTIONS_PER_DOCUMENT = 40


class QuestionList(BaseModel):
    question_list: List[str] = Field(..., title="List of questions generated for the document or fragment")


class OpenAIEmbeddingsWrapper(OpenAIEmbeddings):
    """
    A wrapper class for OpenAI embeddings, providing a similar interface to the original OllamaEmbeddings.
    """
    def __call__(self, query: str) -> List[float]:
        return self.embed_query(query)


def clean_and_filter_questions(questions: List[str]) -> List[str]:
    cleaned_questions = []
    for question in questions:
        cleaned_question = re.sub(r'^\d+\.\s*', '', question.strip())
        if cleaned_question.endswith('?'):
            cleaned_questions.append(cleaned_question)
    return cleaned_questions


def generate_questions(text: str) -> List[str]:
    client = OpenAI(
        api_key="sk-3767598f60e9415e852ff4c43ccc0852",
        base_url="https://api.deepseek.com",
        http_client=httpx.Client()
    )
    
    completion = client.chat.completions.create(
        model="deepseek-chat",
        messages=[...],
        temperature=0.7,
        max_tokens=2000,
        stream=False
    )


def generate_answer(context: str, query: str) -> str:
    client = OpenAI(
        api_key="sk-3767598f60e9415e852ff4c43ccc0852",  # DeepSeek API Key
        base_url="https://api.deepseek.com",  # DeepSeek API endpoint
        timeout=30,
        max_retries=3
    )
    
    try:
        completion = client.chat.completions.create(
            model="deepseek-chat",  # DeepSeek 模型
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"}
            ],
            temperature=0.7,
            max_tokens=2000,
            stream=False
        )
        return completion.choices[0].message.content
    except Exception as e:
        print(f"Error generating answer: {str(e)}")
        raise


def split_document(document: str, chunk_size: int, chunk_overlap: int) -> List[str]:
    tokens = re.findall(r'\b\w+\b', document)
    chunks = []
    for i in range(0, len(tokens), chunk_size - chunk_overlap):
        chunk_tokens = tokens[i:i + chunk_size]
        chunks.append(chunk_tokens)
        if i + chunk_size >= len(tokens):
            break
    return [" ".join(chunk) for chunk in chunks]


def print_document(comment: str, document: Any) -> None:
    print(f'{comment} (type: {document.metadata["type"]}, index: {document.metadata["index"]}): {document.page_content}')


class DocumentProcessor:
    def __init__(self, content: str, embedding_model: OpenAIEmbeddings):
        self.content = content
        self.embedding_model = embedding_model

    def run(self):
        text_documents = split_document(self.content, DOCUMENT_MAX_TOKENS, DOCUMENT_OVERLAP_TOKENS)
        print(f'Text content split into: {len(text_documents)} documents')

        documents = []
        counter = 0
        for i, text_document in enumerate(text_documents):
            text_fragments = split_document(text_document, FRAGMENT_MAX_TOKENS, FRAGMENT_OVERLAP_TOKENS)
            print(f'Text document {i} - split into: {len(text_fragments)} fragments')

            for j, text_fragment in enumerate(text_fragments):
                documents.append(Document(
                    page_content=text_fragment,
                    metadata={"type": "ORIGINAL", "index": counter, "text": text_document}
                ))
                counter += 1

                if QUESTION_GENERATION == QuestionGeneration.FRAGMENT_LEVEL:
                    questions = generate_questions(text_fragment)
                    documents.extend([
                        Document(page_content=question,
                                 metadata={"type": "AUGMENTED", "index": counter + idx, "text": text_document})
                        for idx, question in enumerate(questions)
                    ])
                    counter += len(questions)
                    print(f'Text document {i} Text fragment {j} - generated: {len(questions)} questions')

            if QUESTION_GENERATION == QuestionGeneration.DOCUMENT_LEVEL:
                questions = generate_questions(text_document)
                documents.extend([
                    Document(page_content=question,
                             metadata={"type": "AUGMENTED", "index": counter + idx, "text": text_document})
                    for idx, question in enumerate(questions)
                ])
                counter += len(questions)
                print(f'Text document {i} - generated: {len(questions)} questions')

        for document in documents:
            print_document("Dataset", document)

        print(f'Creating store, calculating embeddings for {len(documents)} FAISS documents')
        vectorstore = FAISS.from_documents(documents, self.embedding_model)

        print("Creating retriever returning the most relevant FAISS document")
        return vectorstore.as_retriever(search_kwargs={"k": 1})


def parse_args():
    parser = argparse.ArgumentParser(description="Process a document and create a retriever.")
    parser.add_argument('--path', type=str, default=r'C:\Users\dorot\PycharmProjects\langchain1\.venv\share\阿里巴巴对工作岗位的要求 - 百度文库.pdf',
                        help="Path to the PDF document to process")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    # Load sample PDF document to string variable
    content = read_pdf_to_string(args.path)

    # Instantiate OpenAI Embeddings class that will be used by FAISS
    embedding_model = OpenAIEmbeddings(
        model="text-embedding-3-small",
        openai_api_base='https://gateway.agione.ai/openai/api/v2',
        openai_api_key='as-D73mmid1JVABYjxT4_ncuw'
    )

    # Process documents and create retriever
    processor = DocumentProcessor(content, embedding_model)
    document_query_retriever = processor.run()

    # Example usage of the retriever
    query = """基于以下培训需求和相关文档，生成一个详细的培训大纲：
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
    retrieved_docs = document_query_retriever.get_relevant_documents(query)
    print(f"\nQuery: {query}")
    print(f"Retrieved document: {retrieved_docs[0].page_content}")

    # Further query example
    query = ""
    retrieved_documents = document_query_retriever.get_relevant_documents(query)
    for doc in retrieved_documents:
        print_document("Relevant fragment retrieved", doc)

    context = doc.metadata['text']
    answer = generate_answer(context, query)
    print(f'{os.linesep}Answer:{os.linesep}{answer}')