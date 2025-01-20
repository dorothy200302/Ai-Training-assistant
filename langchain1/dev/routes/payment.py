from fastapi import APIRouter, HTTPException, Depends
from alipay import AliPay
from datetime import datetime
from ..core.security import get_current_user
from ..config.settings import ALIPAY_CONFIG
from ..database import SessionLocal
import logging

router = APIRouter()

# 初始化支付宝客户端
alipay = AliPay(
    appid=ALIPAY_CONFIG["APP_ID"],
    app_notify_url=ALIPAY_CONFIG["NOTIFY_URL"],
    app_private_key_string=ALIPAY_CONFIG["APP_PRIVATE_KEY"],
    alipay_public_key_string=ALIPAY_CONFIG["ALIPAY_PUBLIC_KEY"],
    sign_type="RSA2",
    debug=True  # 开发环境设为True
)

PLAN_PRICES = {
    "basic": 99,
    "pro": 299,
    "enterprise": 999
}

@router.post("/create-payment")
async def create_payment(plan_id: str, current_user = Depends(get_current_user)):
    """创建支付宝支付订单"""
    try:
        # 生成订单号
        order_no = f"sub_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # 创建支付链接
        order_string = alipay.api_alipay_trade_page_pay(
            out_trade_no=order_no,
            total_amount=PLAN_PRICES[plan_id],
            subject=f"DocGen {plan_id.capitalize()} Plan",
            return_url=ALIPAY_CONFIG["RETURN_URL"],
            notify_url=ALIPAY_CONFIG["NOTIFY_URL"]
        )
        
        # 生成完整支付URL
        pay_url = f"https://openapi.alipaydev.com/gateway.do?{order_string}"
        
        return {"payment_url": pay_url}
        
    except Exception as e:
        logging.error(f"Create payment error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify")
async def payment_notify(data: dict):
    """处理支付宝异步通知"""
    try:
        # 验证签名
        if alipay.verify(data):
            # 更新用户订阅
            user_email = data.get("buyer_email")
            plan_id = data.get("out_trade_no").split("_")[1]
            
            # 重置使用次数并更新计划
            db = SessionLocal()
            sub = db.query(Subscription).filter(
                Subscription.user_email == user_email
            ).first()
            
            if sub:
                sub.plan_id = plan_id
                sub.usage_count = 0
                sub.last_reset = datetime.utcnow()
                db.commit()
            
            return {"msg": "success"}
    except Exception as e:
        logging.error(f"Payment notification error: {str(e)}")
    return {"msg": "fail"} 