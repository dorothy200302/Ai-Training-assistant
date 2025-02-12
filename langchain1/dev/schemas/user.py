from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserInDB(UserBase):
    id: int
    hashed_password: str
    is_active: bool = True
    
    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool = True

    class Config:
        from_attributes = True
        alias_generator = None
        populate_by_name = True

class UserRegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    verification_code: str

class EmailVerifyRequest(BaseModel):
    email: str
    verification_code: str