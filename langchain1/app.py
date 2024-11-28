from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dev.CloudStorage.routes import router as storage_router
from dev.database_api.user import router as user_router
from dev.database_api.employee import router as employee_router
from dev.database_api.document import router as document_router
import logging
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 设置日志级别 - 确保在创建 engine 之前设置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 特别设置 SQLAlchemy 日志级别
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# 设置代理
os.environ['HF_ENDPOINT'] = os.getenv('HF_ENDPOINT', 'https://hf-mirror.com')

app = FastAPI()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(storage_router, prefix="/api/storage", tags=["storage"])
app.include_router(user_router, tags=["users"])
app.include_router(employee_router, prefix="/api/employees", tags=["employees"])
app.include_router(document_router, prefix="/api/documents", tags=["documents"])