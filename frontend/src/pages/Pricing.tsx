import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  planId: string;
  priceAmount: number | null;
}

const pricingTiers: PricingTier[] = [
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
  const [loading, setLoading] = useState<string | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);

  const handleSubscription = async (tier: PricingTier) => {
    if (tier.planId === 'enterprise') {
      navigate('/contact');
      return;
    }

    try {
      setLoading(tier.planId);
      
      // 创建支付订单
      const response = await fetch('/api/payment/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: tier.planId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment');
      }
      
      const { payment_url } = await response.json();
      
      // 在新窗口打开支付宝支付页面
      window.open(payment_url, '_blank');
      
      // 显示支付提示
      setShowPaymentDialog(true);
      
    } catch (error) {
      toast({
        title: "创建订单失败",
        description: "请稍后重试或联系客服",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
        <div className="w-full p-6">
          <h1 className="text-4xl font-bold text-amber-900 mb-12 text-center">价格方案</h1>
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div 
                key={index}
                className={`flex-1 bg-white rounded-xl shadow-lg overflow-hidden border flex flex-col ${
                  tier.highlighted ? 'border-amber-500 ring-4 ring-amber-500 ring-opacity-50' : 'border-amber-200'
                }`}
              >
                <div className="p-6 flex-grow">
                  <h2 className="text-xl sm:text-2xl font-semibold text-amber-800 mb-2">{tier.name}</h2>
                  <p className="text-3xl sm:text-4xl font-bold text-amber-600 mb-4">{tier.price}</p>
                  <p className="text-amber-600 mb-6">{tier.description}</p>
                  <Button 
                    className={`w-full ${
                      tier.highlighted 
                        ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                    }`}
                    onClick={() => handleSubscription(tier)}
                    disabled={loading === tier.planId}
                  >
                    {loading === tier.planId ? '处理中...' : tier.cta}
                  </Button>
                </div>
                <div className="bg-amber-50 p-6">
                  <ul className="space-y-4">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-amber-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>支付提示</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>我们已经为您打开支付页面，请在新窗口中完成支付。</p>
            <p>支付完成后，页面会自动跳转到您的仪表板。</p>
            {selectedTier && (
              <div className="text-sm text-gray-500">
                <p>订阅计划：{selectedTier.name}</p>
                <p>支付金额：¥{selectedTier.priceAmount}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}