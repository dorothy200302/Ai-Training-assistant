import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface RechargePackage {
  energy: number;
  price: number;
}

export default function RechargePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);

  const packages: RechargePackage[] = [
    { energy: 50, price: 10 },
    { energy: 100, price: 18 }, 
    { energy: 200, price: 30 }
  ];

  const handleRecharge = async () => {
    if (!selectedPackage) {
      toast({
        title: "请选择充值套餐",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/recharge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPackage.price
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "充值成功",
          description: `成功充值 ${selectedPackage.energy} 点能量`,
        });
        navigate('/dashboard');  // 充值成功后跳转
      } else {
        throw new Error(data.detail || '充值失败');
      }
    } catch (error) {
      toast({
        title: "充值失败", 
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">能量值充值</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">充值套餐</h2>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {packages.map((pkg) => (
              <div
                key={pkg.energy}
                className={`border p-4 rounded cursor-pointer transition-all ${
                  selectedPackage?.energy === pkg.energy 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-blue-500'
                }`}
                onClick={() => setSelectedPackage(pkg)}
              >
                <p className="font-bold">{pkg.energy}能量</p>
                <p className="text-gray-600">¥{pkg.price}</p>
              </div>
            ))}
          </div>
        </div>
        
        <button
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
          onClick={handleRecharge}
          disabled={loading || !selectedPackage}
        >
          {loading ? '处理中...' : '确认充值'}
        </button>
      </div>
    </div>
  );
} 