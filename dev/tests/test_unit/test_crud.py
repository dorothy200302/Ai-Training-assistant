import pytest
from sqlalchemy.orm import Session
from dev.crud.crud_user import user_crud
from dev.crud.crud_document import document_crud
from dev.schemas.user import UserCreate
from dev.schemas.document import DocumentCreate

def test_create_user(db: Session):
    user_in = UserCreate(
        email="test@example.com",
        password="testpassword",
        full_name="Test User"
    )
    user = user_crud.create(db, obj_in=user_in)
    assert user.email == "test@example.com"
    assert hasattr(user, "hashed_password")

def test_create_document(db: Session):
    doc_in = DocumentCreate(
        title="测试文档",
        content="测试内容",
        user_id=1
    )
    doc = document_crud.create(db, obj_in=doc_in)
    assert doc.title == "测试文档" 