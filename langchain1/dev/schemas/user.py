from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    username: str

class UserLogin(UserBase):
    password: str

class UserInDB(UserBase):
    id: int
    hashed_password: str
    is_active: bool = True
    
    class Config:
        from_attributes = True

class User(UserBase):
    id: int
    is_active: bool
    
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
    email: str
    password: str
    username: str
    verification_code: str

class EmailVerifyRequest(BaseModel):
    email: str
    verification_code: str