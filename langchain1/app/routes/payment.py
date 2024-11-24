from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
from app.database import get_db
from sqlalchemy.orm import Session
from app.models.user import User
from app.auth.auth_bearer import JWTBearer
from app.models.payment import Payment, Subscription
from app.utils.alipay import alipay_service
import uuid

router = APIRouter(
    prefix="/api/payment",
    tags=["payment"],

    dependencies=[Depends(get_current_user())]
)

class PaymentIntentCreate(BaseModel):
    plan_id: str

class PaymentConfirm(BaseModel):
    payment_intent_id: str

class PaymentResponse(BaseModel):
    payment_intent_id: str
    client_secret: str
    payment_url: str

PLAN_PRICES = {
    "basic": 99,
    "pro": 299,
    "enterprise": None
}

@router.post("/create-intent", response_model=PaymentResponse)
async def create_payment_intent(
    request: PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),  # Explicitly type as dict
):
    """创建支付意向"""
    if request.plan_id not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    price = PLAN_PRICES[request.plan_id]
    if price is None:
        raise HTTPException(status_code=400, detail="Enterprise plan requires contact")

    # 生成支付ID
    payment_intent_id = f"pi_{uuid.uuid4().hex}"
    client_secret = f"cs_{uuid.uuid4().hex}"

    # 创建支付记录
    payment = Payment(
        id=payment_intent_id,
        user_id=current_user.id,
        plan_id=request.plan_id,
        amount=price,
        status="pending",
        client_secret=client_secret
    )
    
    db.add(payment)
    db.commit()

    # 创建支付宝支付链接
    payment_url = alipay_service.create_payment_url(
        order_id=payment_intent_id,
        amount=float(price),
        subject=f"{request.plan_id.capitalize()} Plan Subscription"
    )

    return PaymentResponse(
        payment_intent_id=payment_intent_id,
        client_secret=client_secret,
        payment_url=payment_url
    )

@router.post("/alipay/notify")
async def alipay_notify(request: Request, db: Session = Depends(get_db)):
    """支付宝异步通知"""
    data = await request.form()
    data_dict = dict(data)
    
    # 验证签名
    signature = data_dict.pop("sign")
    if not alipay_service.verify_callback(data_dict, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payment_intent_id = data_dict.get("out_trade_no")
    trade_status = data_dict.get("trade_status")

    if trade_status == "TRADE_SUCCESS":
        payment = db.query(Payment).filter(Payment.id == payment_intent_id).first()
        if payment and payment.status == "pending":
            # 更新支付状态
            payment.status = "completed"
            
            # 创建订阅
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=30)
            
            subscription = Subscription(
                id=f"sub_{uuid.uuid4().hex}",
                user_id=payment.user_id,
                plan_id=payment.plan_id,
                start_date=start_date,
                end_date=end_date,
                status="active"
            )
            
            db.add(subscription)
            db.commit()

    return {"message": "success"}

@router.get("/alipay/return")
async def alipay_return(
    out_trade_no: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(JWTBearer())
):
    """支付宝同步返回"""
    # 验证支付状态
    payment_status = alipay_service.verify_payment(out_trade_no)
    
    if payment_status.get("trade_status") == "TRADE_SUCCESS":
        return {"success": True, "redirect_url": "/dashboard"}
    else:
        return {"success": False, "message": "Payment failed"}

@router.post("/confirm")
async def confirm_payment(
    request: PaymentConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(JWTBearer())
):
    """确认支付"""
    payment = db.query(Payment).filter(
        Payment.id == request.payment_intent_id,
        Payment.user_id == current_user.id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    if payment.status != "pending":
        raise HTTPException(status_code=400, detail="Payment already processed")

    # 更新支付状态
    payment.status = "completed"
    db.commit()

    # 创建或更新订阅
    start_date = datetime.utcnow()
    end_date = start_date + timedelta(days=30)  # 30天订阅期

    subscription = Subscription(
        user_id=current_user.id,
        plan_id=payment.plan_id,
        start_date=start_date,
        end_date=end_date,
        status="active"
    )
    
    db.add(subscription)
    db.commit()

    return {"success": True}

@router.get("/subscription/status")
async def get_subscription_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(JWTBearer())
):
    """获取订阅状态"""
    subscription = db.query(Subscription).filter(
        Subscription.user_id == current_user.id,
        Subscription.status == "active",
        Subscription.end_date > datetime.utcnow()
    ).first()

    return {
        "status": "active" if subscription else "inactive",
        "plan": subscription.plan_id if subscription else None,
        "end_date": subscription.end_date if subscription else None
    }
