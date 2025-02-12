from typing import List, Optional
from models.models import Documents
from schemas.document import DocumentCreate, DocumentUpdate
from .base import CRUDBase
from datetime import datetime
from sqlalchemy.orm import Session

class DocumentCRUD:
    @staticmethod
    def create_document(db: Session, *, upload_file_name: str, url: str, user_email: str):
        """创建单个文档记录"""
        db_document = Documents(
            upload_file_name=upload_file_name,
            url=url,
            user_email=user_email
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        return db_document

    @staticmethod
    def create_multi(db: Session, documents: List[Documents]) -> bool:
        """批量创建文档记录"""
        try:
            db.add_all(documents)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e

    def get_by_user_email(self, db: Session, user_email: str):
        """Get all documents for a specific user by email"""
        return db.query(Documents).filter(Documents.user_email == user_email).all()

document_crud = DocumentCRUD()