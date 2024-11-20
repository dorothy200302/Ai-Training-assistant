from typing import Optional, List
from sqlalchemy.orm import Session
from dev.models.models import Employees, Permissions
from dev.crud.crud_base import CRUDBase
from dev.core.security import Security

class CRUDEmployee(CRUDBase[Employees]):
    def get_by_email(self, db: Session, email: str) -> Optional[Employees]:
        return db.query(Employees).filter(Employees.email == email).first()
    
    def get_subordinates(self, db: Session, leader_id: int) -> List[Employees]:
        return db.query(Employees).filter(Employees.leader_id == leader_id).all()
    
    def get_leader(self, db: Session, employee_id: int) -> Optional[Employees]:
        employee = self.get(db, employee_id)
        if employee and employee.leader_id:
            return self.get(db, employee.leader_id)
        return None
    
    def create_employee(self, db: Session, employee_data: dict) -> Employees:
        # Hash the password before storing
        if "password" in employee_data:
            employee_data["password_hash"] = Security.get_password_hash(employee_data.pop("password"))
        return super().create(db, employee_data)
    
    def update_employee(self, db: Session, employee_id: int, employee_data: dict) -> Optional[Employees]:
        # Hash the password if it's being updated
        if "password" in employee_data:
            employee_data["password_hash"] = Security.get_password_hash(employee_data.pop("password"))
        return super().update(db, employee_id, employee_data)
    
    def get_employee_permissions(self, db: Session, employee_id: int) -> List[Permissions]:
        employee = self.get(db, employee_id)
        if employee:
            return employee.permissions
        return []
    
    def add_permission(self, db: Session, employee_id: int, permission_data: dict) -> Permissions:
        employee = self.get(db, employee_id)
        if not employee:
            return None
            
        permission = Permissions(**permission_data, user_id=employee_id)
        db.add(permission)
        db.commit()
        db.refresh(permission)
        return permission
    
    def remove_permission(self, db: Session, employee_id: int, permission_id: int) -> bool:
        permission = db.query(Permissions).filter(
            Permissions.permission_id == permission_id,
            Permissions.user_id == employee_id
        ).first()
        
        if permission:
            db.delete(permission)
            db.commit()
            return True
        return False
    
    def authenticate_employee(self, db: Session, email: str, password: str) -> Optional[Employees]:
        employee = self.get_by_email(db, email)
        if not employee:
            return None
        if not Security.verify_password(password, employee.password_hash):
            return None
        return employee

employee_crud = CRUDEmployee(Employees) 