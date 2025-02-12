from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models.models import DocumentAccess, Users, Documents, PermissionLevel
from fastapi import HTTPException

class PermissionService:
    def __init__(self, db: Session):
        self.db = db

    def grant_access(self,
        document_id: str,
        user_id: int,
        granted_by: int,
        permission_level: PermissionLevel,
        expires_in_days: Optional[int] = None
    ) -> DocumentAccess:
        """授予用户文档访问权限"""
        try:
            # 检查文档是否存在
            document = self.db.query(Documents).filter(Documents.doc_id == document_id).first()
            if not document:
                raise HTTPException(status_code=404, detail="Document not found")

            # 检查用户是否存在
            user = self.db.query(Users).filter(Users.user_id == user_id).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # 检查授权人是否有权限
            grantor = self.db.query(Users).filter(Users.user_id == granted_by).first()
            if not grantor:
                raise HTTPException(status_code=404, detail="Grantor not found")

            # 计算过期时间
            expires_at = None
            if expires_in_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

            # 创建或更新访问权限
            access = DocumentAccess(
                document_id=document_id,
                user_id=user_id,
                permission_level=permission_level,
                granted_by=granted_by,
                expires_at=expires_at
            )

            self.db.add(access)
            self.db.commit()
            self.db.refresh(access)

            return access

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def revoke_access(self, document_id: str, user_id: int):
        """撤销用户的文档访问权限"""
        try:
            access = self.db.query(DocumentAccess)\
                .filter(
                    DocumentAccess.document_id == document_id,
                    DocumentAccess.user_id == user_id
                ).first()

            if not access:
                raise HTTPException(status_code=404, detail="Access record not found")

            self.db.delete(access)
            self.db.commit()

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def check_permission(self,
        document_id: str,
        user_id: int,
        required_level: PermissionLevel
    ) -> bool:
        """检查用户是否有指定的访问权限"""
        try:
            access = self.db.query(DocumentAccess)\
                .filter(
                    DocumentAccess.document_id == document_id,
                    DocumentAccess.user_id == user_id
                ).first()

            if not access:
                return False

            # 检查是否过期
            if access.expires_at and access.expires_at < datetime.utcnow():
                return False

            # 检查权限级别
            permission_levels = {
                PermissionLevel.READ: 1,
                PermissionLevel.WRITE: 2,
                PermissionLevel.ADMIN: 3
            }

            return permission_levels[access.permission_level] >= permission_levels[required_level]

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_user_permissions(self, user_id: int) -> List[DocumentAccess]:
        """获取用户的所有文档访问权限"""
        try:
            return self.db.query(DocumentAccess)\
                .filter(DocumentAccess.user_id == user_id)\
                .all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_document_permissions(self, document_id: str) -> List[DocumentAccess]:
        """获取文档的所有访问权限记录"""
        try:
            return self.db.query(DocumentAccess)\
                .filter(DocumentAccess.document_id == document_id)\
                .all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))