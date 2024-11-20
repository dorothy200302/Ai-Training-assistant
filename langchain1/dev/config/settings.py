from pydantic_settings import BaseSettings
from typing import Optional
import secrets
class Settings(BaseSettings):
    # 数据库配置
    DB_DRIVER: str = "mysql+pymysql"
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "doc_generator"
    DB_USER: str = "root"
    DB_PASSWORD: str = "123456"
    
    # Redis配置
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # 邮件配置
    MAIL_SERVER: str = "smtp.163.com"
    MAIL_PORT: int = 465
    MAIL_USERNAME: str = "18061613931@163.com"
    MAIL_PASSWORD: str = "VFkAeTxhAJFgLnmM"
    MAIL_USE_SSL: bool = True
    MAIL_DEFAULT_SENDER: str = "18061613931@163.com"
    
    # 文件上传配置
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    MAX_REQUEST_SIZE: int = 100 * 1024 * 1024  # 100MB
    
    # 线程池配置
    THREAD_POOL_CORE_SIZE: int = 10
    THREAD_POOL_MAX_SIZE: int = 50
    THREAD_POOL_QUEUE_CAPACITY: int = 100

    SECRET_KEY: str = secrets.token_hex(32)
    
    # Redis settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    # Token settings
    LOGIN_USER_KEY: str = "login:token:"
    LOGIN_USER_TTL: int = 60  # minutes
    
    class Config:
        env_file = ".env"

settings = Settings()