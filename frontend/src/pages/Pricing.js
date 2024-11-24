import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const pricingTiers = [
    {
        name: "基础版",
        price: "¥99/月",
        description: "适合个人或小型团队使用",
        planId: "basic",
        priceAmount: 99,
        features: [
            "每月生成50份文档",
            "基础模板库访问",
            "标准客户支持",
            "最多5个用户",
            "基础AI辅助",
        ],
        cta: "选择基础版"
    },
    {
        name: "专业版",
        price: "¥299/月",
        description: "适合中型企业和成长中的团队",
        planId: "pro",
        priceAmount: 299,
        features: [
            "每月生成200份文档",
            "完整模板库访问",
            "优先客户支持",
            "最多20个用户",
            "高级AI辅助",
            "自定义模板",
        ],
        cta: "选择专业版",
        highlighted: true
    },
    {
        name: "企业版",
        price: "联系我们",
        description: "为大型企业定制的解决方案",
        planId: "enterprise",
        priceAmount: null,
        features: [
            "无限文档生成",
            "完整模板库访问",
            "24/7专属支持",
            "无限用户",
            "AI深度定制",
            "高级API集成",
            "专属客户经理",
        ],
        cta: "联系销售"
    }
];
export default function Pricing() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(null);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [selectedTier, setSelectedTier] = useState(null);
    const handleSubscription = async (tier) => {
        if (tier.planId === 'enterprise') {
            navigate('/contact');
            return;
        }
        try {
            setLoading(tier.planId);
            setSelectedTier(tier);
            // 生成模拟支付URL
            const paymentUrl = `/mock-payment?order_id=${Date.now()}&amount=${tier.priceAmount}&subject=${tier.name}订阅`;
            // 在新窗口中打开支付页面
            window.open(paymentUrl, 'payment_window', 'width=800,height=600');
            // 显示支付提示对话框
            setShowPaymentDialog(true);
        }
        catch (error) {
            toast({
                title: "创建订单失败",
                description: "请稍后重试或联系客服",
                variant: "destructive",
            });
        }
        finally {
            setLoading(null);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: _jsxs("div", { className: "w-full p-6", children: [_jsx("h1", { className: "text-4xl font-bold text-amber-900 mb-12 text-center", children: "\u4EF7\u683C\u65B9\u6848" }), _jsx("div", { className: "w-full grid grid-cols-1 md:grid-cols-3 gap-8", children: pricingTiers.map((tier, index) => (_jsxs("div", { className: `flex-1 bg-white rounded-xl shadow-lg overflow-hidden border flex flex-col ${tier.highlighted ? 'border-amber-500 ring-4 ring-amber-500 ring-opacity-50' : 'border-amber-200'}`, children: [_jsxs("div", { className: "p-6 flex-grow", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-semibold text-amber-800 mb-2", children: tier.name }), _jsx("p", { className: "text-3xl sm:text-4xl font-bold text-amber-600 mb-4", children: tier.price }), _jsx("p", { className: "text-amber-600 mb-6", children: tier.description }), _jsx(Button, { className: `w-full ${tier.highlighted
                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-800'}`, onClick: () => handleSubscription(tier), disabled: loading === tier.planId, children: loading === tier.planId ? '处理中...' : tier.cta })] }), _jsx("div", { className: "bg-amber-50 p-6", children: _jsx("ul", { className: "space-y-4", children: tier.features.map((feature, featureIndex) => (_jsxs("li", { className: "flex items-center", children: [_jsx(Check, { className: "w-5 h-5 text-green-500 mr-2 flex-shrink-0" }), _jsx("span", { className: "text-amber-700", children: feature })] }, featureIndex))) }) })] }, index))) })] }) }), _jsx(Dialog, { open: showPaymentDialog, onOpenChange: setShowPaymentDialog, children: _jsxs(DialogContent, { className: "sm:max-w-[400px]", children: [_jsx(DialogHeader, { children: _jsx(DialogTitle, { children: "\u652F\u4ED8\u63D0\u793A" }) }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { children: "\u6211\u4EEC\u5DF2\u7ECF\u4E3A\u60A8\u6253\u5F00\u652F\u4ED8\u9875\u9762\uFF0C\u8BF7\u5728\u65B0\u7A97\u53E3\u4E2D\u5B8C\u6210\u652F\u4ED8\u3002" }), _jsx("p", { children: "\u652F\u4ED8\u5B8C\u6210\u540E\uFF0C\u9875\u9762\u4F1A\u81EA\u52A8\u8DF3\u8F6C\u5230\u60A8\u7684\u4EEA\u8868\u677F\u3002" }), selectedTier && (_jsxs("div", { className: "text-sm text-gray-500", children: [_jsxs("p", { children: ["\u8BA2\u9605\u8BA1\u5212\uFF1A", selectedTier.name] }), _jsxs("p", { children: ["\u652F\u4ED8\u91D1\u989D\uFF1A\u00A5", selectedTier.priceAmount] })] }))] })] }) })] }));
}
