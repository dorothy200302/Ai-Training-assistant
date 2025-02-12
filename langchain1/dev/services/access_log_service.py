 from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.models import AccessLog
from fastapi import HTTPException, Request

class AccessLogService:
    def __init__(self, db: Session):
        self.db = db

    async def log_access(self,
        user_id: int,
        document_id: str,
        action: str,
        request: Request
    ) -> AccessLog:
        """记录访问日志"""
        try:
            # 获取客户端信息
            client_host = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent")

            # 创建日志记录
            log = AccessLog(
                user_id=user_id,
                document_id=document_id,
                action=action,
                ip_address=client_host,
                user_agent=user_agent
            )

            self.db.add(log)
            self.db.commit()
            self.db.refresh(log)

            return log

        except Exception as e:
            self.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def get_user_logs(self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AccessLog]:
        """获取用户的访问日志"""
        try:
            query = self.db.query(AccessLog)\
                .filter(AccessLog.user_id == user_id)

            if start_date:
                query = query.filter(AccessLog.access_time >= start_date)
            if end_date:
                query = query.filter(AccessLog.access_time <= end_date)

            return query.order_by(AccessLog.access_time.desc()).all()

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_document_logs(self,
        document_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AccessLog]:
        """获取文档的访问日志"""
        try:
            query = self.db.query(AccessLog)\
                .filter(AccessLog.document_id == document_id)

            if start_date:
                query = query.filter(AccessLog.access_time >= start_date)
            if end_date:
                query = query.filter(AccessLog.access_time <= end_date)

            return query.order_by(AccessLog.access_time.desc()).all()

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_access_statistics(self,
        document_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """获取访问统计数据"""
        try:
            logs = self.get_document_logs(document_id, start_date, end_date)

            stats = {
                "total_views": 0,
                "total_edits": 0,
                "total_downloads": 0,
                "unique_users": set(),
                "action_breakdown": {}
            }

            for log in logs:
                stats["unique_users"].add(log.user_id)
                
                if log.action not in stats["action_breakdown"]:
                    stats["action_breakdown"][log.action] = 0
                stats["action_breakdown"][log.action] += 1

                if log.action == "view":
                    stats["total_views"] += 1
                elif log.action == "edit":
                    stats["total_edits"] += 1
                elif log.action == "download":
                    stats["total_downloads"] += 1

            # Convert set to length for JSON serialization
            stats["unique_users"] = len(stats["unique_users"])

            return stats

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))