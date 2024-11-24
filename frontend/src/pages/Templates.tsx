import React, { useState } from 'react';
import { FileText, Grid, List, Search, Filter as FilterIcon } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast"
import { useUser } from "@/contexts/UserContext"

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  tags: string[];
  path: string;
}

const templates: Template[] = [
  {
    id: '1',
    title: '新员工入职培训',
    description: '全面的入职指南和培训计划',
    category: '入职培训',
    image: 'https://img2.baidu.com/it/u=1807709045,952277039&fm=253&fmt=auto&app=120&f=JPEG?w=892&h=500',
    tags: ['入门级', '通用'],
    path: '/templates/new-employee'
  },
  {
    id: '2',
    title: '季度销售策略',
    description: '制定有效的销售策略和目标',
    category: '销售培训',
    image: 'https://img2.baidu.com/it/u=541607350,2056052397&fm=253&fmt=auto&app=138&f=JPEG?w=1000&h=500',
    tags: ['进阶', '销售'],
    path: '/templates/quarterly-sales'
  },
  {
    id: '3',
    title: '客户服务技巧',
    description: '提升客户满意度的服务技巧',
    category: '客户服务',
    image: 'https://img.js.design/assets/coverImg/published/62d7cca04ec0a8c8674ebe28V3.png',
    tags: ['中级', '服务'],
    path: '/templates/customer-service'
  },
  {
    id: '4',
    title: '项目管理基础',
    description: '掌握项目管理的核心概念和工具',
    category: '项目管理',
    image: 'https://img2.baidu.com/it/u=2203003576,1166201863&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
    tags: ['入门级', '管理'],
    path: '/templates/management'
  },
  {
    id: '5',
    title: '工作回顾',
    description: '制定高效的工作回顾计划',
    category: '工作回顾',
    image: 'https://img0.baidu.com/it/u=613695575,3816983384&fm=253&fmt=auto?w=761&h=500',
    tags: ['入门级', '管理'],
    path: '/templates/performance-management'
  },
  {
    id: '6',
    title: '工作计划',
    description: '制定目标和计划',
    category: 'OKR',
    image: 'https://img2.baidu.com/it/u=3501828502,4236535459&fm=253&fmt=auto&app=120&f=JPEG?w=1138&h=800',
    tags: ['入门级', '管理'],
    path: '/templates/career-planning'
  },
];

interface TemplateProps {
  outline: any[];
  backgroundInfo: any;
  generatedOutline: boolean;
}

export default function Templates() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const { outline, backgroundInfo, generatedOutline } = location.state || {};
  const userInfo = useUser();
  const { toast } = useToast();

  const filteredTemplates = templates.filter(template =>
    template.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTemplateClick = (path: string) => {
    if (generatedOutline) {
      navigate(path, {
        state: {
          outline,
          backgroundInfo,
          userId: userInfo.user?.id
        }
      });
      return;
    }

    navigate(path);
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <div className="w-full p-6 sm:p-8 md:p-10">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-amber-800">模板库</h1>
          <div className="flex gap-2">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              <FileText className="w-5 h-5 mr-2" />
              AI新增PPT
            </Button>
            <Button variant="outline" className="bg-white text-amber-600 border-amber-300 hover:bg-amber-50">
              选择模板创建
            </Button>
          </div>
        </div>

        <div className="w-full bg-white rounded-xl shadow-sm overflow-hidden border border-amber-200">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 w-5 h-5" />
                <Input
                  className="pl-10 border-amber-200 focus:border-amber-300 focus:ring-amber-300 bg-white w-full"
                  placeholder="搜索模板..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="bg-white text-amber-600 border-amber-300 hover:bg-amber-50">
                <FilterIcon className="w-5 h-5 mr-2" />
                筛选
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-300'}
                >
                  <Grid className="w-5 h-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-amber-600 border-amber-300'}
                >
                  <List className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="mb-6 overflow-x-auto">
              <div className="flex flex-nowrap gap-2 pb-2">
                {['全部', '最近更新', '收藏夹', '自定义模板'].map((tab) => (
                  <Button
                    key={tab}
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 whitespace-nowrap"
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>

            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {filteredTemplates.map((template) => (
                <div 
                  key={template.id} 
                  className="bg-white border border-amber-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer" 
                  onClick={() => handleTemplateClick(template.path)}
                >
                  <div className="aspect-[4/3] relative bg-gradient-to-br from-amber-300 to-amber-200">
                    {template.image ? (
                      <img
                        src={template.image}
                        alt={template.title}
                        className="w-full h-full object-cover absolute inset-0"
                        onError={(e) => {
                          // 图片加载失败时显示默认图标
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallbackIcon = document.createElement('div');
                          fallbackIcon.className = 'w-full h-full flex items-center justify-center';
                          fallbackIcon.innerHTML = '<svg className="w-16 h-16 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>';
                          target.parentElement?.appendChild(fallbackIcon);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-amber-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-amber-800 group-hover:text-amber-600 transition-colors">
                      {template.title}
                    </h3>
                    <p className="text-sm text-amber-600 mt-1">{template.description}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}