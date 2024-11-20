from datetime import datetime, timedelta
from typing import Dict, Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dev.config.settings import settings
from dev.utils.redis import RedisClient
from dev.utils.mail import EmailService
import random
import json
import logging

# 密码加密上下文
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

# 常量定义
SECRET_KEY = settings.SECRET_KEY  # 在 settings.py 中配置
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 300
LOGIN_USER_KEY = "login:token:"
LOGIN_USER_TTL = 300  # minutes

class Security:
    def __init__(self):
        self.redis_client = RedisClient()
        self.email_service = EmailService()

    def create_access_token(self, data: Dict) -> str:
        logging.info(f"Creating token with data: {data}")
        try:
            to_encode = data.copy()
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            to_encode.update({"exp": int(expire.timestamp())})

            # 生成JWT
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

            # 存储到 Redis，使用 set 方法带 ex 参数
            token_key = f"{LOGIN_USER_KEY}{encoded_jwt}"
            token_data = json.dumps({
                "email": data["sub"],  # Store the email from sub field
                "exp": int(expire.timestamp())
            })

            if not self.redis_client.set(token_key, token_data, ex=ACCESS_TOKEN_EXPIRE_MINUTES * 60):
                raise Exception("Failed to store token in Redis")

            return encoded_jwt

        except Exception as e:
            logging.error(f"Token creation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create access token"
            )

    def verify_token(self, token: str) -> Dict:
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is missing"
            )

        try:
            # 先检查Redis中是否存在
            token_key = f"{LOGIN_USER_KEY}{token}"
            redis_data = self.redis_client.get(token_key)
            logging.info(f"[verify_token] Raw Redis data: {redis_data}")

            if not redis_data:
                logging.warning(f"Token not found in Redis: {token}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token not found or expired"
                )

            # 将 Redis 中的 JSON 字符串反序列化为字典
            try:
                token_data = json.loads(redis_data)
                logging.info(f"[verify_token] Parsed token data: {token_data}")

                # 确保email字段存在
                if "email" not in token_data:
                    logging.error(f"[verify_token] Email field missing in token data: {token_data}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token format: email field missing"
                    )

                if not token_data["email"]:
                    logging.error(f"[verify_token] Email field is empty in token data: {token_data}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token: email field is empty"
                    )

                # 检查过期时间
                if "exp" not in token_data:
                    logging.error(f"[verify_token] Expiration field missing in token data: {token_data}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token format: expiration field missing"
                    )

                if token_data["exp"] < int(datetime.utcnow().timestamp()):
                    self.redis_client.delete(token_key)  # 清除过期的token
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token has expired"
                    )

                # 确保返回的是一个带有email字段的字典
                email = token_data["email"]
                result = {"email": email}
                logging.info(f"[verify_token] Returning user data: {result}")
                return result

            except json.JSONDecodeError as e:
                logging.error(f"[verify_token] Failed to parse token data: {e}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format"
                )

        except HTTPException:
            raise
        except Exception as e:
            logging.error(f"[verify_token] Unexpected error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error verifying token: {str(e)}"
            )

    @staticmethod
    def get_password_hash(password: str) -> str:
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logging.error(f"Error hashing password: {str(e)}")
            raise Exception(f"Password hashing error: {str(e)}")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logging.error(f"Error verifying password: {str(e)}")
            return False

    def send_verification_code(self, email: str) -> str:
        # 生成6位验证码
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])

        try:
            # 发送邮件
            self.email_service.send_verification_code(email, code)

            # 存储到Redis
            redis_key = f"verify:code:{email}"
            if not self.redis_client.set(redis_key, code, ex=300):  # 5分钟过期
                raise Exception("Failed to store verification code")

            return code

        except Exception as e:
            logging.error(f"Error sending verification code: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send verification code: {str(e)}"
            )

# 创建全局安全实例
security = Security()

# 依赖项
async def get_current_user(token: str = Depends(oauth2_scheme)):
    return security.verify_token(token)