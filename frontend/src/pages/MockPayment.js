import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
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
    return (_jsx("div", { className: "min-h-screen bg-gray-100 flex items-center justify-center p-4", children: _jsxs(Card, { className: "w-full max-w-md p-6 space-y-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "\u786E\u8BA4\u652F\u4ED8" }), _jsx("p", { className: "text-gray-500", children: "\u8BF7\u786E\u8BA4\u60A8\u7684\u8BA2\u5355\u4FE1\u606F" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\u8BA2\u5355\u7F16\u53F7" }), _jsx("span", { className: "font-medium", children: orderId })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\u5546\u54C1\u540D\u79F0" }), _jsx("span", { className: "font-medium", children: subject })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "\u652F\u4ED8\u91D1\u989D" }), _jsxs("span", { className: "text-xl font-bold text-amber-600", children: ["\u00A5", amount] })] })] }), _jsx("div", { className: "pt-4", children: _jsx(Button, { className: "w-full bg-amber-500 hover:bg-amber-600", onClick: handlePayment, disabled: loading, children: loading ? "支付处理中..." : "确认支付" }) }), _jsx("div", { className: "text-center text-sm text-gray-500", children: "\u8FD9\u662F\u4E00\u4E2A\u6A21\u62DF\u7684\u652F\u4ED8\u9875\u9762\uFF0C\u7528\u4E8E\u6D4B\u8BD5\u652F\u4ED8\u6D41\u7A0B" })] }) }));
}
