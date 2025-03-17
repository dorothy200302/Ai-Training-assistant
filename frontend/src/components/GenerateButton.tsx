import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const GenerateButton = () => {
  const navigate = useNavigate();

  const handleGenerate = async () => {
    try {
      const response = await fetch('/api/storage/generate_outline_and_upload/', {
        // ... 其他配置
      });
      
      const data = await response.json();
      
      if (response.status === 402) {
        if (data.status === 'energy_insufficient') {
          toast({
            title: "能量不足",
            description: `当前能量: ${data.current_energy}, 需要能量: ${data.required_energy}`,
            variant: "destructive",
          });
          navigate('/recharge');
          return;
        }
      }
      
      // 正常处理生成结果...
      
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <button onClick={handleGenerate}>
      生成文档
    </button>
  );
}; 