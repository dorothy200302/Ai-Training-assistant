from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class EmployeeBase(BaseModel):
    name: str
    email: EmailStr
    leader_id: Optional[int] = None
    department_id: int
    role_id: int
    status: str
    
    class Config:
        from_attributes = True

class EmployeeDelete(BaseModel):
    id: int 
    

class EmployeeCreate(BaseModel):
    name: str
    email: str
    password: str
    leader_id: Optional[int] = None
    department_id: int
    role_id: int
    status: str = "active"

    class Config:
        from_attributes = True
        populate_by_name = True

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    leader_id: Optional[int] = None
    department_id: Optional[int] = None
    role_id: Optional[int] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True

class EmployeeResponse(BaseModel):
    pass

class PermissionCreate(BaseModel):
    role: str
    resource: str
    access_level: str