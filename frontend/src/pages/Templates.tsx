import { useState, useEffect } from 'react';
import { FileText, Grid, List, Search } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from "@/contexts/UserContext"

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  tags: string[];
  path: string;
  updatedAt: string;
  isFavorite?: boolean;
  isCustom?: boolean;
}

const templates: Template[] = [
  {
    id: '1',
    title: '新员工入职培训',
    description: '全面的入职指南和培训计划',
    category: '入职培训',
    image: 'https://img2.baidu.com/it/u=1807709045,952277039&fm=253&fmt=auto&app=120&f=JPEG?w=892&h=500',
    tags: ['入门级', '通用'],
    path: '/templates/new-employee',
    updatedAt: '2024-03-15T10:00:00Z',
    isFavorite: true,
    isCustom: false
  },
  {
    id: '2',
    title: '季度销售策略',
    description: '制定有效的销售策略和目标',
    category: '销售培训',
    image: 'https://img2.baidu.com/it/u=541607350,2056052397&fm=253&fmt=auto&app=138&f=JPEG?w=1000&h=500',
    tags: ['进阶', '销售'],
    path: '/templates/quarterly-sales',
    updatedAt: '2024-03-14T15:30:00Z',
    isFavorite: true,
    isCustom: false
  },
  {
    id: '3',
    title: '客户服务技巧',
    description: '提升客户满意度的服务技巧',
    category: '客户服务',
    image: 'https://img.js.design/assets/coverImg/published/62d7cca04ec0a8c8674ebe28V3.png',
    tags: ['中级', '服务'],
    path: '/templates/customer-service',
    updatedAt: '2024-03-13T09:15:00Z',
    isFavorite: true,
    isCustom: true
  },
  {
    id: '4',
    title: '项目管理基础',
    description: '掌握项目管理的核心概念和工具',
    category: '项目管理',
    image: 'https://img2.baidu.com/it/u=2203003576,1166201863&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500',
    tags: ['入门级', '管理'],
    path: '/templates/management',
    updatedAt: '2024-03-12T14:00:00Z',
    isFavorite: false,
    isCustom: false
  },
  {
    id: '5',
    title: '工作回顾',
    description: '制定高效的工作回顾计划',
    category: '工作回顾',
    image: 'https://img0.baidu.com/it/u=613695575,3816983384&fm=253&fmt=auto?w=761&h=500',
    tags: ['入门级', '管理'],
    path: '/templates/performance-management',
    updatedAt: '2024-03-11T10:30:00Z',
    isFavorite: false,
    isCustom: false
  },
  {
    id: '6',
    title: '工作计划',
    description: '制定目标和计划',
    category: 'OKR',
    image: 'https://img2.baidu.com/it/u=3501828502,4236535459&fm=253&fmt=auto&app=120&f=JPEG?w=1138&h=800',
    tags: ['入门级', '管理'],
    path: '/templates/career-planning',
    updatedAt: '2024-03-10T16:00:00Z',
    isFavorite: false,
    isCustom: false
  },
];

type TabType = '全部' | '最近更新' | '收藏夹' | '自定义模板';

export default function Templates() {
  console.log('Templates component rendering...');

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('全部');
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>(templates);

  const navigate = useNavigate();
  console.log('navigate function initialized:', !!navigate);  // 检查 navigate 是否存在
  const location = useLocation();
  const { outline, backgroundInfo, generatedOutline } = location.state || {};
  const userInfo = useUser();

  useEffect(() => {
    console.log('useEffect running, activeTab:', activeTab);
    console.log('Current templates:', templates.length);
    // 如果是自定义模板标签，不进行过滤
    if (activeTab === '自定义模板') {
      return;
    }

    let filtered = templates;
    
    // First apply search filter if there's a search term
    if (searchTerm) {
      filtered = filtered.filter((template) =>
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Then apply tab filter
    switch (activeTab) {
      case '全部':
        console.log('Filtered templates (全部):', filtered.length);
        setFilteredTemplates(filtered);
        break;
      case '最近更新':
        console.log('Filtered templates (最近更新):', filtered.slice(0, 2).length);
        setFilteredTemplates(filtered.slice(0, 2));
        break;
      case '收藏夹':
        const favorites = filtered.filter(template => template.isFavorite);
        console.log('Filtered templates (收藏夹):', favorites.length);
        setFilteredTemplates(favorites);
        break;
    }
  }, [activeTab, searchTerm]);

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

  const handleallClick = () => {
    console.log('全部 clicked');
    setActiveTab('全部');
    setFilteredTemplates(templates);
  };

  const handlerecentClick = () => {
    console.log('最近更新 clicked');
    setActiveTab('最近更新');
    setFilteredTemplates(templates.slice(0, 2));
  };

  const handlefavoriteClick = () => {
    console.log('收藏夹 clicked');
    setActiveTab('收藏夹');
    const favorites = templates.filter(template => template.isFavorite);
    setFilteredTemplates(favorites);
  };

  const handlecustomizedClick = () => {
    console.log('自定义模板 clicked');
    setActiveTab('自定义模板');
    navigate('/templates/custom');
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <div className="w-full p-6 sm:p-8 md:p-10">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-amber-800">模板库</h1>
          <div className="flex gap-2">
           
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                console.log('AI New PPT clicked');
                window.alert("AI新增PPT功能正在开发中，敬请期待！");
              }}
            >
              <FileText className="w-5 h-5 mr-2" />
              AI新增PPT
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索模板..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 bg-white border-amber-200 focus:border-amber-400 focus:ring-amber-400"
            />
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="icon"
              className={`${viewMode === 'grid' ? 'bg-amber-100' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={`${viewMode === 'list' ? 'bg-amber-100' : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={() => {
              console.log('全部 clicked');
              handleallClick();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              activeTab === '全部'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-800 hover:bg-amber-100'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('最近更新 clicked');
              handlerecentClick();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              activeTab === '最近更新'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-800 hover:bg-amber-100'
            }`}
          >
            最近更新
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('收藏夹 clicked');
              handlefavoriteClick();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              activeTab === '收藏夹'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-800 hover:bg-amber-100'
            }`}
          >
            收藏夹
          </button>
          <button
            type="button"
            onClick={() => {
              console.log('自定义模板 clicked');
              handlecustomizedClick();
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
              activeTab === '自定义模板'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-amber-800 hover:bg-amber-100'
            }`}
          >
            自定义模板
          </button>
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
  );
}