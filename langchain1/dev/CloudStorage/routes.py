import os
import io
import uuid
import json
import logging
import asyncio
import tempfile
import re
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import (
    APIRouter, 
    HTTPException, 
    Depends, 
    Request, 
    Body, 
    UploadFile, 
    File, 
    Form, 
    Response
)
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

from dev.models.models import Users as User
from dev.database import get_db
from dev.core.security import get_current_user
from dev.crud.crud_generated_document import generated_document_crud
from dev.CloudStorage.aws import upload_file_to_s3_by_key
from dev.Generate.AsyncTrainingDocGenerator import AsyncTrainingDocGenerator
from fastapi.templating import Jinja2Templates
from .aws import download_file_by_url
import mimetypes
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler with a higher log level
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.DEBUG)

# Create formatters and add them to the handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
console_handler.setFormatter(formatter)

# Add the handlers to the logger
logger.addHandler(console_handler)

# Create router with explicit responses
router = APIRouter(
    tags=["storage"],
    responses={
        404: {"description": "Not found"},
        500: {"description": "Internal server error"},
    }
)

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'frontend', 'src', 'pages', 'templates'))

@router.post("/generate_outline_and_upload/")
async def generate_outline_and_upload(
    files: List[UploadFile] = File(...),
    requirements: Optional[str] = Form(None),
    ai_model: str = Form(...),
    description: str = Form(...),
    current_user: dict = Depends(get_current_user)  # 使用依赖注入
):
    temp_files = []
    temp_dir = None
    
    try:
        # 直接使用注入的 current_user
        logger.info(f"Current user data: {current_user}")
        user_email = current_user.get('email')
        if not user_email:
            raise HTTPException(status_code=400, detail="User email not found")
            
        logger.info(f"User email: {user_email}")
        
        logger.info("Received generate_outline_and_upload request")
        logger.debug(f"Requrements: {requirements}")
        logger.debug(f"Number of files: {len(files)}")
        logger.debug(f"AI Model: {ai_model}")
        logger.debug(f"Description: {description}")
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        # 保存上传的文件
        for file in files:
            try:
                # 获取文件扩展名
                file_extension = os.path.splitext(file.filename)[1]
                # 创建临时文件
                temp_file = os.path.join(temp_dir, f"Doc1{file_extension}")
                
                # 读取并保存文件内容
                content = await file.read()
                if not content:
                    logger.error(f"Empty file received: {file.filename}")
                    continue
                    
                with open(temp_file, "wb") as f:
                    f.write(content)
                logger.info(f"Saved file to {temp_file}")
                
                # 验证文件是否成功保存且可读
                if not os.path.exists(temp_file) or os.path.getsize(temp_file) == 0:
                    logger.error(f"Failed to save file or file is empty: {temp_file}")
                    continue
                    
                temp_files.append(temp_file)
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                continue
        
        if not temp_files:
            raise HTTPException(status_code=400, detail="No valid files were uploaded")
        
        # 解析描述信息
        background_info = json.loads(description)
        
        # 初始化文档生成器
        doc_generator = AsyncTrainingDocGenerator(
            file_paths=temp_files,
            model_name=ai_model,
            background_informations=background_info,
            user_email=user_email
        )
        
        # 生成大纲
        outline = await doc_generator.generate_training_outline(requirements)
        
        # 生成完整文档
        full_doc = await doc_generator.generate_full_training_doc(outline)
        
        # 保存文档
        doc_path = await doc_generator.save_document(full_doc)
        
        # 返回结果
        return {
            "status": "success",
            "message": "Document generated successfully",
            "outline": outline,
            "doc_path": doc_path
        }
            
    except Exception as e:
        logger.error(f"Error in generate_outline_and_upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # 清理临时文件
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
                    logger.info(f"Successfully removed temp file: {temp_file}")
            except Exception as e:
                logger.error(f"Error removing temp file {temp_file}: {str(e)}")
        
        # 清理临时目录
        if temp_dir and os.path.exists(temp_dir):
            try:
                os.rmdir(temp_dir)
                logger.info(f"Successfully removed temp directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error removing temp directory: {str(e)}")

@router.post("/generate_full_doc_with_doc/")
async def generate_full_doc_with_doc(
    outline: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user = Depends(get_current_user),
    ai_model: str = Form("gpt-4o-mini", description="AI model to use")
):
    temp_paths = []
    try:
        # Ensure proper parsing of JSON strings
        try:
            outline_dict = json.loads(outline) if isinstance(outline, str) else outline
            description_dict = json.loads(description) if isinstance(description, str) else description
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format: {str(e)}")

        # Validate outline_dict is in the expected format
        if not isinstance(outline_dict, (list, dict)):
            raise HTTPException(status_code=400, detail="Outline must be a valid JSON array or object")

        # Convert outline_dict to a string format that AsyncTrainingDocGenerator can process
        outline_str = ""
        if isinstance(outline_dict, list):
            for i, item in enumerate(outline_dict, 1):
                if isinstance(item, dict) and 'title' in item:
                    outline_str += f"## {i}. {item['title']}\n"
                    if 'subsections' in item and isinstance(item['subsections'], list):
                        for j, subsection in enumerate(item['subsections'], 1):
                            if isinstance(subsection, dict) and 'title' in subsection:
                                outline_str += f"### {i}.{j}. {subsection['title']}\n"
        else:
            outline_str = json.dumps(outline_dict)

        logger.info("Processed outline:", outline_str)
        logger.info("Processed description:", description_dict)
        
        # Create temp directory for uploaded files
        temp_dir = tempfile.mkdtemp()  # Use system temp directory
        logger.info(f"Using temporary directory: {temp_dir}")

        # Process uploaded files
        for file in files:
            try:
                file_ext = os.path.splitext(file.filename)[1]
                safe_filename = f"{str(uuid.uuid4())}{file_ext}"
                temp_path = os.path.join(temp_dir, safe_filename)
                
                content = await file.read()
                with open(temp_path, 'wb') as out_file:
                    out_file.write(content)
                temp_paths.append(temp_path)
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error processing file {file.filename}: {str(e)}")

        # Generate document
        g = AsyncTrainingDocGenerator(
            file_paths=temp_paths,
            model_name=ai_model,
            background_informations=description_dict,
            user_email=current_user["email"]
        )
        full_doc = await g.generate_full_training_doc_async(outline_str)
        
        if not full_doc:
            raise HTTPException(status_code=500, detail="Failed to generate document content")
        
        # Parse the generated document into sections
        sections = []
        current_section = None
        
        # Split the document into lines and process each line
        lines = full_doc.split('\n')
        content_buffer = []
        
        for line in lines:
            # Check for main section headers (marked with ## or ###)
            if line.startswith('## ') or line.startswith('### '):
                # If we have a previous section, save it
                if current_section:
                    if content_buffer:
                        current_section['content'] = '\n'.join(content_buffer)
                    sections.append(current_section)
                    content_buffer = []
                
                # Create new section
                current_section = {
                    'title': line.lstrip('#').strip(),
                    'content': '',
                    'subsections': []
                }
            else:
                # Add line to current section's content buffer
                content_buffer.append(line)
        
        if current_section and content_buffer:
            current_section['content'] = '\n'.join(content_buffer)
            sections.append(current_section)
        
        document = {
            'title': 'Generated Document',
            'content': full_doc,
            'sections': sections
        }
        
        return {"document": document}
    
    except Exception as e:
        logger.error(f"Error in generate_full_doc_with_doc: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Cleanup temp files
        for path in temp_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e:
                logger.error(f"Error cleaning up temp file: {str(e)}")

def parse_template_content(template_content: str) -> dict:
    """Parse the template content and return a structured document format"""
    try:
        # Parse the JSON content
        template_data = json.loads(template_content)
        
        # 构建文档结构
        document = {
            "title": template_data.get('title', '培训课程'),
            "sections": []
        }
        
        # 1. 基本信息部分
        if 'basicInfo' in template_data:
            basic_info = template_data['basicInfo']
            document['sections'].append({
                "title": "基本信息",
                "level": 1,
                "content": f"""课程名称：{basic_info.get('subtitle', '')}
目标学员：{basic_info.get('targetAudience', '')}
课程时长：{basic_info.get('duration', '')}
课程概述：{basic_info.get('overview', '')}"""
            })
        
        # 2. 课程目标
        if 'objectives' in template_data:
            objectives_content = "\n".join([f"- {obj}" for obj in template_data['objectives']])
            document['sections'].append({
                "title": "课程目标",
                "level": 1,
                "content": objectives_content
            })
        
        # 3. 核心能力
        if 'competencies' in template_data:
            comp_sections = []
            for comp in template_data['competencies']:
                content = f"{comp.get('description', '')}\n\n关键点：\n"
                if 'keyPoints' in comp:
                    content += "\n".join([f"- {point}" for point in comp['keyPoints']])
                comp_sections.append({
                    "title": comp.get('name', '核心能力'),
                    "level": 2,
                    "content": content
                })
            document['sections'].append({
                "title": "核心能力",
                "level": 1,
                "subsections": comp_sections
            })
        
        # 4. 课程模块
        if 'modules' in template_data:
            module_sections = []
            for i, module in enumerate(template_data['modules'], 1):
                content = []
                content.append(module.get('description', ''))
                
                if 'objectives' in module:
                    content.append("\n模块目标：")
                    content.extend([f"- {obj}" for obj in module['objectives']])
                
                if 'keyPoints' in module:
                    content.append("\n关键要点：")
                    content.extend([f"- {point}" for point in module['keyPoints']])
                
                if 'content' in module:
                    content.append("\n内容大纲：")
                    content.append(module['content'])
                
                if 'activities' in module:
                    content.append("\n实践活动：")
                    content.extend([f"- {activity}" for activity in module['activities']])
                
                module_sections.append({
                    "title": f"{i}. {module.get('title', '课程模块')}",
                    "level": 2,
                    "content": "\n".join(content)
                })
            
            document['sections'].append({
                "title": "课程模块",
                "level": 1,
                "subsections": module_sections
            })
        
        # 5. 教学方法
        if 'teachingMethods' in template_data:
            methods_content = []
            for method in template_data['teachingMethods']:
                methods_content.append(f"### {method.get('name', '')}")
                methods_content.append(method.get('description', ''))
            document['sections'].append({
                "title": "教学方法",
                "level": 1,
                "content": "\n".join(methods_content)
            })
        
        # 6. 学习资源
        if 'resources' in template_data:
            resources_content = []
            for resource in template_data['resources']:
                resources_content.append(f"### {resource.get('title', '')}")
                resources_content.append(f"描述：{resource.get('description', '')}")
                resources_content.append(f"类型：{resource.get('type', '')}")
                resources_content.append(f"格式：{resource.get('format', '')}")
                if 'url' in resource:
                    resources_content.append(f"链接：{resource['url']}")
                resources_content.append("")
            document['sections'].append({
                "title": "学习资源",
                "level": 1,
                "content": "\n".join(resources_content)
            })
        
        # 7. 评估方式
        if 'assessments' in template_data:
            assessments_content = []
            for assessment in template_data['assessments']:
                assessments_content.append(f"### {assessment.get('name', '')}")
                assessments_content.append(assessment.get('description', ''))
                if 'criteria' in assessment:
                    assessments_content.append("\n评估标准：")
                    assessments_content.extend([f"- {criterion}" for criterion in assessment['criteria']])
                assessments_content.append("")
            document['sections'].append({
                "title": "评估方式",
                "level": 1,
                "content": "\n".join(assessments_content)
            })
        
        return document
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid template content format")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing template content: {str(e)}")

@router.post("/generate_full_doc_with_template/", response_model=None)
async def generate_full_doc_with_template(
    template: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),  # Explicitly type as dict
    ai_model: str = Form("gpt-4o-mini", description="AI model to use"),
    db: Session = Depends(get_db)
):
    """
    Generate a full document based on a template
    """
    temp_paths = []  # 存储临时文件路径
    urls_map = {}    # 存储文件名到URL的映射
    temp_dir = None  # 临时目录
    user_email = current_user.get("email")  # 获取用户邮箱
    
    try:
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        logger.info(f"Created temp directory: {temp_dir}")
        
        # 解析 description
        try:
            description_dict = json.loads(description)
            logger.info("Successfully parsed description JSON")
        except json.JSONDecodeError:
            logger.warning("Failed to parse description as JSON, using as raw string")
            description_dict = {"description": description}

        # 初始化文档生成器
        logger.info("Initializing document generator")
        logger.info(f"Using email: {user_email}")  # Add this line
        
        if not isinstance(user_email, str):
            logger.error(f"Invalid email type: {type(user_email)}")
            raise HTTPException(status_code=500, detail=f"Invalid email type: {type(user_email)}")
       
        # 保存上传的文件到临时目录
        for file in files:
            try:
                file_ext = os.path.splitext(file.filename)[1]
                safe_filename = f"{str(uuid.uuid4())}{file_ext}"
                temp_path = os.path.join(temp_dir, safe_filename)
                
                content = await file.read()
                with open(temp_path, 'wb') as out_file:
                    out_file.write(content)
                
                temp_paths.append(temp_path)
                urls_map[file.filename] = temp_path
                logger.info(f"Successfully saved file: {file.filename}")
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error processing file {file.filename}: {str(e)}")
             
        generator = AsyncTrainingDocGenerator(
            file_paths=temp_paths,
            model_name=ai_model,
            background_informations=description_dict,
            user_email=user_email
        )
        logger.info("Document generator initialized successfully")
        
        # 生成完整文档
        logger.info("Starting full document generation")
        generator.file_paths = temp_paths
        full_doc = await generator.generate_fulldoc_with_template(template=template)
        logger.info("Document generation completed")
        
        # 上传文件到 S3 并保存到数据库
        for filename, temp_path in urls_map.items():
            try:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                file_key = f"{timestamp}_{filename}"
                logger.info(f"Uploading file to S3: {filename} -> {file_key}")
                
                s3_url = upload_file_to_s3_by_key(file_key, temp_path)
                if not s3_url:
                    raise HTTPException(status_code=500, detail=f"Failed to upload file {filename} to S3")
                
                # 更新 URL 映射
                urls_map[filename] = s3_url
                logger.info(f"File uploaded to S3: {s3_url}")
                
                # 保存到数据库
                doc = generated_document_crud.create_document(
                    db=db,
                    upload_file_name=filename,
                    url=s3_url,
                    user_email=current_user.get("email"),
                )
                logger.info(f"Document saved to database: {filename}")
                
            except Exception as e:
                logger.error(f"Error processing file {filename}: {str(e)}")
                continue  # 继续处理其他文件
        
        # 清理临时文件
        for temp_path in temp_paths:
            try:
                os.remove(temp_path)
                logger.info(f"Removed temp file: {temp_path}")
            except Exception as e:
                logger.error(f"Error cleaning up temp file: {str(e)}")
        try:
            os.rmdir(temp_dir)
            logger.info(f"Removed temp directory: {temp_dir}")
        except Exception as e:
            logger.error(f"Error cleaning up temp directory: {str(e)}")
            
        return {
            "status": "success",
            "document": full_doc,
            "uploaded_files": urls_map
        }

    except Exception as e:
        logger.error(f"Error generating document: {str(e)}")
        # 确保清理临时文件
        for temp_path in temp_paths:
            try:
                os.remove(temp_path)
            except:
                pass
        try:
            os.rmdir(temp_dir)
        except:
            pass
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload_document")
async def upload_document(
    file: UploadFile = File(...),
    document_name: str = Form(...),
    document_type: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    try:
        # 创建临时文件
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{document_type}") as temp_file:
            # 写入上传的文件内容
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # 上传到S3并获取URL
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        original_filename = os.path.basename(temp_file_path)
        s3_key = f"{timestamp}_{original_filename}"
        s3_url = upload_file_to_s3_by_key(s3_key, temp_file_path)
        
        # 删除临时文件
        os.unlink(temp_file_path)
        
        return {"url": s3_url}
        
    except Exception as e:
        logger.error(f"Failed to upload document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.get("/pdf/generate/")
async def generate_pdf_from_content(
    url: str,
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    从内容生成PDF文件并返回
    """
    logger.info(f"Generating PDF for URL: {url}, filename: {filename}")
    try:
        # 下载原始内容
        logger.info("Downloading content from URL...")
        content, content_type = download_file_by_url(url)
        if content is None:
            logger.error("Content not found at URL")
            raise HTTPException(status_code=404, detail="Content not found")
        
        logger.info(f"Content downloaded successfully, content type: {content_type}")

        # 如果content是bytes，尝试解码为字符串
        if isinstance(content, bytes):
            try:
                content = content.decode('utf-8')
                logger.info("Successfully decoded bytes content to UTF-8")
            except UnicodeDecodeError:
                logger.info("Content is binary, returning as is with original content type")
                # 如果是二进制文件，直接返回原始内容
                return FileResponse(
                    io.BytesIO(content),
                    filename=filename,
                    media_type=content_type
                )

        # 创建PDF
        logger.info("Creating PDF from content...")
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # 写入内容
        text_object = c.beginText(40, 750)  # 起始位置
        text_object.setFont("Helvetica", 12)
        
        # 分行处理文本
        for line in content.split('\n'):
            text_object.textLine(line)
        
        c.drawText(text_object)
        c.save()
        
        # 获取PDF内容
        buffer.seek(0)
        logger.info("PDF created successfully")
        
        # 直接返回PDF内容
        return FileResponse(
            buffer,
            filename=filename if filename.endswith('.pdf') else f"{filename}.pdf",
            media_type='application/pdf'
        )
            
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")

@router.post("/download_document", response_model=None)
async def download_document(
    request: Request,
    data: dict = Body(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        content = data.get("content")
        format = data.get("format", "pdf")
        filename = data.get("filename", "document")
        is_base64 = data.get("isBase64", False)
        
        # Close the database session after use
        db.close()
        
        return {"status": "success", "message": "Document processed successfully"}
    except Exception as e:
        # Make sure to close the session even if there's an error
        db.close()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )

@router.get("/document-content/")
async def get_document_content(
    url: str,
    current_user: dict = Depends(get_current_user)
):
    """
    获取文档内容
    """
    try:
        # 下载文件内容
        content, content_type = download_file_by_url(url)
        if content is None:
            raise HTTPException(status_code=404, detail="Document not found")
            
        # 直接返回文件内容和类型
        return Response(
            content=content,
            media_type=content_type
        )
        
    except Exception as e:
        logger.error(f"Error getting document content: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/generated-documents/", response_model=dict)
async def create_generated_document(
    document_name: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),

    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    url=upload_file_to_s3_by_key(file)
    document = generated_document_crud.create(
        db=db,
        user_id=current_user.user_id,
        document_name=document_name,
        document_type=document_type,
        url=url
    )
    return {
        "status": "success",
        "message": "Document created successfully",
        "data": {
            "id": document.id,
            "document_name": document.document_name,
            "document_type": document.document_type,
            "url": document.url,
            "created_at": document.created_at
        }
    }

@router.get("/generated-documents/{document_id}", response_model=dict)
async def get_generated_document(
    document_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = generated_document_crud.get_by_id(db, document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if document.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this document")
    
    return {
        "status": "success",
        "data": {
            "id": document.id,
            "document_name": document.document_name,
            "document_type": document.document_type,
            "url": document.url,
            "created_at": document.created_at,
            "updated_at": document.updated_at
        }
    }

@router.get("/generated-documents/", response_model=dict)
async def list_generated_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 从字典中获取用户ID
        user_id = current_user.get('user_id')  # 改为使用 user_id
        if not user_id:
            logging.error(f"Invalid user data: {current_user}")
            raise HTTPException(status_code=400, detail="Invalid user data: missing user ID")
            
        # 记录用户ID和查询参数
        logging.info(f"Fetching documents for user_id: {user_id}, skip: {skip}, limit: {limit}")
        
        documents = generated_document_crud.get_by_user_id(db, user_id, skip, limit)
        
        # 记录找到的文档数量
        logging.info(f"Found {len(documents)} documents for user_id: {user_id}")
        
        return {
            "status": "success",
            "data": [
                {
                    "id": doc.id,
                    "document_name": doc.document_name,
                    "document_type": doc.document_type,
                    "url": doc.url,
                    "created_at": doc.created_at,
                    "updated_at": doc.updated_at
                }
                for doc in documents
            ]
        }
    except Exception as e:
        logging.error(f"Error in list_generated_documents: {str(e)}")
        logging.error(f"Current user data: {current_user}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching documents: {str(e)}"
        )

@router.put("/generated-documents/{document_id}", response_model=dict)
async def update_generated_document(
    document_id: int,
    document_name: str = Form(None),
    document_type: str = Form(None),
    url: str = Form(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if document exists and belongs to user
    existing_document = generated_document_crud.get_by_id(db, document_id)
    if not existing_document:
        raise HTTPException(status_code=404, detail="Document not found")
    if existing_document.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this document")

    document = generated_document_crud.update(
        db=db,
        document_id=document_id,
        document_name=document_name,
        document_type=document_type,
        url=url
    )
    
    return {
        "status": "success",
        "message": "Document updated successfully",
        "data": {
            "id": document.id,
            "document_name": document.document_name,
            "document_type": document.document_type,
            "url": document.url,
            "updated_at": document.updated_at
        }
    }

@router.delete("/generated-documents/{document_id}", response_model=dict)
async def delete_generated_document(
    document_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if document exists and belongs to user
    existing_document = generated_document_crud.get_by_id(db, document_id)
    if not existing_document:
        raise HTTPException(status_code=404, detail="Document not found")
    if existing_document.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    success = generated_document_crud.delete(db, document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete document")
    
    return {
        "status": "success",
        "message": "Document deleted successfully"
    }
