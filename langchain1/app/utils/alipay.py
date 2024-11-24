from typing import Dict, Optional
import uuid

class AlipayService:
    def __init__(self):
        # 模拟初始化
        pass

    def create_payment_url(self, order_id: str, amount: float, subject: str) -> str:
        """
        创建模拟支付URL
        """
        # 返回模拟支付页面的URL
        return f"/mock-payment?order_id={order_id}&amount={amount}&subject={subject}"

    def verify_callback(self, data: Dict, signature: str) -> bool:
        """
        模拟验证回调
        """
        return True

    def verify_payment(self, order_id: str) -> Dict:
        """
        模拟验证支付状态
        """
        return {
            "trade_status": "TRADE_SUCCESS",
            "out_trade_no": order_id
        }

alipay_service = AlipayService()
