import React, { useState } from 'react';
import { motion } from 'framer-motion';

import {
  Database,
  UserCheck,
  MessageSquare,
  FileOutput,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate } from 'react-router-dom';

interface Testimonial {
  avatar: string;
  name: string;
  title: string;
  content: string;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-amber-50 p-6 rounded-lg shadow-md border border-amber-300 hover:shadow-lg transition-all duration-300">
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-400 rounded-lg flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-amber-900 font-medium mb-2">{title}</h3>
        <p className="text-amber-700 text-sm">{description}</p>
      </div>
    </div>
  );
}

const testimonials: Testimonial[] = [
  {
    avatar: '张',
    name: '张经理',
    title: '销售总监',
    content: '智能生成的培训文档让我们的新员工培训效率提升了50%，节省了大量时间。'
  },
  {
    avatar: '李',
    name: '李老师',
    title: '培训主管',
    content: '系统生成的内容非常专业，完全符合我们的培训需求，特别是个性化定制功能。'
  },
  {
    avatar: '王',
    name: '王工',
    title: '技术经理',
    content: '文档模板丰富，质量高，帮助我们快速构建了完整的技术培训体系。'
  },
  {
    avatar: '陈',
    name: '陈主管',
    title: 'HR总监',
    content: '培训文档的多样性和针对性很强，员工反馈非常好，推荐使用。'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
//   /templates/management" element={<Management />} />
//   <Route path="/templates/new-employee" element={<NewEmployee />} />
//   <Route path="/g"templates/sales-training
  const tagRoutes = {
    '新员工培训': '/templates/new-employee',
    '销售技巧': '/templates/sales-training',
    '管理能力': '/templates/management',
    '职业规划': '/templates/career-planning'
  } as const;

  const handleTagClick = (tag: keyof typeof tagRoutes) => {
    navigate(tagRoutes[tag], { state: { topic: tag } });
  };

  const handleMarketClick = (topic: string) => {
    navigate('/outline', { state: { topic } });
  };

  const handleGenerate = () => {
    navigate('/outline', { state: { topic: inputValue } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300 flex flex-col">
      {/* Announcement Banner */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 text-white py-2 px-4 text-center relative">
        <span className="inline-flex items-center">
          🎉 周年庆活动：会员时长翻倍送，升级领200元礼品卡
        </span>
      </div>

      {/* Navigation */}
      

      {/* Hero Section */}
      <div className="pt-24 pb-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <h1 className="text-5xl font-bold text-amber-900 mb-8">
            AI 智能培训文档生成系统
          </h1>
          <p className="text-xl text-amber-700 mb-12">
            让 AI 为您打造
            <span className="text-amber-600 font-semibold">专业的培训方案</span>
          </p>
          <div className="max-w-2xl mx-auto bg-amber-50 rounded-2xl shadow-lg p-6 border border-amber-300">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <p className="text-amber-800">请输入您需要的培训文档主题或内容描述...</p>
            </div>
            <div className="flex gap-2">
              <Input
                className="flex-1 border-amber-400 focus-visible:ring-amber-500 focus-visible:ring-offset-0 bg-white"
                placeholder="例如：新员工入职培训手册..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <Button 
                onClick={handleGenerate}
                className="bg-gradient-to-r from-amber-600 to-amber-500 text-white hover:from-amber-700 hover:to-amber-600"
              >
                开始生成
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.keys(tagRoutes).map((tag) => (
                <Button 
                  key={tag} 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleTagClick(tag as keyof typeof tagRoutes)}
                  className="text-amber-700 bg-amber-100 border-amber-300 hover:bg-amber-200"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Cards */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            className="cursor-pointer bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
            onClick={() => handleMarketClick("市场营销策划方案")}
          >
            <h3 className="text-xl font-semibold text-amber-800 mb-2">市场营销</h3>
            <p className="text-amber-600">专业的市场营销策划方案，助力企业品牌推广</p>
          </div>
          <FeatureCard
            icon={<Database className="w-6 h-6 text-white" />}
            title="知识库管理"
            description="集中化管理企业文档，支持分类标签，方便检索"
          />
          <FeatureCard
            icon={<UserCheck className="w-6 h-6 text-white" />}
            title="个性化方案"
            description="根据员工角色和需求，定制专属培训计划"
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6 text-white" />}
            title="反馈优化"
            description="收集用户评价，持续改进培训内容质量"
          />
          <FeatureCard
            icon={<FileOutput className="w-6 h-6 text-white" />}
            title="多格式导出"
            description="支持PDF、Word等多种格式，随时下载使用"
          />
          <FeatureCard
            icon={<ShieldCheck className="w-6 h-6 text-white" />}
            title="安全保障"
            description="严格的权限管理，保护企业机密信息"
          />
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-20 bg-gradient-to-br from-amber-100 to-amber-200 flex-grow">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-amber-900 mb-12">用户评价</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-amber-50 p-6 rounded-lg shadow-md border border-amber-300">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-white text-xl font-bold">
                      {testimonial.avatar}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-amber-900">{testimonial.name}</h3>
                      <p className="text-sm text-amber-700">{testimonial.title}</p>
                    </div>
                  </div>
                  <p className="text-amber-800">{testimonial.content}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}