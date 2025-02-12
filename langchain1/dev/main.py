import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

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
    version="1.0.0"
)

# Add CORS middleware
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