from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Depends, Body, Response, Request
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import asyncio
import tempfile
import uuid
import json
import logging
import re
import shutil
import boto3
from botocore.exceptions import ClientError
from datetime import datetime
from docx import Document
from docx.shared import Inches
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

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

# Import from project root
from dev.models.models import Users as User
from dev.database import get_db
from dev.core.security import get_current_user
from dev.crud.crud_generated_document import generated_document_crud
from dev.CloudStorage.aws import upload_file_to_s3_by_key
from dev.Generate.AsyncTrainingDocGenerator import AsyncTrainingDocGenerator
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse
import mimetypes
from pathlib import Path

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
    description: str = Form(...),
    current_user: dict = Depends(get_current_user),  # Explicitly type as dict
    ai_model: str = Form("gpt-4o-mini", description="AI model to use"),
    db: Session = Depends(get_db),
    requirements: Optional[str] = Form(None),  # 使用 Optional 类型
):
    logger.info("Received generate_outline_and_upload request")
    logger.info(f"Files received: {[f.filename for f in files]}")
    logger.info(f"Description: {description}")
    logger.info(f"Current user data: {current_user}")  # Log the entire user data
    
    if not isinstance(current_user, dict):
        logger.error(f"current_user is not a dict: {type(current_user)}")
        raise HTTPException(status_code=500, detail="Invalid user data format")
        
    user_email = current_user.get('email')
    print(user_email)
    if not user_email:
        logger.error(f"No email found in current_user data: {current_user}")
        raise HTTPException(status_code=500, detail="User email not found")
    
    logger.info(f"User email: {user_email}")
    
    try:
        logger.info("Received generate_outline_and_upload request")
        logger.debug(f"Requrements: {requirements}")
        logger.debug(f"Number of files: {len(files)}")
        logger.debug(f"AI Model: {ai_model}")
        logger.debug(f"Description: {description}")
        
        if not files:
            logger.error("No files provided")
            raise HTTPException(status_code=400, detail="No files provided")
            
        temp_paths = []
        urls_map = {}

        try:
            temp_dir = tempfile.mkdtemp()  # Use system temp directory
            logger.debug(f"Created temporary directory: {temp_dir}")
            
            # Save uploaded files to temp directory
            for file in files:
                try:
                    file_ext = os.path.splitext(file.filename)[1]
                    if not file_ext:
                        logger.error(f"File {file.filename} has no extension")
                        raise HTTPException(status_code=400, detail=f"File {file.filename} has no extension")
                        
                    safe_filename = f"{str(uuid.uuid4())}{file_ext}"
                    temp_path = os.path.join(temp_dir, safe_filename)
                    logger.debug(f"Processing file: {file.filename} -> {temp_path}")
                    
                    content = await file.read()
                    if not content:
                        logger.error(f"File {file.filename} is empty")
                        raise HTTPException(status_code=400, detail=f"File {file.filename} is empty")
                        
                    with open(temp_path, 'wb') as out_file:
                        out_file.write(content)
                    temp_paths.append(temp_path)
                    logger.info(f"Successfully saved file: {file.filename}")
                    
                except Exception as e:
                    logger.error(f"Error processing file {file.filename}: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error processing file {file.filename}: {str(e)}")

            try:
                doc_generator = AsyncTrainingDocGenerator(
                    file_paths=temp_paths,
                    model_name=ai_model,
                    background_informations=description,
                    user_email=user_email
                )
                logger.info("Successfully initialized AsyncTrainingDocGenerator")
                
            except Exception as e:
                logger.error(f"Error initializing doc generator: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error initializing document generator: {str(e)}")

            try:
                outline = await doc_generator.generate_training_outline(requirements)
                if not outline:
                    logger.error("Generated outline is empty")
                    raise HTTPException(status_code=500, detail="Generated outline is empty")
                logger.info("Successfully generated outline")
                
            except Exception as e:
                logger.error(f"Error generating outline: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error generating outline: {str(e)}")

            # Upload files to S3 and get URLs
            for temp_path in temp_paths:
                try:
                    file_type = os.path.splitext(temp_path)[1][1:]  # Remove the dot
                    url = await upload_to_s3(temp_path, file_type)
                    urls_map[os.path.basename(temp_path)] = url
                    logger.info(f"Successfully uploaded file to S3: {temp_path}")
                    
                except Exception as e:
                    logger.error(f"Error uploading to S3: {str(e)}")
                    raise HTTPException(status_code=500, detail=f"Error uploading to S3: {str(e)}")

            return {
                "outline": outline,
                "urls": urls_map
            }

        except Exception as e:
            logger.error(f"Unexpected error in generate_outline_and_upload: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
            
        finally:
            # Clean up temp files
            for temp_path in temp_paths:
                try:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                        logger.debug(f"Removed temp file: {temp_path}")
                except Exception as e:
                    logger.error(f"Error removing temp file {temp_path}: {str(e)}")
                
            try:
                if os.path.exists(temp_dir):
                    os.rmdir(temp_dir)
                    logger.debug(f"Removed temp directory: {temp_dir}")
            except Exception as e:
                logger.error(f"Error removing temp directory {temp_dir}: {str(e)}")

    except Exception as e:
        logger.error(f"Error in generate_outline_and_upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Parse the generated document into sections
        sections = []
        current_section = None
        current_subsection = None
        
        # Split the document into lines and process each line
        lines = full_doc.split('\n')
        content_buffer = []
        
        for line in lines:
            # Check for main section headers (marked with ### or ####)
            if line.startswith('### ') or line.startswith('#### '):
                # If we have a previous section, save it
                if current_section:
                    if content_buffer:
                        current_section['content'] = '\n'.join(content_buffer)
                    sections.append(current_section)
                    content_buffer = []
                
                # Create new section
                current_section = {
                    'title': line.replace('### ', '').replace('#### ', '').strip(),
                    'content': '',
                    'subsections': []
                }
                
            # Check for subsection headers (marked with numbers or bullets)
            elif line.strip() and (line[0].isdigit() or line.strip().startswith('-') or line.strip().startswith('*')):
                if current_subsection and content_buffer:
                    current_subsection['content'] = '\n'.join(content_buffer)
                    current_section['subsections'].append(current_subsection)
                    content_buffer = []
                
                current_subsection = {
                    'title': line.strip(),
                    'content': ''
                }
                
            # Regular content lines
            elif line.strip():
                content_buffer.append(line)
                
            # Empty lines mark the end of a content block
            elif content_buffer:
                if current_subsection:
                    current_subsection['content'] = '\n'.join(content_buffer)
                    current_section['subsections'].append(current_subsection)
                    current_subsection = None
                elif current_section:
                    current_section['content'] = '\n'.join(content_buffer)
                content_buffer = []
        
        # Add the last section if it exists
        if current_section:
            if content_buffer:
                if current_subsection:
                    current_subsection['content'] = '\n'.join(content_buffer)
                    current_section['subsections'].append(current_subsection)
                else:
                    current_section['content'] = '\n'.join(content_buffer)
            sections.append(current_section)
        
        # Create the response in the format expected by the frontend
        response_content = {
            'title': description_dict.get('project_title', '培训大纲'),
            'overview': description_dict.get('project_theme', ''),
            'sections': sections
        }
        
        return response_content
    
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

@router.post("/generate_full_doc_with_template/")
async def generate_full_doc_with_template(
    template: str = Form(...),
    description: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),  # Explicitly type as dict
    ai_model: str = Form("gpt-4o-mini", description="AI model to use"),
    db: Session = Depends(get_db)
):
    """Generate a full document based on a template"""
    logger.info("Starting document generation with template")
    logger.info(f"Template: {template}")
    logger.info(f"Description: {description}")
    logger.info(f"Number of files: {len(files)}")
    logger.info(f"Current user data: {current_user}")  # Log the entire user data
    
    # Validate current_user
    if not isinstance(current_user, dict):
        logger.error(f"current_user is not a dict: {type(current_user)}")
        raise HTTPException(status_code=500, detail="Invalid user data format")
        
    user_email = current_user.get('email')
    if not user_email:
        logger.error(f"No email found in current_user data: {current_user}")
        raise HTTPException(status_code=500, detail="User email not found in authentication token")
    
    logger.info(f"User email: {user_email}")
    
    try:
        # 创建临时文件并保存上传的文件
        if not files or len(files) == 0:
            raise HTTPException(status_code=400, detail="No files uploaded")
            
        temp_paths = []
        urls_map = {}
        
        # 保存上传的文件到临时目录
        temp_dir = tempfile.mkdtemp()
        logger.info(f"Created temp directory: {temp_dir}")
        
        for file in files:
            try:
                file_ext = os.path.splitext(file.filename)[1]
                safe_filename = f"{str(uuid.uuid4())}{file_ext}"
                temp_path = os.path.join(temp_dir, safe_filename)
                logger.info(f"Processing file {file.filename} -> {temp_path}")
                
                content = await file.read()
                with open(temp_path, 'wb') as out_file:
                    out_file.write(content)
                
                temp_paths.append(temp_path)
                urls_map[file.filename] = temp_path
                logger.info(f"Successfully saved file: {file.filename}")
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error processing file {file.filename}: {str(e)}")

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
            
        generator = AsyncTrainingDocGenerator(
            file_paths=temp_paths,
            model_name=ai_model,
            background_informations=description_dict,
            user_email=user_email
        )
        logger.info("Document generator initialized successfully")
        
        # 生成完整文档
        logger.info("Starting full document generation")
        full_doc = await generator.generate_fulldoc_with_template(template=template)
        logger.info("Document generation completed")
        
        # 上传文件到 S3 并保存到数据库
        for filename, temp_path in urls_map.items():
            try:
                file_ext = os.path.splitext(filename)[1]
                safe_key = f"{str(uuid.uuid4())}{file_ext}"
                logger.info(f"Uploading file to S3: {filename} -> {safe_key}")
                
                s3_url = upload_file_to_s3_by_key(safe_key, temp_path)
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
        s3_url = upload_file_to_s3_by_key(temp_file_path, document_type)
        
        # 删除临时文件
        os.unlink(temp_file_path)
        
        return {"url": s3_url}
        
    except Exception as e:
        logger.error(f"Failed to upload document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.post("/download_document", response_model=None)
async def download_document(
    request: Request,
    data: dict = Body(...),

    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        content = data.get("content")
        format = data.get("format", "pdf")
        filename = data.get("filename", "document")
        is_base64 = data.get("isBase64", False)
        
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        temp_file_path = os.path.join(temp_dir, f"{filename}.{format}")
        
        try:
            # 如果内容是base64编码的
            if is_base64:
                import base64
                # 解码base64内容并写入文件
                with open(temp_file_path, "wb") as f:
                    f.write(base64.b64decode(content))
            else:
                # 处理普通文本内容
                with open(temp_file_path, "w", encoding="utf-8") as f:
                    f.write(content)
            
            # 上传到S3并获取URL
            file_key = f"{filename}.{format}"
            s3_url = upload_file_to_s3_by_key(file_key, temp_file_path)
            if s3_url == "error":
                raise HTTPException(status_code=500, detail="Failed to upload to S3")
                
            # 保存文档信息到数据库
            try:
                document = generated_document_crud.create(
                    db=db,
                    obj_in={
                        "document_name": data.get("filename", "Generated Document"),
                        "document_type": format,
                        "url": s3_url,
                        "user_id": current_user.id
                    }
                )
                return {
                    "url": s3_url,
                    "document_id": document.id
                }
            except Exception as e:
                logger.error(f"Error saving document to database: {str(e)}")
                return {"url": s3_url}
            
        finally:
            # 清理临时文件
            try:
                os.unlink(temp_file_path)
                os.rmdir(temp_dir)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Error in download_document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
@router.post("/generated-documents/", response_model=dict)
async def create_generated_document(
    document_name: str = Form(...),
    document_type: str = Form(...),
    url: str = Form(...),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = generated_document_crud.create(
        db=db,
        user_id=current_user.id,
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
    if document.user_id != current_user.id:
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
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    documents = generated_document_crud.get_by_user_id(db, current_user.id, skip, limit)
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
    if existing_document.user_id != current_user.id:
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
    if existing_document.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this document")

    success = generated_document_crud.delete(db, document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete document")
    
    return {
        "status": "success",
        "message": "Document deleted successfully"
    }
