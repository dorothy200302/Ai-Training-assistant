from sqlalchemy.orm import Session
from models.generated_document import GeneratedDocument
from typing import List, Optional
from datetime import datetime
from fastapi.encoders import jsonable_encoder

class CRUDGeneratedDocument:
    def create(self, db: Session, *, user_id: int, document_name: str, document_type: str, url: str) -> GeneratedDocument:
        db_document = GeneratedDocument(
            user_id=user_id,
            document_name=document_name,
            document_type=document_type,
            url=url
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        return db_document

    def get_by_id(self, db: Session, document_id: int) -> Optional[GeneratedDocument]:
        return db.query(GeneratedDocument).filter(GeneratedDocument.id == document_id).first()

    def get_by_user_id(self, db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[GeneratedDocument]:
        return db.query(GeneratedDocument)\
            .filter(GeneratedDocument.user_id == user_id)\
            .offset(skip)\
            .limit(limit)\
            .all()

    def update(self, db: Session, *, document_id: int, document_name: str = None, document_type: str = None, url: str = None) -> Optional[GeneratedDocument]:
        db_document = self.get_by_id(db, document_id)
        if not db_document:
            return None
            
        update_data = {}
        if document_name is not None:
            update_data["document_name"] = document_name
        if document_type is not None:
            update_data["document_type"] = document_type
        if url is not None:
            update_data["url"] = url
            
        if update_data:
            for field, value in update_data.items():
                setattr(db_document, field, value)
            db.commit()
            db.refresh(db_document)
        return db_document

    def delete(self, db: Session, document_id: int) -> bool:
        db_document = self.get_by_id(db, document_id)
        if not db_document:
            return False
        db.delete(db_document)
        db.commit()
        return True

generated_document_crud = CRUDGeneratedDocument()
