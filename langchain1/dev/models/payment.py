from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from ..database import Base, SessionLocal
from fastapi import HTTPException
import logging

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), unique=True, index=True)
    plan_id = Column(String(50))
    usage_count = Column(Integer, default=0)
    last_reset = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 订阅计划限制
    PLAN_LIMITS = {
        "free": 2,      # 免费版2次
        "basic": 50,    # 基础版每月50次
        "pro": 200,     # 专业版每月200次
        "enterprise": float('inf')  # 企业版无限制
    }

async def check_user_usage(user_email: str) -> dict:
    """检查用户使用次数"""
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(
            Subscription.user_email == user_email
        ).first()
        
        if not sub:
            # 新用户默认为免费版
            sub = Subscription(
                user_email=user_email,
                plan_id="free",
                usage_count=0
            )
            db.add(sub)
            db.commit()
            db.refresh(sub)
        
        # 检查是否需要重置计数
        now = datetime.utcnow()
        if (now - sub.last_reset).days >= 30:
            sub.usage_count = 0
            sub.last_reset = now
            db.commit()
            
        return {
            "can_generate": sub.usage_count < Subscription.PLAN_LIMITS[sub.plan_id],
            "current_usage": sub.usage_count,
            "plan_limit": Subscription.PLAN_LIMITS[sub.plan_id],
            "plan_id": sub.plan_id
        }
        
    except Exception as e:
        logging.error(f"Error checking usage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

async def update_user_usage(user_email: str):
    """更新用户使用次数"""
    db = SessionLocal()
    try:
        sub = db.query(Subscription).filter(
            Subscription.user_email == user_email
        ).first()
        
        if sub:
            sub.usage_count += 1
            db.commit()
            
    except Exception as e:
        logging.error(f"Error updating usage: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

ALIPAY_APP_ID = "your_app_id"
ALIPAY_PRIVATE_KEY = "your_private_key"
ALIPAY_PUBLIC_KEY = "alipay_public_key" 