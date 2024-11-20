from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dev.CloudStorage.routes import router as storage_router
from dev.database_api.user import router as user_router
from dev.database_api.emplyee import router as employee_router
from dev.database_api.document import router as document_router
import logging

# 设置日志级别 - 确保在创建 engine 之前设置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# 特别设置 SQLAlchemy 日志级别
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

app = FastAPI()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(storage_router, prefix="/api/storage", tags=["storage"])
app.include_router(user_router, tags=["users"])
app.include_router(employee_router, prefix="/api/employees", tags=["employees"])
app.include_router(document_router, prefix="/api/documents", tags=["documents"])