from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from pydantic import BaseModel
import aiohttp
import tempfile
import os
from .DocQuery import DocumentChat
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import Depends

from dev.core.security import get_current_user
from dev.config.database import get_db, SessionLocal
from dev.CloudStorage.aws import upload_file_to_s3_by_key
import uuid
import urllib.parse
from dev.core.security import get_current_user
from dev.config.database import get_db, SessionLocal
from dev.crud.crud_document import document_crud
import boto3
import requests

# MySQL数据库配置
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:123456@localhost:3306/doc_generator"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

router = APIRouter(
)

class ChatRequest(BaseModel):
    query: str
    model_name: str = "gpt-4o-mini"
    document_urls: List[str] = []

def get_user_documents(db: Session, user_email: str) -> List[str]:
    """从数据库获取用户和其上级的文档URL列表"""
    # 获取用户ID和上级ID
    user_query = """
        SELECT e.id, e.leader_id 
        FROM employees e 
        WHERE e.email = :email
    """
    result = db.execute(user_query, {"email": user_email}).first()
    
    if not result:
        return []
        
    user_id, leader_id = result
    
    # 构建文档查询SQL
    docs_query = """
        SELECT DISTINCT d.url 
        FROM documents d
        JOIN employees e ON d.user_email = e.email
        WHERE e.id = :user_id 
    """
    
    if leader_id:
        docs_query += " OR e.id = :leader_id"
        params = {"user_id": user_id, "leader_id": leader_id}
    else:
        params = {"user_id": user_id}
        
    # 执行查询并返回URL列表
    results = db.execute(docs_query, params)
    return [row[0] for row in results]

@router.post("/upload")
async def upload_chat_document(
    files: List[UploadFile] = File(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        urls = []
        temp_paths = []

        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            
            # Save uploaded files to temp directory
            for file in files:
                # Validate file extension
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in ['.doc', '.docx', '.pdf', '.txt', '.md']:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Unsupported file type: {file_ext}"
                    )
                
                # Generate safe filename
                safe_filename = f"{str(uuid.uuid4())}{file_ext}"
                temp_path = os.path.join(temp_dir, safe_filename)
                
                # Save file
                content = await file.read()
                with open(temp_path, 'wb') as out_file:
                    out_file.write(content)
                temp_paths.append(temp_path)

            # Upload files to S3 and store URLs
            for temp_path in temp_paths:
                try:
                    s3_key = f"chat_docs/{current_user['email']}/{os.path.basename(temp_path)}"
                    url = upload_file_to_s3_by_key(s3_key, temp_path)
                    urls.append(url)
                    
                    # Save document record to database
                    document_crud.create_document(
                        db=db,
                        user_email=current_user['email'],
                        file_name=os.path.basename(temp_path),
                        file_url=url,
                        document_type='chat'
                    )
                except Exception as e:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to upload file to S3: {str(e)}"
                    )

        finally:
            # Clean up temporary files
            for temp_path in temp_paths:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)

        return {"urls": urls}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing upload: {str(e)}"
        )

@router.post("/chat")
async def chat_endpoint(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document_urls = get_user_documents(db, current_user.email)
        
        if not document_urls:
            return {"response": "您还没有上传任何文档。请先上传文档再进行对话。"}

        # 下载并处理文档
        temp_files = []
        for url in document_urls:
            try:
                temp_file = await download_file(url)
                if temp_file:
                    temp_files.append(temp_file)
            except Exception as e:
                print(f"Error downloading file {url}: {str(e)}")

        if not temp_files:
            return {"response": "无法访问您的文档。请确保文档已正确上传。"}

        # 创建文档聊天实例
        doc_chat = DocumentChat(model_name=request.model_name)
        
        # 加载所有文档
        doc_chat.load_document(temp_files)
            
            # 获取回答
        response = doc_chat.chat(request.query)

        # 清理临时文件
        for temp_file in temp_files:
            try:
                os.remove(temp_file)
            except Exception as e:
                print(f"Error removing temp file {temp_file}: {str(e)}")
            
            return {"response": response}
                
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



async def download_file(url: str) -> str:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    temp_file = tempfile.NamedTemporaryFile(delete=False)
                    temp_file_path = temp_file.name
                
                    content = await response.read()
                    with open(temp_file_path, 'wb') as f:
                        f.write(content)
                
                    return temp_file_path
                else:
                    raise HTTPException(status_code=404, detail="File not found")
