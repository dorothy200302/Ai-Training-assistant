from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from crud import employee_crud
from schemas.employee import (
    EmployeeCreate, 
    EmployeeUpdate, 
    EmployeeResponse,
    PermissionCreate
)
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from core.security import get_current_user
from config.database import get_db
from sqlalchemy import and_
from models.models import Employees, Departments, Roles
import logging
from core.security import get_current_user
from config.database import get_db

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter(
)

def handle_exceptions(func):
    async def wrapper(*args, **kwargs):
        try:
            # 直接传递所有接收到的参数
            return await func(*args, **kwargs)
        except HTTPException as he:
            logger.error(f"HTTP Exception in {func.__name__}: {he.detail}")
            raise he
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal server error: {str(e)}"
            )
    # 保持原函数的签名
    from functools import wraps
    wrapper = wraps(func)(wrapper)
    return wrapper

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

@router.post("/employees", response_model=dict)
@handle_exceptions
async def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        logger.debug(f"Creating employee with email: {employee.email}")
        
        # Validate department and role IDs
        if not validate_department_id(db, employee.department_id):
            raise HTTPException(
                status_code=400,
                detail=f"Department with ID {employee.department_id} does not exist"
            )
            
        if not validate_role_id(db, employee.role_id):
            raise HTTPException(
                status_code=400,
                detail=f"Role with ID {employee.role_id} does not exist"
            )
            
        # Check if leader exists if leader_id is provided
        if employee.leader_id and not validate_employee_id(db, employee.leader_id):
            raise HTTPException(
                status_code=400,
                detail=f"Leader with ID {employee.leader_id} does not exist"
            )
        
        # Check if email already exists
        if db.query(Employees).filter(Employees.email == employee.email).first():
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )
        
        # Create new employee
        db_employee = Employees(
            name=employee.name,
            email=employee.email,
            password_hash=get_password_hash(employee.password),
            leader_id=employee.leader_id,
            department_id=employee.department_id,
            role_id=employee.role_id,
            status="active"  # Default status
        )
        
        db.add(db_employee)
        db.commit()
        db.refresh(db_employee)
        
        # Get department and role names
        result = (
            db.query(
                Employees,
                Departments.name.label('department_name'),
                Roles.name.label('role_name')
            )
            .join(Departments, Employees.department_id == Departments.id)
            .join(Roles, Employees.role_id == Roles.id)
            .filter(Employees.id == db_employee.id)
            .first()
        )
        
        emp, dept_name, role_name = result
        response = {
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "leader_id": emp.leader_id,
            "department_id": emp.department_id,
            "role_id": emp.role_id,
            "status": emp.status,
            "department_name": dept_name,
            "role_name": role_name
        }
        
        logger.info(f"Successfully created employee: {employee.email}")
        return response
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating employee: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while creating employee: {str(e)}"
        )

@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = employee_crud.get(db, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@router.delete("/employees/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_exceptions
async def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        logger.debug(f"Deleting employee with ID: {employee_id}")
        
        # 从数据库获取当前用户的角色
        current_user_record = db.query(
            Employees.id,
            Employees.email,
            Roles.name.label('role_name')
        ).join(
            Roles,
            Employees.role_id == Roles.id
        ).filter(
            Employees.email == current_user["email"]
        ).first()
        
        if not current_user_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Current user not found in database"
            )
            
        logger.debug(f"Current user: {current_user_record.email}, role: {current_user_record.role_name}")
        
        # 检查删除权限
        if current_user_record.role_name not in ["admin", "manager"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"权限不够. Only admin or manager can delete employees. Your role: {current_user_record.role_name}"
            )
        
        # 查找员工
        employee = db.query(
            Employees.id,
            Employees.email,
            Employees.leader_id,
            Employees.name
        ).filter(
            Employees.id == employee_id
        ).first()
        
        if not employee:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found"
            )
            
        logger.debug(f"Target employee: {employee.email}, leader_id: {employee.leader_id}")
            
        # 如果是manager，只能删除自己的下属
        if current_user_record.role_name == "manager":
            # 检查目标员工的leader_id是否等于当前用户的id
            if employee.leader_id != current_user_record.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Managers can only delete their own subordinates. Employee {employee.name} (ID: {employee.id}) does not report to you."
                )
            
        # 检查是否有下属
        has_subordinates = db.query(Employees).filter(Employees.leader_id == employee_id).first()
        if has_subordinates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete employee with subordinates"
            )
            
        # 删除员工
        employee_to_delete = db.query(Employees).filter(Employees.id == employee_id).first()
        db.delete(employee_to_delete)
        db.commit()
        
        logger.info(f"Successfully deleted employee with ID: {employee_id}")
        return None
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting employee: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete employee: {str(e)}"
        )

@router.put("/employees/{employee_id}", response_model=dict)
@handle_exceptions
async def update_employee(
    employee_id: int,
    employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        # 查找要更新的员工
        db_employee = db.query(Employees).filter(Employees.id == employee_id).first()
        if not db_employee:
            raise HTTPException(status_code=404, detail="Employee not found")

        # 更新员工信息
        update_data = employee.dict(exclude_unset=True)
        for key, value in update_data.items():
            if hasattr(db_employee, key):
                setattr(db_employee, key, value)

        try:
            db.commit()
            db.refresh(db_employee)
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail=f"Database error while updating employee: {str(e)}"
            )

        # 获取更新后的员工信息，包括部门和角色名称
        result = (
            db.query(
                Employees,
                Departments.name.label('department_name'),
                Roles.name.label('role_name')
            )
            .join(Departments, Employees.department_id == Departments.id)
            .join(Roles, Employees.role_id == Roles.id)
            .filter(Employees.id == employee_id)
            .first()
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Updated employee not found"
            )

        emp, dept_name, role_name = result
        response = {
            "id": emp.id,
            "name": emp.name,
            "email": emp.email,
            "leader_id": emp.leader_id,
            "department_id": emp.department_id,
            "role_id": emp.role_id,
            "status": emp.status,
            "department_name": dept_name,
            "role_name": role_name
        }
        
        return response
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating employee: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while updating employee: {str(e)}"
        )

@router.get("/employees/{leader_id}/subordinates", response_model=List[dict])
@handle_exceptions
async def get_subordinates(
    leader_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        logger.debug(f"Fetching subordinates for leader_id: {leader_id}")
        
        # Validate leader exists
        leader = db.query(Employees).filter(Employees.id == leader_id).first()
        if not leader:
            raise HTTPException(
                status_code=404,
                detail=f"Leader with ID {leader_id} not found"
            )
        
        # Get subordinates with department and role information
        subordinates = (
            db.query(
                Employees,
                Departments.name.label('department_name'),
                Roles.name.label('role_name')
            )
            .join(Departments, Employees.department_id == Departments.id)
            .join(Roles, Employees.role_id == Roles.id)
            .filter(Employees.leader_id == leader_id)
            .all()
        )
        
        logger.info(f"Found {len(subordinates)} subordinates for leader {leader_id}")
        
        # Format response
        result = []
        for emp, dept_name, role_name in subordinates:
            emp_dict = {
                "id": emp.id,
                "name": emp.name,
                "email": emp.email,
                "leader_id": emp.leader_id,
                "department_id": emp.department_id,
                "role_id": emp.role_id,
                "status": emp.status,
                "department_name": dept_name,
                "role_name": role_name
            }
            result.append(emp_dict)
        
        return result
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error fetching subordinates: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while fetching subordinates: {str(e)}"
        )

@router.post("/employees/{employee_id}/permissions")
async def add_permission(
    employee_id: int,
    permission: PermissionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 检查权限管理权限
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return employee_crud.add_permission(db, employee_id, permission.dict())

@router.delete("/employees/{employee_id}/permissions/{permission_id}")
async def remove_permission(
    employee_id: int,
    permission_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # 检查权限管理权限
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    if employee_crud.remove_permission(db, employee_id, permission_id):
        return {"message": "Permission removed successfully"}
    raise HTTPException(status_code=404, detail="Permission not found")

@router.get("/employees/{employee_id}/leader", response_model=EmployeeResponse)
async def get_leader(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    employee = employee_crud.get(db, employee_id)
    if employee and employee.leader_id:
        leader = employee_crud.get(db, employee.leader_id)
        if not leader:
            raise HTTPException(status_code=404, detail="Leader not found")
        return leader
    raise HTTPException(status_code=404, detail="No leader assigned")

@router.get("/columns")
@handle_exceptions
async def get_columns(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get employee table column definitions"""
    return {
        "columns": [
            {
                "id": "name",
                "label": "员工",
                "type": "string",
                "sortable": True
            },
            {
                "id": "email",
                "label": "邮箱",
                "type": "string",
                "sortable": True
            },
            {
                "id": "role",
                "label": "角色",
                "type": "string",
                "sortable": True,
                "options": [role.name for role in db.query(Roles).all()]
            },
            {
                "id": "department",
                "label": "部门",
                "type": "string",
                "sortable": True,
                "options": [dept.name for dept in db.query(Departments).all()]
            },
            {
                "id": "status",
                "label": "状态",
                "type": "string",
                "sortable": True,
                "options": ["已授权", "未授权"]
            }
        ]
    }

@router.get("/departments", response_model=List[dict])
@handle_exceptions
async def get_departments(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取所有部门列表"""
    try:
        departments = db.query(Departments).all()
        return [{"id": dept.id, "name": dept.name} for dept in departments]
    except Exception as e:
        logger.error(f"Error fetching departments: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch departments: {str(e)}"
        )

@router.get("/roles", response_model=List[dict])
@handle_exceptions
async def get_roles(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """获取所有角色列表"""
    try:
        roles = db.query(Roles).all()
        return [{"id": role.id, "name": role.name} for role in roles]
    except Exception as e:
        logger.error(f"Error fetching roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch roles: {str(e)}"
        )

def validate_department_id(db: Session, department_id: int) -> bool:
    """Validate that a department ID exists"""
    from models.models import Departments
    return db.query(Departments).filter(Departments.id == department_id).first() is not None

def validate_role_id(db: Session, role_id: int) -> bool:
    """Validate that a role ID exists"""
    from models.models import Roles
    return db.query(Roles).filter(Roles.id == role_id).first() is not None

def validate_employee_id(db: Session, employee_id: int) -> bool:
    """Validate that an employee ID exists"""
    return db.query(Employees).filter(Employees.id == employee_id).first() is not None
