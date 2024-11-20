from fastapi import FastAPI, UploadFile, File, Depends
from sqlalchemy.orm import Session
from .DocQuery import DocumentChat

app = FastAPI()



@app.post("/documents/chat")
async def chat_with_document(
    documents_paths: list,
    query: str,
    user_id: int
):
    
    # 创建实例
    chat_system = DocumentChat(api_key="as-D73mmid1JVABYjxT4_ncuw")

    # 加载文档
    chat_system.load_document(documents_paths)

    # 提问
    response = chat_system.chat(query)
    return response

