from fastapi import Request, HTTPException
from typing import Optional
from services.permission_service import PermissionService
from services.access_log_service import AccessLogService
from models.models import PermissionLevel
from database import get_db
from core.security import get_current_user

async def check_document_permission(
    request: Request,
    document_id: str,
    required_level: PermissionLevel
) -> bool:
    """检查文档访问权限的中间件函数"""
    try:
        # 获取当前用户
        current_user = await get_current_user(request)
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # 获取数据库会话
        db = next(get_db())
        
        # 检查权限
        permission_service = PermissionService(db)
        has_permission = permission_service.check_permission(
            document_id=document_id,
            user_id=current_user['user_id'],
            required_level=required_level
        )

        if not has_permission:
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions"
            )

        # 记录访问日志
        access_log_service = AccessLogService(db)
        await access_log_service.log_access(
            user_id=current_user['user_id'],
            document_id=document_id,
            action=request.method.lower(),
            request=request
        )

        return True

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PermissionMiddleware:
    """权限检查中间件"""
    
    def __init__(self, required_level: PermissionLevel = PermissionLevel.READ):
        self.required_level = required_level

    async def __call__(self, request: Request, call_next):
        # 获取文档ID
        document_id = request.path_params.get('document_id')
        if document_id:
            await check_document_permission(
                request=request,
                document_id=document_id,
                required_level=self.required_level
            )

        response = await call_next(request)
        return response