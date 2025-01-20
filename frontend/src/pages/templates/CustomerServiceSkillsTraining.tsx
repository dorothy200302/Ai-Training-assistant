import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import DocumentUpload from '@/components/DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {  Loader2, CheckCircle2, FileDown } from 'lucide-react'
import { createApiRequest } from '@/utils/errorHandler'
import { EditableCard } from '@/components/EditableCard'
import { EditableText } from '@/components/EditableText'
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2 as MessageCircle, ShieldCheck, Zap, HeartHandshake, Plus, Save, Copy, FileUp as FileUpIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import {  useToast as useToastHook } from '../../hooks/use-token'
import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import { API_BASE_URL } from '@/config/constants'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LoadingOverlay } from "@/components/ui/loading-overlay";

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


const CustomerServiceSkillsTraining: React.FC = () => {


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
      content: "掌握有效沟通技巧，提客户满意度...",
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

  const [isEditing] = useState<{ [key: string]: boolean }>({})

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
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToastHook();

  const handleEdit = (field: string, value: any) => {
    setProgressData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleModuleNameEdit = (id: string, newValue: string) => {
    setModules(modules.map(module =>
      module.id === id ? { ...module, name: newValue } : module
    ))
  }

  const toggleModuleCompletion = (moduleId: string) => {
    setCompletedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
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

  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast({
          title: "认证错误",
          description: "请先登录",
          variant: "destructive",
        });
        throw new Error('未登录');
      }

      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',

        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: '客户服务技能培训手册',
          isBase64: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.detail === 'Token not found or expired') {
          localStorage.removeItem('token');
          toast({
            title: "认证过期",
            description: "请重新登录",
            variant: "destructive",
          });
          throw new Error('认证过期');
        }
        throw new Error(errorData?.detail || '保存到后端失败');
      }

      
      const formData = new URLSearchParams();
      formData.append('document_name', '客户服务技能培训手册');
      formData.append('document_type', fileType);
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleUploadConfirm = async (files: File[], description?: string) => {
    if (!files || files.length === 0) {
      setShowUpload(false);
      return;
    }
    
    try {
      setIsGenerating(true);
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('template', 'customer_service');
      formData.append('description', JSON.stringify({
        userDescription: description || ''
      }));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'customer_service',
        token: token ? 'present' : 'missing'
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        
        body: formData
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || '文档生成失败');
      }

      const data = await response.json();
      console.log('Response data:', data);
      setDocumentContent(data.document || data.content || '');
      
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
      setShowUpload(false);  // Hide the upload modal
    }
  };

  const handleDownloadPdfFrontend = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4'
      });
      
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(20);
      doc.text('客户服务技能培训手册', 40, 40);
      
      doc.setFontSize(12);
      const contentLines = documentContent.split('\n');
      let y = 80;
      
      contentLines.forEach((line) => {
        if (y > 780) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 40, y);
        y += 20;
      });
      
      const pdfBlob = doc.output('blob');
      
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '客户服务技能培训手册.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await saveToBackend(pdfBlob, 'pdf');
      
      toast({
        title: "下载成功",
        description: "文档已下载为PDF格式",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "生成PDF失败",
        description: error instanceof Error ? error.message : "PDF生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadWordFrontend = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "客户服务技能培训手册",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({}),
            ...documentContent.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24,
                  }),
                ],
              })
            ),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '客户服务技能培训手册.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await saveToBackend(blob, 'docx');

      toast({
        title: "下载成功",
        description: "文档已下载为Word格式",
      });
    } catch (error) {
      console.error('Word generation error:', error);
      toast({
        title: "生成Word失败",
        description: error instanceof Error ? error.message : "Word生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <div className="container mx-auto p-4 relative min-h-screen">
      {isGenerating && (
        <LoadingOverlay 
          isLoading={isGenerating}
          message="正在生成客户服务技能培训文档..."
        />
      )}
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
            disabled={isGenerating}
            className="fixed bottom-8 right-8 p-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 flex items-center gap-2 z-50"
          >
            <FileUpIcon className="h-5 w-5" />
            <span>上传文档生成</span>
          </button>

          {/* Upload modal */}
          {showUpload && (
            <Dialog open={showUpload} onOpenChange={setShowUpload}>
              <DialogContent className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <DialogHeader>
                  <DialogTitle>上传文档</DialogTitle>
                  <DialogDescription>
                    请选择要上传的文档，系统将自动生成培训内容。
                  </DialogDescription>
                </DialogHeader>
                <DocumentUpload 
                  endpoint="/api/documents/upload"
                  isUploading={isUploading}
                  setIsUploading={setIsUploading}
                  onConfirm={handleUploadConfirm}
                  onCancel={() => setShowUpload(false)}
                  isLoading={isGenerating}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Document Content Section */}
          {documentContent && (
            <div className="mt-8">
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={handleDownloadPdfFrontend}
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
                  onClick={handleDownloadWordFrontend}
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
                onClick={() => {}}
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