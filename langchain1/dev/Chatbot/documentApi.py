from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime
from dev.core.security import get_current_user
from dev.config.database import get_db

router = APIRouter(
    prefix="/documents",
    tags=["documents"]
)

class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str
    type: str
    status: str
    created_at: datetime
    user_email: str
    category: str = "工作报告"  # 默认分类

@router.get("")
async def get_user_documents(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # 查询用户生成的所有文档
        query = """
            SELECT 
                g.id,
                g.title,
                g.content,
                g.document_type as type,
                g.status,
                g.created_at,
                g.user_email,
                COALESCE(g.category, '工作报告') as category
            FROM generated_documents g
            WHERE g.user_email = :user_email
            ORDER BY g.created_at DESC
        """
        
        results = db.execute(query, {"user_email": current_user.email})
        
        documents = []
        for row in results:
            doc = {
                "id": row.id,
                "title": row.title,
                "content": row.content,
                "type": row.type,
                "status": row.status,
                "date": row.created_at.strftime("%Y-%m-%d %H:%M"),
                "category": row.category,
                "thumbnail": f"/thumbnails/{row.type.lower()}.png"  # 根据文档类型显示对应缩略图
            }
            documents.append(doc)
            
        return documents
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{document_id}")
async def get_document(
    document_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        query = """
            SELECT 
                g.id,
                g.title,
                g.content,
                g.document_type as type,
                g.status,
                g.created_at,
                g.user_email,
                COALESCE(g.category, '工作报告') as category
            FROM generated_documents g
            WHERE g.id = :document_id AND g.user_email = :user_email
        """
        
        result = db.execute(
            query, 
            {"document_id": document_id, "user_email": current_user.email}
        ).first()
        
        if not result:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return {
            "id": result.id,
            "title": result.title,
            "content": result.content,
            "type": result.type,
            "status": result.status,
            "date": result.created_at.strftime("%Y-%m-%d %H:%M"),
            "category": result.category
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 