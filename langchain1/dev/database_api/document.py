from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from models.models import Documents
from schemas.document import DocumentCreate, DocumentResponse, UrlsMapDTO
from datetime import datetime
from crud.crud_document import document_crud
from core.security import get_current_user
from database import get_db

router = APIRouter(
    prefix="/documents",
    tags=["documents"]
)

@router.post("/{document_id}/permissions")
async def grant_document_access(
    document_id: str,
    user_id: int,
    permission_level: PermissionLevel,
    expires_in_days: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """授予文档访问权限"""
    permission_service = PermissionService(db)
    return permission_service.grant_access(
        document_id=document_id,
        user_id=user_id,
        granted_by=current_user['user_id'],
        permission_level=permission_level,
        expires_in_days=expires_in_days
    )

@router.delete("/{document_id}/permissions/{user_id}")
async def revoke_document_access(
    document_id: str,
    user_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """撤销文档访问权限"""
    permission_service = PermissionService(db)
    return permission_service.revoke_access(
        document_id=document_id,
        user_id=user_id
    )

@router.post("/{document_id}/progress")
async def update_learning_progress(
    document_id: str,
    current_section: str,
    progress_percentage: float,
    completed: bool = False,
    quiz_scores: Optional[Dict] = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新学习进度"""
    progress_service = ProgressService(db)
    return progress_service.update_progress(
        user_id=current_user['user_id'],
        document_id=document_id,
        current_section=current_section,
        progress_percentage=progress_percentage,
        completed=completed,
        quiz_scores=quiz_scores
    )

@router.get("/{document_id}/progress")
async def get_document_progress(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文档学习进度"""
    progress_service = ProgressService(db)
    return progress_service.get_document_progress(document_id)

@router.get("/team/progress")
async def get_team_progress(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取团队学习进度"""
    progress_service = ProgressService(db)
    return progress_service.get_team_progress(current_user['user_id'])

@router.get("/{document_id}/statistics")
async def get_document_statistics(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取文档统计数据"""
    # 获取访问统计
    access_log_service = AccessLogService(db)
    access_stats = access_log_service.get_access_statistics(document_id)
    
    # 获取测验统计
    progress_service = ProgressService(db)
    quiz_stats = progress_service.get_quiz_statistics(document_id)
    
    return {
        "access_statistics": access_stats,
        "quiz_statistics": quiz_stats
    }
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
        document.user_id = current_user.user_id
        
        return document_crud.create(db=db, obj_in=document)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to save generated document: {str(e)}"
        )