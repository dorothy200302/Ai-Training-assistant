import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MockPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const orderId = searchParams.get('order_id');
  const amount = searchParams.get('amount');
  const subject = searchParams.get('subject');

  const handlePayment = async () => {
    setLoading(true);
    // 模拟支付过程
    await new Promise(resolve => setTimeout(resolve, 1500));
    // 支付成功后关闭窗口
    window.close();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">确认支付</h1>
          <p className="text-gray-500">请确认您的订单信息</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">订单编号</span>
            <span className="font-medium">{orderId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">商品名称</span>
            <span className="font-medium">{subject}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">支付金额</span>
            <span className="text-xl font-bold text-amber-600">¥{amount}</span>
          </div>
        </div>

        <div className="pt-4">
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600"
            onClick={handlePayment}
            disabled={loading}
          >
            {loading ? "支付处理中..." : "确认支付"}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          这是一个模拟的支付页面，用于测试支付流程
        </div>
      </Card>
    </div>
  );
}
