from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from pydantic import BaseModel
import aiohttp
import tempfile
import os
from dev.Chatbot.DocQuery import DocumentChat
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
                if file_ext not in ['.doc', '.docx', '.pdf', '.txt', '.md', '.ppt', '.pptx']:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Unsupported file type: {file_ext}. Supported types are: .doc, .docx, .pdf, .txt, .md, .ppt, .pptx"
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
                        upload_file_name=os.path.basename(temp_path),
                        url=url,
                        user_email=current_user['email']
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
        document_urls = request.document_urls
        
        if not document_urls:
            return {"response": "您还没有上传任何文档。请先上传文档再进行对话。"}

        # 下载并处理文档
        temp_files = []
        for url in document_urls:
            try:
                temp_file = await download_file(url)
                if temp_file:
                    # 验证文件是否存在且可读
                    if not os.path.exists(temp_file):
                        print(f"Downloaded file does not exist: {temp_file}")
                        continue
                    try:
                        with open(temp_file, 'rb') as f:
                            # 尝试读取文件的前几个字节来验证可读性
                            f.read(1024)
                        temp_files.append(temp_file)
                        print(f"Successfully validated file: {temp_file}")
                    except Exception as e:
                        print(f"Error validating file {temp_file}: {str(e)}")
                        continue
            except Exception as e:
                print(f"Error downloading file {url}: {str(e)}")
                continue

        if not temp_files:
            return {"response": "无法访问您的文档。请确保文档已正确上传并且格式正确。"}

        try:
            # 创建文档聊天实例
            doc_chat = DocumentChat(model_name=request.model_name)
            
            # 打印文件信息
            for file_path in temp_files:
                file_size = os.path.getsize(file_path)
                print(f"Loading file: {file_path}, Size: {file_size} bytes")
            
            # 加载所有文档
            try:
                load_result = doc_chat.load_document(temp_files)
                print(f"Document loading result: {load_result}")
            except Exception as e:
                print(f"Error in load_document: {str(e)}")
                if hasattr(e, '__traceback__'):
                    import traceback
                    traceback.print_exc()
                raise
            
            # 获取回答
            response = doc_chat.chat(request.query)
            return {"response": response}

        finally:
            # 清理临时文件
            for temp_file in temp_files:
                try:
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                        print(f"Successfully removed temp file: {temp_file}")
                    else:
                        print(f"Temp file already removed: {temp_file}")
                except Exception as e:
                    print(f"Error removing temp file {temp_file}: {str(e)}")
                
    except Exception as e:
        print(f"Chat error: {str(e)}")
        if hasattr(e, '__traceback__'):
            import traceback
            traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"处理文档时出错: {str(e)}。请确保文档格式正确且未损坏。"
        )

async def download_file(url: str) -> str:
    """从URL下载文件到临时目录"""
    try:
        # 从URL中提取文件扩展名，并确保以点号开始
        file_ext = os.path.splitext(url)[1]
        if not file_ext and '.' in url:
            file_ext = '.' + url.split('.')[-1]
        
        # 创建临时文件时添加扩展名
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=file_ext)
        temp_file_path = temp_file.name
        temp_file.close()  # 立即关闭文件，避免 Windows 上的文件锁定问题

        print(f"Downloading file to: {temp_file_path} with extension: {file_ext}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    try:
                        content = await response.read()
                        with open(temp_file_path, 'wb') as f:
                            f.write(content)
                        print(f"Successfully downloaded file to: {temp_file_path}")
                        return temp_file_path
                    except Exception as e:
                        # 如果写入失败，清理临时文件
                        if os.path.exists(temp_file_path):
                            os.unlink(temp_file_path)
                        raise Exception(f"文件下载失败: {str(e)}")
                else:
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"文件下载失败，服务器返回: {response.status}"
                    )
    except Exception as e:
        # 确保任何错误都能返回有意义的错误信息
        if isinstance(e, HTTPException):
            raise HTTPException(
            status_code=500,
            detail=f"文件下载过程中出错: {str(e)}"
        )
