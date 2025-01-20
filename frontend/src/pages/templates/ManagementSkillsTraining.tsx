import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ClipboardList, BarChart, CheckCircle2, FileText, Target, FileUp, Loader2, FileDown } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import DocumentUpload from '@/components/DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EditableText } from '@/components/EditableText'
import { API_BASE_URL } from '../../config/constants'
import { createApiRequest } from "@/utils/errorHandler"; // 新增错误处理工具
import { EditableDocumentContent } from "@/components/EditableDocumentContent";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
interface PageContent {
  title: string;
  subtitle: string;
  overview: string;
  sections: Array<{
    id: string;
    title: string;
    content: string[];
  }>;
  exercises: Array<{
    id: string;
    title: string;
    goal: string;
    steps: string[];
  }>;
}

const ManagementSkillsTraining: React.FC = () => {
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [documentContent, setDocumentContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [isUploading, setIsUploading] = useState(false);


  const [pageContent, setPageContent] = useState<PageContent>({
    title: '项目管理培训文档',
    subtitle: '掌握项目管理技能，提升团队效率',
    overview: '本培训旨在帮助学员掌握项目管理的核心概念、方法论和最佳实践。通过理论学习和实践练习，学员将能够有效地规划、执行和控制项目，确保项目按时、按预算完成，并达到预期的质量标准。',
    sections: [
      {
        id: 'intro',
        title: '项目管理简介',
        content: [
          '项目管理的定义和重要性',
          '项目生命周期',
          '项目管理知识领域',
          '项目经理的角色和职责'
        ]
      },
      {
        id: 'planning',
        title: '项目规划',
        content: [
          '制定项目章程',
          '识别干系人',
          '创建工作分解结构（WBS）',
          '进度规划和资源配置'
        ]
      },
      {
        id: 'execution',
        title: '项目执行',
        content: [
          '团队管理和领导力',
          '沟通管理',
          '质量保证',
          '采购管理'
        ]
      },
      {
        id: 'monitoring',
        title: '监控与控制',
        content: [
          '进度和成本控制',
          '挣值管理',
          '变更控制',
          '风险监控'
        ]
      },
      {
        id: 'closing',
        title: '项目收尾',
        content: [
          '验收和移交',
          '经验教训总结',
          '项目文档归档',
          '团队解散和资源释放'
        ]
      }
    ],
    exercises: [
      {
        id: 'exercise1',
        title: '项目章程编写',
        goal: '练习目标：编写一个完整的项目章程',
        steps: [
          '定义项目目标和范围',
          '识别关键干系人',
          '列出主要里程碑',
          '估算预算和时间表'
        ]
      },
      {
        id: 'exercise2',
        title: '风险管理计划',
        goal: '练习目标：为一个拟项目创建风险管理计划',
        steps: [
          '识别潜在风险',
          '评估风险概率和影响',
          '制定风险应对策略',
          '创建风险跟踪矩阵'
        ]
      },
      {
        id: 'exercise3',
        title: '项目进度规划',
        goal: '练习目标：使用甘特图创建项目进度计划',
        steps: [
          '定义项目任务和工作包',
          '估算任务持续时间',
          '确定任务依赖关系',
          '分配资源并平衡工作负载'
        ]
      }
    ]
  })

  const [sections] = useState([
    { id: 'intro', title: '项目管理简介', isEditing: false },
    { id: 'planning', title: '项目规划', isEditing: false },
    { id: 'execution', title: '项目执行', isEditing: false },
    { id: 'monitoring', title: '监控与控制', isEditing: false },
    { id: 'closing', title: '项目收尾', isEditing: false },
  ]);

  const updateContent = (
    section: keyof PageContent | { section: string; index: number; field: string },
    value: string
  ) => {
    setPageContent(prev => {
      if (typeof section === 'string') {
        return { ...prev, [section]: value }
      }
      
      const { section: sectionName, index, field } = section
      const newContent = { ...prev }
      
      if (sectionName === 'sections' || sectionName === 'exercises') {
        if (field === 'title') {
          newContent.sections[index].title = value;
        } else if (field === 'content') {
          newContent.sections[index].content = [...prev.sections[index].content];
          newContent.sections[index].content[index] = value;
        } else if (field === 'goal') {
          newContent.exercises[index] = {
            ...newContent.exercises[index],
            goal: value
          }
        } else if (field === 'steps') {
          const stepIndex = parseInt(field.split('-')[1])
          const newSteps = [...newContent.exercises[index].steps]
          newSteps[stepIndex] = value
          newContent.exercises[index] = {
            ...newContent.exercises[index],
            steps: newSteps
          }
        }
      }
      
      return newContent
    })
  }

  const toggleSectionCompletion = (sectionId: string) => {
    setCompletedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const calculateProgress = () => {
    return (completedSections.length / sections.length) * 100
  }

  const handleUploadConfirm = async (files: File[]) => {
    if (!files || files.length === 0) {
      setShowUpload(false);
      return;
    }

    try {
      setIsGenerating(true);
      const formData = new FormData();
      formData.append('template', 'management_skills');
      formData.append('description', JSON.stringify({
        title: pageContent.title,
        subtitle: pageContent.subtitle,
        overview: pageContent.overview,
        sections: pageContent.sections,
        exercises: pageContent.exercises
      }));

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setDocumentContent(data.document || data.content || '');
      
      toast({
        title: "生成成功",
        description: "管理技能培训文档已生成",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "生成失败",
        description: "生成文档时发生错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowUpload(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
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

      // 将文件内容转换为base64字符串
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          // 移除base64前缀（例如："data:application/pdf;base64,"）
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      // 使用现有的download_document接口
      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',
 　 　
        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: '管理技能培训手册',
          isBase64: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || '保存到后端失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `管理技能培训手册.${fileType}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "下载成功",
        description: `文档已保存为${fileType.toUpperCase()}格式`,
      });
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4'
      });
      
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(20);
      doc.text('管理技能培训手册', 40, 40);
      
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
      
      await saveToBackend(pdfBlob, 'pdf');
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

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "管理技能培训手册",
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
      
      await saveToBackend(blob, 'docx');
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
          <EditableText
            value={pageContent.title}
            onChange={(value) => updateContent('title', value)}
            className="text-3xl font-bold mb-2"
          />
          <EditableText
            value={pageContent.subtitle}
            onChange={(value) => updateContent('subtitle', value)}
            className="text-amber-100"
          />
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训概述</h2>
            <EditableText
              value={pageContent.overview}
              onChange={(value) => updateContent('overview', value)}
              className="text-amber-700 mb-4"
              
            />
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训模块</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section) => (
                <Card 
                  key={section.id} 
                  className={`bg-amber-50 border-amber-200 cursor-pointer transition-all ${
                    completedSections.includes(section.id) ? 'ring-2 ring-green-500' : ''
                  }`}
                  onClick={() => toggleSectionCompletion(section.id)}
                >
                  <CardContent className="pt-6 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-amber-100 rounded-full p-3 mr-4">
                        {section.id === 'intro' && <FileText className="w-6 h-6 text-amber-600" />}
                        {section.id === 'planning' && <ClipboardList className="w-6 h-6 text-amber-600" />}
                        {section.id === 'execution' && <Target className="w-6 h-6 text-amber-600" />}
                        {section.id === 'monitoring' && <BarChart className="w-6 h-6 text-amber-600" />}
                        {section.id === 'closing' && <CheckCircle2 className="w-6 h-6 text-amber-600" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-amber-800">{section.title}</h3>
                        <p className="text-amber-600 text-sm">
                          {completedSections.includes(section.id) ? '已完成' : '点击标记为已完成'}
                        </p>
                      </div>
                    </div>
                    {completedSections.includes(section.id) && (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训内容详情</h2>
            <Tabs defaultValue="intro" className="w-full">
              <TabsList className="grid w-full grid-cols-5 bg-amber-100">
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                    {section.title}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="preview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                  预览
                </TabsTrigger>
              </TabsList>
              <TabsContent value="intro">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">
                      <EditableText
                        value={pageContent.sections[0].title}
                        onChange={(value) => updateContent({ section: 'sections', index: 0, field: 'title' }, value)}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      {pageContent.sections[0].content.map((item, idx) => (
                        <li key={idx}>
                          <EditableText
                            value={item}
                            onChange={(value) => {
                              const newSections = [...pageContent.sections];
                              newSections[0].content[idx] = value;
                              setPageContent(prev => ({ ...prev, sections: newSections }));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="planning">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">
                      <EditableText
                        value={pageContent.sections[1].title}
                        onChange={(value) => updateContent({ section: 'sections', index: 1, field: 'title' }, value)}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      {pageContent.sections[1].content.map((item, idx) => (
                        <li key={idx}>
                          <EditableText
                            value={item}
                            onChange={(value) => {
                              const newSections = [...pageContent.sections];
                              newSections[1].content[idx] = value;
                              setPageContent(prev => ({ ...prev, sections: newSections }));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="execution">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">
                      <EditableText
                        value={pageContent.sections[2].title}
                        onChange={(value) => {
                          const newSections = [...pageContent.sections];
                          newSections[2].title = value;
                          setPageContent(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      {pageContent.sections[2].content.map((item, idx) => (
                        <li key={idx}>
                          <EditableText
                            value={item}
                            onChange={(value) => {
                              const newSections = [...pageContent.sections];
                              newSections[2].content[idx] = value;
                              setPageContent(prev => ({ ...prev, sections: newSections }));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="monitoring">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">
                      <EditableText
                        value={pageContent.sections[3].title}
                        onChange={(value) => {
                          const newSections = [...pageContent.sections];
                          newSections[3].title = value;
                          setPageContent(prev => ({ ...prev, sections: newSections }));
                        }}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      {pageContent.sections[3].content.map((item, idx) => (
                        <li key={idx}>
                          <EditableText
                            value={item}
                            onChange={(value) => {
                              const newSections = [...pageContent.sections];
                              newSections[3].content[idx] = value;
                              setPageContent(prev => ({ ...prev, sections: newSections }));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="closing">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">项目收尾</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      <li>验收和移交</li>
                      <li>经验教训总结</li>
                      <li>项目文档归档</li>
                      <li>团队解散和资源释放</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="exercises" className="space-y-4">
                {pageContent.exercises.map((exercise, exerciseIndex) => (
                  <Card key={exercise.id}>
                    <CardHeader>
                      <CardTitle className="text-xl font-bold">{exercise.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <EditableText
                            value={exercise.goal}
                            onChange={(value) => updateContent({ section: 'exercises', index: exerciseIndex, field: 'goal' }, value)}
                            className="text-lg font-semibold mb-2"
                          />
                          <div className="space-y-2">
                            {exercise.steps.map((step, stepIndex) => (
                              <EditableText
                                key={stepIndex}
                                value={step}
                                onChange={(value) => updateContent({ section: 'exercises', index: exerciseIndex, field: `steps-${stepIndex}` }, value)}
                                className="flex items-center gap-2"
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <EditableDocumentContent
                  content={documentContent}
                  onContentChange={setDocumentContent}
                  documentTitle="管理技能培训手册"
                />
              </TabsContent>
            </Tabs>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">实践练习</h2>
            <div className="space-y-6">
              {pageContent.exercises.map((exercise, exerciseIndex) => (
                <Card key={exercise.id} className="border-l-4 border-l-amber-500">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">
                      <EditableText
                        value={exercise.title}
                        onChange={(value) => updateContent({ section: 'exercises', index: exerciseIndex, field: 'title' }, value)}
                        className="text-xl font-bold"
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <EditableText
                        value={exercise.goal}
                        onChange={(value) => updateContent({ section: 'exercises', index: exerciseIndex, field: 'goal' }, value)}
                        className="text-lg font-semibold mb-4 text-amber-700"
                      />
                    </div>
                    <div className="space-y-2 pl-4">
                      {exercise.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start gap-2">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <EditableText
                            value={step}
                            onChange={(value) => updateContent({ 
                              section: 'exercises', 
                              index: exerciseIndex, 
                              field: `steps-${stepIndex}` 
                            }, value)}
                            className="flex-1 text-gray-700"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训进度</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-700 font-semibold">总体完成度</span>
                      <span className="text-amber-700 font-semibold">{calculateProgress().toFixed(0)}%</span>
                    </div>
                    <Progress value={calculateProgress()} className="w-full bg-amber-200"  />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">已完成模块</h3>
                    <ul className="space-y-1 text-amber-700">
                      {completedSections.map(sectionId => {
                        const section = sections.find(s => s.id === sectionId)
                        return section ? (
                          <li key={sectionId} className="flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                            {section.title}
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowUpload(true)}
              disabled={isGenerating}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  上传文档
                </>
              )}
            </Button>
            {documentContent && (
              <>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      下载中...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      下载PDF
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadWord}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      下载中...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      下载Word
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {documentContent && (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-end gap-2 mb-4">
            <Button
              onClick={handleDownloadWord}
              disabled={!documentContent || isDownloading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              下载Word
            </Button>
          </div>
          <EditableDocumentContent
            content={documentContent}
            onContentChange={setDocumentContent}
            documentTitle="管理技能培训手册"
          />
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <DocumentUpload 
              endpoint="/api/storage/download_document"
              isUploading={isUploading}
              setIsUploading={setIsUploading}
              onConfirm={handleUploadConfirm}
              onCancel={handleUploadCancel}
              isLoading={isGenerating}
            />
          </div>
        </div>
      )}

      {isGenerating && <LoadingOverlay isLoading={isGenerating} message="正在生成管理技能培训文档..." />}
      {documentContent && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {documentContent || ''}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManagementSkillsTraining