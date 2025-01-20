import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.docs import (
    get_swagger_ui_html,
    get_swagger_ui_oauth2_redirect_html,
)
from fastapi.openapi.utils import get_openapi

# Use relative imports
from database_api.document import router as document_router
from database_api.employee import router as employee_router
from CloudStorage.routes import router as storage_router
from database_api.user import router as user_router
from database_api.department import router as department_router
from Chatbot.chatBotApi import router as chatbot_router

app = FastAPI(
    title="Training Document API",
    description="API for managing training documents",
    version="1.0.0",
    docs_url=None,  # 禁用默认的 docs 路径
    redoc_url=None  # 禁用默认的 redoc 路径
)

# 更新 CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有请求头
    expose_headers=["*"],  # 暴露所有响应头
    max_age=3600
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routers with prefixes
app.include_router(document_router, prefix="/api/document")
app.include_router(employee_router, prefix="/api/employee")
app.include_router(storage_router, prefix="/api/storage")
app.include_router(user_router, prefix="/api/user")
app.include_router(department_router, prefix="/api/department")
app.include_router(chatbot_router, prefix="/api/chatbot")

# Debug endpoint to list all routes
@app.get("/debug/routes", tags=["debug"])
async def list_routes():
    routes = []
    for route in app.routes:
        routes.append({
            "path": route.path,
            "name": route.name,
            "methods": list(route.methods) if route.methods else []
        })
    return {"routes": routes}

# Root endpoint for health check
@app.get("/")
async def root():
    return {"status": "ok", "message": "Training Document API is running"}

# 自定义 OpenAPI 文档
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="/static/swagger-ui-bundle.js",
        swagger_css_url="/static/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=f"{app.title} - ReDoc",
        redoc_js_url="/static/redoc.standalone.js",
    )

# 自定义 OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # 添加安全定义
    openapi_schema["components"]["securitySchemes"] = {
        "OAuth2PasswordBearer": {
            "type": "oauth2",
            "flows": {
                "password": {
                    "tokenUrl": "/api/user/login",
                    "scopes": {}
                }
            }
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi