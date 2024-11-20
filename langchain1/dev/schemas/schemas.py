from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str
    department: Optional[str] = None
    company_id: Optional[int] = None
    privilege: Optional[int] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    user_id: int
    created_at: datetime
    role: str

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    upload_file_name: str
    url: str
    user_email: EmailStr

class DocumentCreate(DocumentBase):
    pass

class DocumentResponse(DocumentBase):
    document_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class UrlsMapDTO(BaseModel):
    email: EmailStr
    urls_map: Dict[str, str]