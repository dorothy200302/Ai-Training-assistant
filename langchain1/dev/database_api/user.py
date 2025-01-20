import logging
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.security import Security
from config.database import get_db
from schemas.user import UserCreate, UserLogin, UserRegisterRequest, UserResponse, EmailVerifyRequest
from crud import user_crud
from utils.mail import EmailService
from utils.redis import RedisClient
import random
import string
from pydantic import BaseModel, EmailStr
from typing import Optional

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # 输出到控制台
        logging.FileHandler('app.log')  # 同时保存到文件
    ]
)

logger = logging.getLogger(__name__)

router = APIRouter()
email_service = EmailService()
redis_client = RedisClient()  # Use the RedisClient wrapper

# Test Redis connection on startup
try:
    if not redis_client.ping():
        raise Exception("Redis ping failed")
    logger.info("Redis connection successful")
except Exception as e:
    logger.error(f"Redis connection failed: {str(e)}")
    raise Exception("Redis connection failed")

class UserBase(BaseModel):
    email: EmailStr

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

# 验证码请求模型
class VerifyCodeRequest(BaseModel):
    email: str
    type: str = 'register'  # 默认为注册类型

# 注册请求模型
class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str
    verification_code: str

# 登录请求模型
class LoginRequest(BaseModel):
    email: str
    password: str

security = Security()

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        logger.info("=== 登录请求开始 ===")
        logger.info(f"尝试登录邮箱: {request.email}")
        
        user = user_crud.authenticate_user(db, request.email, request.password)
        if not user:
            logger.info("登录失败：邮箱或密码错误")
            raise HTTPException(
                status_code=401, 
                detail="邮箱或密码错误"
            )
        
        logger.info("登录成功，生成token")
        access_token = security.create_access_token(data={"sub": user.email})
        return {
            "access_token": access_token, 
            "token_type": "bearer",
            "user_id": user.user_id,  
            "username": user.username  
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/register")
async def register_user(request: RegisterRequest):
    try:
        # 验证码检查
        redis_key = f"verify_code:{request.email}"
        stored_code = redis_client.get(redis_key)
        
        logger.info(f"Registration attempt - Email: {request.email}, Username: {request.username}")
        logger.info(f"Verification code from request: {request.verification_code}")
        logger.info(f"Stored code from Redis: {stored_code}")
        
        if not stored_code:
            logger.warning(f"No verification code found for email: {request.email}")
            raise HTTPException(
                status_code=400,
                detail="验证码已过期或不存在"
            )
        
        if stored_code != request.verification_code:
            logger.warning(f"Invalid verification code for email: {request.email}")
            raise HTTPException(
                status_code=400,
                detail="验证码错误"
            )
        
        # 检查邮箱是否已存在
        logger.info(f"Checking if email exists: {request.email}")
        existing_user = user_crud.get_by_email(db, request.email)
        if existing_user:
            logger.warning(f"Email already exists: {request.email}")
            raise HTTPException(
                status_code=400,
                detail="该邮箱已被注册"
            )
        
        # 创建用户
        try:
            logger.info("Attempting to create user in database")
            # 创建 UserCreate 对象
            user_create = UserCreate(
                email=request.email,
                password=request.password,
                username=request.username
            )
            logger.info(f"User create data prepared: {user_create}")
            
            new_user = user_crud.create_user(db, user_create)
            logger.info(f"User created successfully: {new_user.user_id}")
            
            # 删除验证码
            redis_client.delete(redis_key)
            
            return {
                "id": new_user.user_id,
                "email": new_user.email,
                "username": new_user.username,
                "is_active": True
            }
            
        except Exception as e:
            logger.error(f"Error creating user: {str(e)}")
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(f"Error args: {e.args}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"创建用户时发生错误: {str(e)}"
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Registration error: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error args: {e.args}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"注册过程中发生错误: {str(e)}"
        )

@router.post("/email/verify-code")
async def send_verification_code(request: VerifyCodeRequest):
    try:
        # 发送验证码逻辑
        code = await security.send_verification_code(request.email)
        return {"message": "Verification code sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def generate_verification_code(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))