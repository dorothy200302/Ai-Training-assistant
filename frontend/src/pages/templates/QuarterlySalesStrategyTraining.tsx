import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { BarChart, Target, Users, Zap, Calendar, CheckCircle2, Plus } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Pencil, Save } from 'lucide-react'
import { FileUp, Loader2, Download, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DocumentUpload from '../DocumentUpload';
import jsPDF from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';

interface TrainingModule {
  id: string
  title: string
  content: string
  isEditing?: boolean
}

interface ActionStep {
  id: string
  week: string
  title: string
  description: string
  isEditing?: boolean
}

interface TrainingObjective {
  id: string
  icon: string
  content: string
  isEditing?: boolean
}

interface EditableText {
  id: string;
  content: string;
  isEditing: boolean;
}

const QuarterlySalesStrategyTraining: React.FC = () => {
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1)
  const [modules, setModules] = useState<TrainingModule[]>([
    { id: 'module1', title: '市场分析与预测', content: '学习如何分析市场趋势，预测客户需求，并据此调整销售策略。' },
    { id: 'module2', title: '高级谈判技巧', content: '掌握复杂销售情境下的谈判策略，提高成单率。' },
    { id: 'module3', title: '数字化销售工具应用', content: '熟练使用CRM系统和销售分析工具，提升工作效率。' }
  ])

  const [quarters, setQuarters] = useState([
    { id: 1, name: "第一季度", focus: "开年计划与目标设定", isEditing: false },
    { id: 2, name: "第二季度", focus: "客户关系深化与跨部门协作", isEditing: false },
    { id: 3, name: "第三季度", focus: "创新销售技巧与新市场开拓", isEditing: false },
    { id: 4, name: "第四季度", focus: "年终冲刺与来年规划", isEditing: false }
  ])

  const [actionSteps, setActionSteps] = useState<ActionStep[]>([
    { id: 'step1', week: '第1-2周', title: '培训准备与启动', description: '制定详细培训计划准备培训材料' },
    { id: 'step2', week: '第3-6周', title: '核心培训模块实施', description: '开展集中培训，包括理论学习和实践演练' },
    // ... add other steps
  ])

  const [objectives, setObjectives] = useState<TrainingObjective[]>([
    { id: 'obj1', icon: 'Target', content: '增加季度销售额 20%' },
    { id: 'obj2', icon: 'Users', content: '提高客户满意度至 95%' },
    { id: 'obj3', icon: 'Zap', content: '推出 2 个新的销售策略' }
  ])

  const [inputFields, setInputFields] = useState([
    { id: 1, value: "现有输入内容1" },
    { id: 2, value: "现有输入内容2" }
  ]);

  const [pageTexts, setPageTexts] = useState<EditableText[]>([
    { id: 'overview-title', content: '季度销售策略培训模板', isEditing: false },
    { id: 'overview-subtitle', content: '提升您的团队销售能力，实现卓越业绩', isEditing: false }
  ]);

  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { toast } = useToast();

  const handleModuleEdit = (moduleId: string, field: 'title' | 'content', value: string) => {
    setModules(prev => prev.map(module =>
      module.id === moduleId ? { ...module, [field]: value } : module
    ))
  }

  const handleActionStepEdit = (stepId: string, field: 'title' | 'description', value: string) => {
    setActionSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, [field]: value } : step
    ))
  }

  const handleObjectiveEdit = (objId: string, value: string) => {
    setObjectives(prev => prev.map(obj =>
      obj.id === objId ? { ...obj, content: value } : obj
    ))
  }

  const addNewModule = () => {
    const newId = `module${modules.length + 1}`
    setModules(prev => [...prev, {
      id: newId,
      title: '新培训模块',
      content: '请输入培训内容',
      isEditing: true
    }])
  }

  const addNewObjective = () => {
    const newId = `obj${objectives.length + 1}`
    setObjectives(prev => [...prev, {
      id: newId,
      icon: 'Target',
      content: '新目标',
      isEditing: true
    }])
  }

  const handleQuarterEdit = (quarterId: number, field: 'name' | 'focus', value: string) => {
    setQuarters(prev => prev.map(quarter =>
      quarter.id === quarterId ? { ...quarter, [field]: value } : quarter
    ))
  }

  const handleInputChange = (id: number, newValue: string) => {
    setInputFields(prev => prev.map(field => 
      field.id === id ? { ...field, value: newValue } : field
    ));
  };

  const addNewInputField = () => {
    const newId = inputFields.length + 1;
    setInputFields(prev => [...prev, { id: newId, value: "" }]);
  };

  const duplicateModule = (moduleId: string) => {
    const moduleToCopy = modules.find(m => m.id === moduleId);
    if (moduleToCopy) {
      const newId = `module${modules.length + 1}`;
      setModules(prev => [...prev, {
        ...moduleToCopy,
        id: newId,
        title: `${moduleToCopy.title} (副本)`,
        isEditing: false
      }]);
    }
  }

  const handleUploadConfirm = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
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

      formData.append('template', 'quarterly_sales_strategy');
      formData.append('description', JSON.stringify({
        title: '季度销售策略培训手册',
        subtitle: '提升销售业绩的季度指南',
        overview: '本手册提供了季度销售策略和目标达成方法。',
        objectives: objectives,
        modules: modules,
        actionSteps: actionSteps,
        selectedQuarter: selectedQuarter
      }));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'quarterly_sales_strategy',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch('http://localhost:8001/api/storage/generate_full_doc_with_template/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
        description: "季度销售策略培训文档已生成",
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
      setShowUpload(false);
    }
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

      const response = await fetch('http://localhost:8001/api/storage/download_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: '季度销售策略培训手册',
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

      const data = await response.json();
      console.log('Save to backend response:', data);
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
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
      doc.text('季度销售策略培训手册', 40, 40);
      
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
      a.download = '季度销售策略培训手册.pdf';
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
              text: "季度销售策略培训手册",
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
      a.download = '季度销售策略培训手册.docx';
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
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{pageTexts.find(text => text.id === 'overview-title')?.content}</h1>
          <p className="text-amber-100">{pageTexts.find(text => text.id === 'overview-subtitle')?.content}</p>
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训概述</h2>
            <p className="text-amber-700 mb-4">
              本培训模板旨在帮助销售团队制定和执行每个季度的销售策略。通过系统化的培训和实践，我们将确保团队始终保持竞争力，并能够适应不断变化的市场环境。
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">选择季度</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {quarters.map((quarter) => (
                <Card 
                  key={quarter.id} 
                  className={`bg-amber-50 border-amber-200 cursor-pointer transition-all ${
                    selectedQuarter === quarter.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                  onClick={() => setSelectedQuarter(quarter.id)}
                >
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <Calendar className="w-8 h-8 text-amber-500 mb-2" />
                    <h3 className="text-lg font-semibold text-amber-800">{quarter.name}</h3>
                    <p className="text-sm text-amber-600 mt-2">{quarter.focus}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">季度培训详情</h2>
            <Tabs defaultValue="objectives" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-amber-100">
                <TabsTrigger value="objectives" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">关键目标</TabsTrigger>
                <TabsTrigger value="modules" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">培训模块</TabsTrigger>
                <TabsTrigger value="action-plan" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">行动计划</TabsTrigger>
              </TabsList>
              <TabsContent value="objectives">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">第 {selectedQuarter} 季度关键目标</CardTitle>
                    <CardDescription className="text-amber-600">聚焦本季度的核心销售目标</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      {objectives.map(objective => (
                        <li key={objective.id} className="flex items-center group">
                          {objective.isEditing ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                value={objective.content}
                                onChange={(e) => handleObjectiveEdit(objective.id, e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setObjectives(prev =>
                                  prev.map(obj => obj.id === objective.id ? { ...obj, isEditing: false } : obj)
                                )}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Target className="w-5 h-5 text-amber-500 mr-2" />
                              <span>{objective.content}</span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 ml-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setObjectives(prev =>
                                    prev.map(obj => obj.id === objective.id ? { ...obj, isEditing: true } : obj)
                                  )}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newId = `obj${objectives.length + 1}`;
                                    setObjectives(prev => [...prev, {
                                      ...objective,
                                      id: newId,
                                      isEditing: false
                                    }]);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="modules">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">培训模块</CardTitle>
                    <CardDescription className="text-amber-600">本季度重点培训内容</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {modules.map(module => (
                        <AccordionItem key={module.id} value={module.id}>
                          <AccordionTrigger className="text-amber-700 hover:text-amber-800 group">
                            {module.isEditing ? (
                              <Input
                                value={module.title}
                                onChange={(e) => handleModuleEdit(module.id, 'title', e.target.value)}
                                className="inline-block w-auto"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{module.title}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100"
                                  onClick={() => setModules(prev =>
                                    prev.map(m => m.id === module.id ? { ...m, isEditing: true } : m)
                                  )}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="text-amber-600 group">
                            {module.isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={module.content}
                                  onChange={(e) => handleModuleEdit(module.id, 'content', e.target.value)}
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setModules(prev =>
                                    prev.map(m => m.id === module.id ? { ...m, isEditing: false } : m)
                                  )}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{module.content}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="opacity-0 group-hover:opacity-100"
                                  onClick={() => setModules(prev =>
                                    prev.map(m => m.id === module.id ? { ...m, isEditing: true } : m)
                                  )}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="action-plan">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">行动计划</CardTitle>
                    <CardDescription className="text-amber-600">实施步骤与时间表</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ol className="space-y-4 text-amber-700">
                      {actionSteps.map((step, index) => (
                        <li key={step.id} className="flex items-start group">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-700 font-bold mr-2">
                            {index + 1}
                          </span>
                          <div>
                            <h4 className="font-semibold">{step.title}</h4>
                            <p className="text-amber-600">{step.description}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训进度</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-700 font-semibold">总体完成度</span>
                      <span className="text-amber-700 font-semibold">75%</span>
                    </div>
                    <Progress 
                      value={75} 
                      className="w-full bg-amber-200 [&>div]:bg-amber-500" 
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">已完成模块</h3>
                      <ul className="space-y-1 text-amber-700">
                        <li className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          市场分析与预测
                        </li>
                        <li className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          高级谈判技巧
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-amber-800 mb-2">待完成模块</h3>
                      <ul className="space-y-1 text-amber-700">
                        <li className="flex items-center">
                          <BarChart className="w-4 h-4 text-amber-500 mr-2" />
                          数字化销售工具应用
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-between items-center mb-6">
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  上传文档生成
                </>
              )}
            </Button>
            
            {documentContent && (
              <>
                <Button
                  onClick={handleDownloadPdfFrontend}
                  variant="outline"
                  disabled={isDownloading}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  下载 PDF
                </Button>
                <Button
                  onClick={handleDownloadWordFrontend}
                  variant="outline"
                  disabled={isDownloading}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  下载 Word
                </Button>
              </>
            )}
          </div>

          {showUpload && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <DocumentUpload 
                  onConfirm={handleUploadConfirm}
                  isLoading={isGenerating}
                  onCancel={() => setShowUpload(false)}
                />
              </div>
            </div>
          )}

          {documentContent && (
            <div className="mt-8">
              <Card className="bg-white">
                <CardContent className="prose max-w-none p-6">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {documentContent}
                  </ReactMarkdown>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default QuarterlySalesStrategyTraining