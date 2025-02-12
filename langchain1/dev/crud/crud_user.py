import logging
import traceback
from typing import Optional
from sqlalchemy.orm import Session
from core.password import get_password_hash, verify_password
from fastapi import HTTPException, status
from models.models import Users
from schemas.user import UserCreate, UserUpdate, UserRegisterRequest
from .base import CRUDBase
import datetime

# 配置日志
logger = logging.getLogger(__name__)

class CRUDUser(CRUDBase[Users, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, email: str) -> Optional[Users]:
        """根据邮箱获取用户"""
        try:
            return db.query(Users).filter(Users.email == email).first()
        except Exception as e:
            logger.error(f"Error getting user by email: {str(e)}")
            logger.error(traceback.format_exc())
            return None
    
    def create_user(self, db: Session, user_data):
        try:
            logger.info(f"Creating user with data: {user_data}")
            hashed_password = get_password_hash(user_data.password)
            
            # 创建用户数据字典
            user_dict = {
                "email": user_data.email,
                "username": user_data.username,
                "password": hashed_password,
                "role": "user",
                "created_at": datetime.datetime.now(),
                "updated_at": datetime.datetime.now(),
                "company_id": None,
                "department": None,
                "privilege": 0
            }
            
            logger.info(f"User dict created: {user_dict}")
            
            # 创建用户对象
            db_user = Users(**user_dict)
            
            db.add(db_user)
            try:
                db.commit()
                db.refresh(db_user)
                logger.info(f"User created successfully: {db_user.user_id}")
                return db_user
            except Exception as e:
                db.rollback()
                logger.error(f"Database commit error: {str(e)}")
                logger.error(traceback.format_exc())
                raise Exception(f"Database commit error: {str(e)}")
        except Exception as e:
            logger.error(f"User creation error: {str(e)}")
            logger.error(traceback.format_exc())
            raise Exception(f"User creation error: {str(e)}")
    
    def authenticate_user(self, db: Session, email: str, password: str) -> Optional[Users]:
        user = self.get_by_email(db, email)
        if not user:
            return None
        if not verify_password(password, user.password):
            return None
        return user

user_crud = CRUDUser(Users) 