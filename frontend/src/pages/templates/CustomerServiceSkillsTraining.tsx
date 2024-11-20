import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast'
import DocumentUpload from '@/components/DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileUp, Loader2, CheckCircle2, FileDown } from 'lucide-react'

import { useLocation } from 'react-router-dom'
import { EditableCard } from '@/components/EditableCard'
import { EditableText } from '@/components/EditableText'
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2 as CheckCircle, MessageCircle, ShieldCheck, Zap, HeartHandshake, ThumbsUp, Plus, Save, Trash, Copy, FileUp as FileUpIcon, Loader2 as Loader, HeartHandshake as HeartHandshakeIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useNavigate } from 'react-router-dom';
import { useToken, useToast as useToastHook } from '../../hooks/use-token'

interface Module {
  id: string
  name: string
  icon: JSX.Element
  content?: string
  scenarios?: Scenario[]
}

interface Scenario {
  id: string
  title: string
  description: string
  points: string[]
}

interface ProgressSection {
  id: string;
  title: string;
  percentage: number;
  completedModules: Array<{ id: string; name: string }>;// 
  pendingModules: Array<{ id: string; name: string }>;// 
}

interface DocumentContent {
  title: string;
  overview: string;
  sections: Array<{
    title: string;
    content: string;
    subsections?: Array<{
      title: string;
      content: string;
    }>;
  }>;
}

const CustomerServiceSkillsTraining: React.FC = () => {
  const location = useLocation();

  const [title, setTitle] = useState("客户服务技巧培训")
  const [subtitle, setSubtitle] = useState("提升客户满意度的服务技巧")
  const [overview, setOverview] = useState(
    "本培训旨在提升您的客户服务技能，帮助您更好地理解和满足客户需求，从而提高客户满意度和忠诚度。"
  )
  
  const [modules, setModules] = useState<Module[]>([
    {
      id: 'communication',
      name: '有效沟通',
      icon: <MessageCircle className="w-6 h-6" />,
      content: "掌握有效沟通技巧，提升客户满意度...",
      scenarios: [
        {
          id: nanoid(),
          title: "处理投诉",
          description: "客户对产品表示不满，需要及时处理",
          points: [
            "保持冷静和专业态度",
            "积极倾听客户的抱怨",
            "表达理解和歉意",
            "提出解决方案"
          ]
        }
      ]
    },
    {
      id: 'problem-solving',
      name: '问题解决',
      icon: <ShieldCheck className="w-6 h-6" />,
      content: "高效解决客户问题的方法...",
      scenarios: []
    },
    {
      id: 'empathy',
      name: '同理心',
      icon: <HeartHandshake className="w-6 h-6" />,
      content: "培养对客户需求的理解和共情能力...",
      scenarios: []
    },
    {
      id: 'efficiency',
      name: '高效服务',
      icon: <Zap className="w-6 h-6" />,
      content: "提高服务效率，减少客户等待时间...",
      scenarios: []
    }
  ])

  const [completedModules, setCompletedModules] = useState<string[]>([])

  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({})

  const [progressData, setProgressData] = useState<ProgressSection>({
    id: 'progress1',
    title: '总体完成度',
    percentage: 75,
    completedModules: [
      { id: 'cm1', name: '客户沟通基础' },
      { id: 'cm2', name: '投诉处理技巧' }
    ],
    pendingModules: [
      { id: 'pm1', name: '服务质量提升' }
    ]
  });

  const [documentContent, setDocumentContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToastHook();

  const handleEdit = (field: string, value: any) => {
    setProgressData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addCompletedModule = () => {
    setProgressData(prev => ({
      ...prev,
      completedModules: [...prev.completedModules, {
        id: `cm${prev.completedModules.length + 1}`,
        name: '新完成模块'
      }]
    }));
  };

  const addPendingModule = () => {
    setProgressData(prev => ({
      ...prev,
      pendingModules: [...prev.pendingModules, {
        id: `pm${prev.pendingModules.length + 1}`,
        name: '新待完成模块'
      }]
    }));
  };

  const handleModuleNameEdit = (id: string, newValue: string) => {
    setModules(modules.map(module =>
      module.id === id ? { ...module, name: newValue } : module
    ))
  }

  const toggleEdit = (id: string) => {
    setIsEditing(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const toggleModuleCompletion = (moduleId: string) => {
    setCompletedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const calculateProgress = () => {
    return (completedModules.length / modules.length) * 100
  }

  const handleAddModule = () => {
    const newModule: Module = {
      id: nanoid(),
      name: '新模块',
      icon: <MessageCircle className="w-6 h-6" />,
      content: "请编辑此模块内容...",
      scenarios: []
    }
    setModules([...modules, newModule])
  }

  const handleDeleteModule = (moduleId: string) => {
    setModules(modules.filter(module => module.id !== moduleId))
    setCompletedModules(completedModules.filter(id => id !== moduleId))
  }

  const handleAddScenario = (moduleId: string) => {
    const newScenario: Scenario = {
      id: nanoid(),
      title: "新场景",
      description: "请编辑场景描述...",
      points: ["添加练习要点"]
    }
    setModules(modules.map(module =>
      module.id === moduleId
        ? { ...module, scenarios: [...(module.scenarios || []), newScenario] }
        : module
    ))
  }

  const handleDeleteScenario = (moduleId: string, scenarioId: string) => {
    setModules(modules.map(module =>
      module.id === moduleId
        ? { ...module, scenarios: module.scenarios?.filter(s => s.id !== scenarioId) }
        : module
    ))
  }

  const handleSaveTemplate = () => {
    console.log('Saving template...', {
      title,
      subtitle,
      overview,
      modules,
      completedModules
    })
  }

  const handleCopyModule = (moduleId: string) => {
    setModules(prev => {
      const moduleToCopy = prev.find(module => module.id === moduleId);
      if (!moduleToCopy) return prev;
      
      return [...prev, {
        ...moduleToCopy,
        id: nanoid(),
        name: `${moduleToCopy.name} (复制)`,
        scenarios: moduleToCopy.scenarios?.map(scenario => ({
          ...scenario,
          id: nanoid(),
        })),
      }];
    });
  };

  const handleUploadConfirm = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
      setShowUpload(false);
      return;
    }

    try {
      setIsGenerating(true);
      const token = localStorage.getItem('token');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('template_type', 'customer_service_skills');
      
      // First generate outline
      const outlineResponse = await fetch('http://localhost:8001/api/generate_outline', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!outlineResponse.ok) {
        throw new Error('大纲生成失败');
      }

      const outlineData = await outlineResponse.json();
      
      // Then generate full document
      const fullDocResponse = await fetch('http://localhost:8001/api/generate_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outline: outlineData.outline,
          template_type: 'customer_service_skills',
          original_file: files[0].name
        })
      });

      if (!fullDocResponse.ok) {
        throw new Error('文档生成失败');
      }

      const fullDocData = await fullDocResponse.json();
      setDocumentContent(fullDocData.content);
      setShowUpload(false);
      
      toast({
        title: "生成成功",
        description: "客户服务技能培训文档已生成",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  const handleConfirm = () => {
    toast({
      title: "确认成功",
      description: "您已确认阅读完成",
    });
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8001/storage/download_document/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: documentContent,
          format: format,
          filename: '客户服务技能培训'
        })
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `客户服务技能培训.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "下载成功",
        description: `文档已下载为${format.toUpperCase()}格式`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "文档下载失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const navigate = useNavigate();
  const token = useToken();

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <EditableText
            value={title}
            onChange={setTitle}
            className="text-3xl font-bold mb-2"
          />
          <EditableText
            value={subtitle}
            onChange={setSubtitle}
            className="text-amber-100"
          />
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训概述</h2>
            <EditableText
              value={overview}
              onChange={setOverview}
              multiline
              className="text-amber-700"
            />
          </section>

          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-amber-800">培训模块</h2>
              <Button
                onClick={handleAddModule}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" /> 添加模块
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((module) => (
                <EditableCard
                  key={module.id}
                  title={module.name}
                  isEditing={isEditing[module.id]}
                  onEdit={(newName: string) => handleModuleNameEdit(module.id, newName)}
                  onDelete={() => handleDeleteModule(module.id)}
                  onTitleChange={(newName: string) => handleModuleNameEdit(module.id, newName)}
                  className={`bg-amber-50 border-amber-200 cursor-pointer ${
                    completedModules.includes(module.id) ? 'ring-2 ring-green-500' : ''
                  }`}
                  extraButtons={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyModule(module.id)}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  }
                >
                  <div className="flex items-center mb-4">
                    <div className="bg-amber-100 rounded-full p-3 mr-4">
                      {module.icon}
                    </div>
                    <EditableText
                      value={module.content || ""}
                      onChange={(newContent) => {
                        setModules(modules.map(m =>
                          m.id === module.id ? {...m, content: newContent} : m
                        ))
                      }}
                      multiline
                      className="text-amber-700"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleModuleCompletion(module.id)}
                    className="w-full"
                  >
                    {completedModules.includes(module.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        已完成
                      </>
                    ) : (
                      "标记为已完成"
                    )}
                  </Button>
                </EditableCard>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训进度</h2>
            <EditableCard
              title={progressData.title}
              className="bg-amber-50 border-amber-200"
              onTitleChange={(newTitle) => handleEdit('title', newTitle)}
              onEdit={() => {}}
            >
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-amber-700 font-semibold">{progressData.title}</span>
                    <Input
                      type="number"
                      value={progressData.percentage}
                      onChange={(e) => handleEdit('percentage', Number(e.target.value))}
                      className="w-20 text-right"
                      min="0"
                      max="100"
                    />
                  </div>
                  <Progress 
                    value={progressData.percentage} 
                    className="w-full bg-amber-200 [&>div]:bg-amber-500"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">已完成模块</h3>
                  <ul className="space-y-1 text-amber-700">
                    {progressData.completedModules.map(module => (
                      <li key={module.id} className="flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                        {module.name}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </EditableCard>
          </section>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveTemplate}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              <Save className="w-4 h-4 mr-2" />
              保存模板
            </Button>
          </div>

          {/* Floating upload button */}
          <button
            onClick={() => setShowUpload(true)}
            className="fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-2 z-50"
          >
            <FileUpIcon className="h-5 w-5" />
            <span>上传文档生成</span>
          </button>

          {/* Upload modal */}
          {showUpload && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <DocumentUpload 
                  onUpload={handleUploadConfirm}
                  endpoint="http://localhost:8001/api/upload_document"
                  isUploading={isGenerating}
                  setIsUploading={setIsGenerating}
                />
              </div>
            </div>
          )}

          {/* Document Content Section */}
          {documentContent && (
            <div className="mt-8">
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => handleDownload('pdf')}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  下载PDF
                </Button>
                <Button
                  onClick={() => handleDownload('docx')}
                  disabled={isDownloading}
                  variant="outline"
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  下载Word
                </Button>
              </div>
              <div className="prose prose-amber max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {documentContent}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          {documentContent && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleConfirm}
                className="bg-green-500 hover:bg-green-600 text-white"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                确认已阅读
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustomerServiceSkillsTraining