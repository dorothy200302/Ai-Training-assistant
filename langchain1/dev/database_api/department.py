from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from models.models import Departments, Roles
from config.database import get_db
from auth.auth import get_current_user
from pydantic import BaseModel
from datetime import datetime
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Pydantic models
class DepartmentBase(BaseModel):
    name: str
    description: str = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    updated_at: datetime = None

    class Config:
        from_attributes = True

class RoleBase(BaseModel):
    name: str
    description: str = None

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    updated_at: datetime = None

    class Config:
        from_attributes = True

# Create router
router = APIRouter()

# Department endpoints
@router.post("/departments", response_model=DepartmentResponse)
async def create_department(
    department: DepartmentCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Check if department with same name exists
        if db.query(Departments).filter(Departments.name == department.name).first():
            raise HTTPException(
                status_code=400,
                detail="Department with this name already exists"
            )
        
        # Create new department
        db_department = Departments(
            name=department.name,
            description=department.description
        )
        
        db.add(db_department)
        db.commit()
        db.refresh(db_department)
        
        logger.info(f"Successfully created department: {department.name}")
        return db_department
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating department: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while creating department: {str(e)}"
        )

@router.get("/departments", response_model=List[DepartmentResponse])
async def get_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    departments = db.query(Departments).all()
    return departments

@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(
    department_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    department = db.query(Departments).filter(Departments.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )
    return department

# Role endpoints
@router.post("/roles", response_model=RoleResponse)
async def create_role(
    role: RoleCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # Check if role with same name exists
        if db.query(Roles).filter(Roles.name == role.name).first():
            raise HTTPException(
                status_code=400,
                detail="Role with this name already exists"
            )
        
        # Create new role
        db_role = Roles(
            name=role.name,
            description=role.description
        )
        
        db.add(db_role)
        db.commit()
        db.refresh(db_role)
        
        logger.info(f"Successfully created role: {role.name}")
        return db_role
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating role: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while creating role: {str(e)}"
        )

@router.get("/roles", response_model=List[RoleResponse])
async def get_roles(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    roles = db.query(Roles).all()
    return roles

@router.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    role = db.query(Roles).filter(Roles.id == role_id).first()
    if not role:
        raise HTTPException(
            status_code=404,
            detail="Role not found"
        )
    return role
