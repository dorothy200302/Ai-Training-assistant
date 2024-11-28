import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bot, FileText, HelpCircle, LayoutTemplate, Loader2,  Recycle, Send, Eye } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import DocumentUpload from './DocumentUpload';
import { toast } from "@/hooks/use-toast"
import { API_BASE_URL } from '../config/constants';

interface OutlineSection {
  title: string;
  content?: string;
  subsections?: OutlineSection[];
  items?: string[];
  level: number;
  time?: string;
}


const OutlineGenerator: React.FC = () => {
  const location = useLocation();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState<string>(location.state?.topic || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [generatingOutline, setGeneratingOutline] = useState(false);  // 添加生成中状态
  
  // 添加新的接口定义
  interface BackgroundInfo {
    industry_info: string;
    audience_info: string;
    company_name: string;
    company_culture: string;
    company_industry: string;
    company_competition: string;
    user_role: string;
    project_title: string;
    project_dutys: string;
    project_goals: string;
    project_theme: string;
    project_aim: string;
    content_needs: string;
    format_style: string;
  }

  // 添加新的对话记录接口
  interface ChatMessage {
    type: 'bot' | 'user';
    content: string;
  }

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [backgroundInfo, setBackgroundInfo] = useState<BackgroundInfo>({
    industry_info: '',
    audience_info: '',
    company_name: '',
    company_culture: '',
    company_industry: '',
    company_competition: '',
    user_role: '',
    project_title: '',
    project_dutys: '',
    project_goals: '',
    project_theme: '',
    project_aim: '',
    content_needs: '',
    format_style: ''
  });

  const [showUpload, setShowUpload] = useState(false);

  const questions = [
    { key: 'company_name', question: '请问您所在的公司名是？' },
    { key: 'company_culture', question: '您公司的企业文化和核心价值观是什么？' },
    { key: 'company_industry', question: '您公司在行业中的定位是？' },
    { key: 'company_competition', question: '公司的主要竞争优势有哪些？' },
    { key: 'user_role', question: '您在公司担任什么角色？' },
    { key: 'industry_info', question: '能简单描述下您所在行业的背景情况吗？' },
    { key: 'project_title', question: '本次培训针对的职位名称是？' },
    { key: 'project_dutys', question: '这个职位的主要职责包括哪些？' },
    { key: 'project_goals', question: '本次培训的主要目标是什么？' },
    { key: 'project_theme', question: '需要覆盖哪些培训主题？' },
    { key: 'project_aim', question: '开展此次培训的主要目的是？' },
    { key: 'content_needs', question: '对培训内容有什么具体要求？' },
    { key: 'format_style', question: '期望的培训格式和风格是怎样的？' },
    { key: 'audience_info', question: '培训对象是哪些人员？' },
    { key: 'file_or_not', question: '您想要上传文件并据此生成文档还是使用模板？' },
   
  ];
  const base_url = API_BASE_URL;

  useEffect(() => {
    if (location.state?.topic) {
      setLoading(true);
      setTimeout(() => setLoading(false), 2000);
    }
  }, [location.state?.topic]);

  const token = localStorage.getItem('token');

  const generateOutline = async (description: string, files: File[] = []) => {
    setLoading(true);
    try {




      const formData = new FormData();
      formData.append('description', description);
      formData.append('ai_model', 'gpt-4o-mini');
      
      // Add files if available
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`${base_url}/api/storage/generate_outline_and_upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate outline');
      }

      const data = await response.json();
      
      if (data.outline) {
        setOutline(parseOutlineText(data.outline));
      } else {
        throw new Error('No outline generated');
      }
    } catch (error) {
      console.error('Error generating outline:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate outline",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const handleAIGenerate = () => {
    console.log("Starting AI chat...");
    setShowChat(true);
    setCurrentStep(0);
    setChatHistory([{
      type: 'bot',
      content: questions[0].question
    }]);
  };

  const topics: string[] = [
    "新员工入职培训方案",
    "销售技能提升培训",
    "客户服务标准培训",
    "团队管理能力培训",
    "项目管理实践培训",
    "职业素养提升培训",
    "领导力发展培训",
    "沟通技巧提升培训",
    "时间管理效能培训",
    "企业文化建设培训",
    "危机处理能力培训",
    "创新思维培养培训",
    "跨部门协作培训"
  ];

  const [isSubmitting] = useState(false);

  // 添加上传文件状态
  const [files, setFiles] = useState<File[]>([]);

  const handleAnswer = (answer: string) => {
    if (!answer.trim()) return;
    
    if (currentStep >= questions.length) return;
    
    const currentQuestion = questions[currentStep];
    
    setBackgroundInfo(prev => ({
      ...prev,
      [currentQuestion.key]: answer.trim()
    }));
    setChatHistory(prev => [...prev, { type: 'user', content: answer }]);
    
    // 检查是否是最后个问题
    if (currentStep === questions.length - 1) {
      console.log('Last question answered, mode:', selectedMode); // 调试日志
      
      if (selectedMode === 1) {
        console.log('Showing upload component'); // 调试日志
        setShowUpload(true);
        setShowChat(false);
        // 确保上传组件显示
        setTimeout(() => {
          if (!showUpload) {
            setShowUpload(true);
            setShowChat(false);
          }
        }, 100);
      } else if (selectedMode === 2 || selectedMode === 3) {
        navigate('/templates', { 
          state: { 
            backgroundInfo,
            mode: selectedMode 
          } 
        });
      }
    } else {
      setCurrentStep(prev => prev + 1);
      setInput('');
      setTimeout(() => {
        setChatHistory(prev => [...prev, 
          { type: 'bot', content: questions[currentStep + 1].question }
        ]);
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 500);
    }
  };

  const [hasCompletedConversation, setHasCompletedConversation] = useState<boolean>(false);

  // 添加上传确认处理函数
  const handleUploadConfirm = async (uploadSuccess: boolean, uploadedFiles?: File[]) => {
    if (!uploadSuccess || !uploadedFiles || uploadedFiles.length === 0) {
      return;
    }

    // Store the files for later use
    setFiles(uploadedFiles);

    try {
      setLoading(true);
      setGeneratingOutline(true);
      
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      console.log('Using token:', token);  // 调试日志
      
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const completeBackgroundInfo = {
        ...backgroundInfo,
      };
      formData.append('description', JSON.stringify(completeBackgroundInfo));
      formData.append('ai_model', 'gpt-4o-mini');

      // 修改请求头的设置方式
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      // 不要设置 Content-Type，因为是 FormData

      const response = await fetch(`${base_url}/api/storage/generate_outline_and_upload/`, {
        method: 'POST',
        headers: headers,
        body: formData,
        credentials: 'include'  // 添加这个选项
      });
  

      // 打印响应详情以便调试
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);  // 试日志
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      console.log('response', response);

      const data = await response.json();
      console.log('Received outline data:', data);
      
      if (data.outline) {
        const parsedOutline = parseOutlineText(data.outline);
        console.log('Parsed outline:', parsedOutline);
        
        setOutline(parsedOutline);
        setHasCompletedConversation(true);
        
        toast({
          title: "生成成功",
          description: "大纲已生成完成",
          duration: 3000,
        });
      } else {
        console.error('No outline data received:', data);
        toast({
          title: "生成失败",
          description: "未能生成大纲",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error generating outline:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成大纲时发生错误",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setLoading(false);
      setGeneratingOutline(false);
    }
  };

  const handleAllQuestionsCompleted = async () => {
    setHasCompletedConversation(true);
    
    // 如果是模板模式，完成后跳转到模板页
    if (selectedMode === 1) {
      navigate('/templates', { 
        state: { 
          backgroundInfo,
          mode: 1 
        } 
      });
      return;
    }

    // AI智能生成或导入企业文件生成模式
    if (files.length > 0) {
      // 开始生成大纲
      await handleGeneration(files);
    } else {
      toast({
        title: "生成失败",
        description: "请先上传文件",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (currentStep >= questions.length) {
      handleAllQuestionsCompleted();
    }
  }, [currentStep]);
// 添加类型定义

  // 添加生成函数
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneration = async (files: File[]) => {
    try {
      setIsGenerating(true);
      setGeneratingOutline(true);  // 添加生成中状态
      
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      console.log('Using token:', token);  // 调试日志
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const completeBackgroundInfo = {
        ...backgroundInfo,
      };
      formData.append('description', JSON.stringify(completeBackgroundInfo));
      formData.append('ai_model', 'gpt-4o-mini');

      // 修改请求头的设置方式
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      // 不要设置 Content-Type，因为是 FormData

      const response = await fetch(`${base_url}/api/storage/generate_outline_and_upload/`, {
        method: 'POST',
        headers: headers,
        body: formData,
        credentials: 'include'  // 添加这个选项
      });
  

      // 打印响应详情以便调试
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);  // 试日志
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      console.log('response', response);

      const data = await response.json();
      setOutline(parseOutlineText(data.outline));
      
    } catch (error) {
      console.error('Error generating outline:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "生成大纲时发生错误",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingOutline(false);  // 清除生成中状态
    }
  };

  // 添加解析大纲文本的函数
  const parseOutlineText = (text: string): OutlineSection[] => {
    const lines = text.split('\n').map(line => line.trim());
    const outline: OutlineSection[] = [];
    let currentSection: OutlineSection | null = null;
    let currentContent: string[] = [];
    let currentItems: string[] = [];
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line && !currentSection) continue;
  
      if (line.startsWith('#')) {
        if (currentSection) {
          if (currentContent.length > 0) {
            currentSection.content = currentContent.join('\n');
          }
          if (currentItems.length > 0) {
            currentSection.items = currentItems;
          }
          outline.push(currentSection);
          currentContent = [];
          currentItems = [];
        }
  
        const level = line.match(/^#+/)?.[0].length || 1;
        currentSection = {
          title: line.replace(/^#+\s*/, ''),
          level: level,
          items: [],
          content: ''
        };
      } else if (line.startsWith('-') && currentSection) {
        if (currentContent.length > 0) {
          currentSection.content = currentContent.join('\n');
          currentContent = [];
        }
        currentItems.push(line.replace(/^-\s*/, ''));
      } else if (currentSection) {
        if (currentItems.length > 0 && line) {
          currentSection.items = currentItems;
          currentItems = [];
        }
        currentContent.push(line);
      }
    }
  
    if (currentSection) {
      if (currentContent.length > 0) {
        currentSection.content = currentContent.join('\n');
      }
      if (currentItems.length > 0) {
        currentSection.items = currentItems;
      }
      outline.push(currentSection);
    }
  
    return outline;
  };

  // 添加大纲编辑卡片组件
  

  // 添加重生成大纲的函数
  const [showImprovementInput, setShowImprovementInput] = useState(false);
  const [improvementDirection, setImprovementDirection] = useState("");

  const handleRegenerateOutline = async () => {
    if (!improvementDirection.trim()) {
      toast({
        title: "请输入修改方向",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    console.log('improvementDirection', improvementDirection);

    try {
      setLoading(true);
      setGeneratingOutline(true);

      // Check if we have files
      if (!files || files.length === 0) {
        window.alert('Please upload at least one file with content.');
        setLoading(false);
        setGeneratingOutline(false);
        return;
      }

      // Update background info with improvement direction
      const updatedBackgroundInfo = {
        ...backgroundInfo,
        requirements: improvementDirection.trim()
      };
      setBackgroundInfo(updatedBackgroundInfo);

      const formData = new FormData();
      formData.append('description', JSON.stringify(updatedBackgroundInfo));
      
      // Add stored files
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      formData.append('ai_model', 'gpt-4o-mini');
      
      const token = localStorage.getItem('token');
      console.log('FormData contents for regeneration:');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await fetch(`${base_url}/api/storage/generate_outline_and_upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      
      if (data.outline) {
        setOutline(parseOutlineText(data.outline));
      } else {
        throw new Error('No outline generated');
      }

    } catch (error) {
      console.error('Error regenerating outline:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate outline",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setGeneratingOutline(false);
    }
  };

  const handleRegenerateClick = () => {
    setShowImprovementInput(true);
  };

  const handleImprovementSubmit = async () => {
    if (!improvementDirection.trim()) {
      toast({
        title: "请输入修改方向",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    console.log('improvementDirection', improvementDirection);
    await handleRegenerateOutline();
  };

  // 添加 navigate
  const navigate = useNavigate();

  // Add new state for mode selection
  const [selectedMode, setSelectedMode] = useState<number>(0);

 


  const handlePreview = () => {
    // 如果没有大纲数据，直接返回
    if (!outline || outline.length === 0) {
      toast({
        title: "无法预览",
        description: "请先生成大纲内容",
        variant: "destructive",
      });
      return;
    }

    // 跳转到生成页面并传递数据
    navigate('/generated-document', { 
      state: { 
        outline: outline,
        backgroundInfo: backgroundInfo,
        uploadedFiles: files // 添加文件信息
      }
    });
  };

  // 修复状态声明
  const [outlineText, setOutlineText] = useState<string>('');

  // 添加处理函数
  const handleOutlineTextChange = (text: string) => {
    setOutlineText(text);
    const newOutline = parseOutlineText(text);
    setOutline(newOutline);
  };

  const outlineToText = (sections: OutlineSection[]): string => {
    return sections.map(section => {
      let text = '#'.repeat(section.level) + ' ' + section.title + '\n';
      if (section.content) {
        text += section.content + '\n';
      }
      if (section.items && section.items.length > 0) {
        text += section.items.map(item => '- ' + item).join('\n') + '\n';
      }
      return text;
    }).join('\n');
  };


  useEffect(() => {
    if (outline.length > 0) {
      setOutlineText(outlineToText(outline));
    }
  }, [outline]);

  const renderEditableOutline = () => {
    return (
      <div className="p-4 bg-amber-50 rounded-lg">
        <textarea
          value={outlineText}
          onChange={(e) => handleOutlineTextChange(e.target.value)}
          className="w-full h-[400px] p-4 font-mono text-amber-600 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
          placeholder="大纲内容..."
        />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
        <Link 
          to="#" 
          className="flex items-center gap-2"
          onClick={(e) => {
            e.preventDefault();
            navigate(-1);
          }}
        >
          <ArrowLeft className="h-5 w-5 text-amber-600" />
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <Link to="/help">
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5 text-amber-600" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <Recycle className="h-5 w-5 text-amber-600" />
          </Button>
        </div>
      </header>
      <main className="flex flex-1 gap-4 p-4">
        <div className="grid w-full gap-4">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-600">
                  Hi~尊敬的用户，我是您的AI智能助理小A，请问您想通过什么方式来生成PPT呢？
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50"
                  onClick={() => {
                    setSelectedMode(1);  // AI智能生成
                    handleAIGenerate();
                  }}
                >
                  <Bot className="h-8 w-8 text-amber-500" />
                  <span>AI智能生成</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50"
                  onClick={() => {
                    setSelectedMode(2);  // 使用模板生成
                    handleAIGenerate();
                  }}
                >
                  <FileText className="h-8 w-8 text-amber-500" />
                  <span>使用模板生成</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50"
                  onClick={() => {
                    setSelectedMode(3);  // 混合模板+自由生成
                    handleAIGenerate();
                  }}
                >
                  <LayoutTemplate className="h-8 w-8 text-amber-500" />
                  <span>混合模板+自由生成</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div className="mb-4">
                <p className="text-sm text-amber-600">
                  您可以在下方输入您想要的文档主题，若能补充行业、用途、岗位等信息，智能生成的大纲内容会更丰富哦
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="bg-amber-100 text-amber-600">
                    参考文档
                  </Badge>
                  <Badge variant="outline" className="border-amber-200 text-amber-600">页数 20-30页</Badge>
                  <Badge variant="outline" className="border-amber-200 text-amber-600">受众 大众</Badge>
                  <Badge variant="outline" className="border-amber-200 text-amber-600">场景 通用</Badge>
                </div>
                <div className="relative">
                  <Input
                    placeholder="请输入文档主题，如：新员工职培训方案"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="border-amber-200 focus:border-amber-300 focus:ring-amber-300"
                  />
                  <Button
                    className="absolute right-1 top-1 h-7 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white"
                    size="sm"
                    onClick={() => {
                      setSelectedMode(1);  // AI智能生成
                      handleAIGenerate();
                    }}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    AI生成
                  </Button>
                </div>
                <ScrollArea className="h-[120px]">
                  <div className="flex flex-wrap gap-2">
                    {topics.map((topic) => (
                      <Badge
                        key={topic}
                        variant="secondary"
                        className="cursor-pointer bg-amber-50 text-amber-600 hover:bg-amber-100"
                        onClick={() => setInput(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              {}
              {showChat && (
        <div className="mt-6">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {chatHistory.map((message, index) => (
                <div key={index} className="space-y-2">
                  {message.type === 'bot' && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg p-3 bg-amber-50">
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-medium text-amber-600">AI助理</span>
                        </div>
                        <p className="text-sm text-amber-800">{message.content}</p>
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-lg p-3 bg-gradient-to-r from-amber-600 to-amber-500">
                        <p className="text-sm text-white">{message.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showUpload && (
                <DocumentUpload 
                  onUploadComplete={(files) => {
                    setFiles(files.map(file => file as unknown as File));
                    console.log('Files saved:', files.map(f => f.name));
                  }}
                  maxFileSize={20 * 1024 * 1024}
                  acceptedFileTypes={['.doc', '.docx', '.pdf', '.txt', '.md']}
                  onConfirm={handleUploadConfirm}
                  hasCompletedConversation={hasCompletedConversation}
                />
              )}

              {!showUpload && (
                <div className="flex justify-end mt-4">
                  <div className="max-w-[80%] w-full">
                    <div className="relative">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="按回车发送消息..."
                        className="pr-20 border-amber-200 focus-visible:ring-amber-500 focus-visible:ring-1 focus-visible:border-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && input.trim()) {
                            e.preventDefault();
                            handleAnswer(input);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {isSubmitting && (
                <div className="flex items-center justify-center mt-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-amber-600">正在提交...</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {currentStep >= questions.length && (
            <Button
              className="w-full mt-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white"
              onClick={() => generateOutline(input, files)}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              开始生成培训大纲
            </Button>
          )}
        </div>
      )}

              <div className="mt-4 flex justify-between">
                <div className="flex flex-col gap-4 flex-grow mr-4">
                  <div className="flex gap-2">
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-amber-200 text-amber-600 hover:bg-amber-50"
                      onClick={handlePreview}
                      disabled={!outline || outline.length === 0}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      预览正文
                    </Button>
                    <div className="flex gap-2 items-center">
                      {showImprovementInput && (
                        <Input
                          value={improvementDirection}
                          onChange={(e) => setImprovementDirection(e.target.value)}
                          placeholder="请输入改进方向..."
                          className="w-48 border-amber-200"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && improvementDirection.trim()) {
                              handleImprovementSubmit();
                            }
                          }}
                        />
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-200 text-amber-600 hover:bg-amber-50"
                        onClick={handleRegenerateClick}
                        disabled={isGenerating}
                      >
                        <Recycle className="mr-2 h-4 w-4" />
                        {showImprovementInput ? '确认改进' : '换个大纲'}
                      </Button>
                    </div>
                  </div>

                  {/* 大纲内容显示区域 */}
                  {outline.length > 0 && (
                    <div className="p-4 bg-amber-50 rounded-lg">
                      {renderEditableOutline()}
                    </div>
                  )}
                </div>

                
              </div>
            </CardContent>
          </Card>
          {showUpload && (
            <Card className="bg-white shadow-sm mt-4">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <Bot className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-600">
                    请上传的企业文件，我们将基于文件内容为您生成相关文档
                  </p>
                </div>
                <DocumentUpload 
                  onUploadComplete={(files) => {
                    setFiles(files.map(file => file as unknown as File));
                    console.log('Files saved:', files.map(f => f.name));
                  }}
                  maxFileSize={20 * 1024 * 1024}
                  acceptedFileTypes={['.doc', '.docx', '.pdf', '.md']}
                  onConfirm={handleUploadConfirm}
                  hasCompletedConversation={hasCompletedConversation}
                />
              </CardContent>
            </Card>
          )}
          {/* Add improvement direction input dialog */}
          {showImprovementInput && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="text-lg font-medium mb-4">请输入修改方向</h3>
                <Input
                  value={improvementDirection}
                  onChange={(e) => setImprovementDirection(e.target.value)}
                  placeholder="例如：增加更多技术细节..."
                  className="mb-4"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImprovementInput(false);
                      setImprovementDirection("");
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleImprovementSubmit}
                    disabled={!improvementDirection.trim()}
                  >
                    确认
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
     
      {(isGenerating || generatingOutline) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-[300px] p-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <div className="text-center">
                <h3 className="font-semibold text-lg mb-2">正在生成大纲</h3>
                <p className="text-sm text-gray-500">请稍候，这可能需要一点时间...</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OutlineGenerator;