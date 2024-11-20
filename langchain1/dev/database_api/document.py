from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from dev.models.models import Documents
from dev.schemas.document import DocumentCreate, DocumentResponse, UrlsMapDTO
from datetime import datetime
from dev.crud.crud_document import document_crud
from dev.core.security import get_current_user
from dev.database import get_db

router = APIRouter(
    prefix="/documents",
    tags=["documents"]
)

@router.post("/", response_model=DocumentResponse)
def create_document(
    document: DocumentCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """创建单个文档记录"""
    try:
        return document_crud.create(db=db, obj_in=document)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create document: {str(e)}"
        )

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取单个文档信息"""
    document = document_crud.get(db=db, id=document_id)
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    return document

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取文档列表"""
    return document_crud.get_multi(db=db, skip=skip, limit=limit)

@router.post("/save-urls-map", response_model=bool)
def add_documents(dto: UrlsMapDTO,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """批量保存文档URL映射"""
    if not dto.urls_map:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid request data"
        )
    
    try:
        # 获取用户邮箱
        user_email = dto.email
        
        for filename, url in dto.urls_map.items():
            document_crud.create_document(
                db=db,
                upload_file_name=filename,
                url=url,
                user_email=user_email
            )
        
        return True
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add documents: {str(e)}"
        )

@router.post("/save-generated", response_model=DocumentResponse)
def save_generated_document(
    document: DocumentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Save a generated document with its content and metadata"""
    try:
        # Add timestamp and user information
        document.created_at = datetime.now()
        document.user_id = current_user.id
        
        return document_crud.create(db=db, obj_in=document)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save generated document: {str(e)}"
        )