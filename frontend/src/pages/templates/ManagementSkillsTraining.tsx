import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ClipboardList, Users, BarChart, Calendar, CheckCircle2, FileText, Layers, Target, FileUp, Loader2, FileDown } from 'lucide-react'
import { toast } from "@/hooks/use-toast"
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import DocumentUpload from '@/components/DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ManagementSkillsTraining: React.FC = () => {
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [documentContent, setDocumentContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const sections = [
    { id: 'intro', title: '项目管理简介' },
    { id: 'planning', title: '项目规划' },
    { id: 'execution', title: '项目执行' },
    { id: 'monitoring', title: '监控与控制' },
    { id: 'closing', title: '项目收尾' },
  ]

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

      formData.append('template', 'management_skills');
      formData.append('description', JSON.stringify({
        title: '管理技能培训手册',
        subtitle: '提升您的管理能力',
        overview: '本手册旨在帮助您掌握核心管理技能，提高团队效率。',
        content: documentContent,
        training_sections: sections.map(section => ({
          id: section.id,
          title: section.title,
          completed: completedSections.includes(section.id)
        }))
      }));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'management_skills',
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
      setDocumentContent(data.document ?? data.content ?? '');
      
      toast({
        title: "生成成功",
        description: "管理技能培训文档已生成",
      });

      // Scroll to the generated content
      setTimeout(() => {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
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
      const response = await fetch('http://localhost:8001/api/storage/download_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
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
          <h1 className="text-3xl font-bold mb-2">项目管理培训文档</h1>
          <p className="text-amber-100">掌握项目管理技能，提升团队效率</p>
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">培训概述</h2>
            <p className="text-amber-700 mb-4">
              本培训旨在帮助学员掌握项目管理的核心概念、方法论和最佳实践。通过理论学习和实践练习，学员将能够有效地规划、执行和控制项目，确保项目按时、按预算完成，并达到预期的质量标准。
            </p>
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
              </TabsList>
              <TabsContent value="intro">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">项目管理简介</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      <li>项目管理的定义和重要性</li>
                      <li>项目生命周期</li>
                      <li>项目管理知识领域</li>
                      <li>项目经理的角色和职责</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="planning">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">项目规划</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      <li>制定项目章程</li>
                      <li>识别干系人</li>
                      <li>创建工作分解结构（WBS）</li>
                      <li>进度规划和资源分配</li>
                      <li>风险识别和管理</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="execution">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">项目执行</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      <li>团队管理和领导力</li>
                      <li>沟通管理</li>
                      <li>质量保证</li>
                      <li>采购管理</li>
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="monitoring">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">监控与控制</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-amber-700">
                      <li>进度和成本控制</li>
                      <li>挣值管理</li>
                      <li>变更控制</li>
                      <li>风险监控</li>
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
            </Tabs>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">实践练习</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="exercise1">
                    <AccordionTrigger className="text-amber-700 hover:text-amber-800">项目章程编写</AccordionTrigger>
                    <AccordionContent className="text-amber-600">
                      <p>练习目标：编写一个完整的项目章程</p>
                      <ul className="list-disc list-inside mt-2">
                        <li>定义项目目标和范围</li>
                        <li>识别关键干系人</li>
                        <li>列出主要里程碑</li>
                        <li>估算预算和时间表</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="exercise2">
                    <AccordionTrigger className="text-amber-700 hover:text-amber-800">风险管理计划</AccordionTrigger>
                    <AccordionContent className="text-amber-600">
                      <p>练习目标：为一个虚拟项目创建风险管理计划</p>
                      <ul className="list-disc list-inside mt-2">
                        <li>识别潜在风险</li>
                        <li>评估风险概率和影响</li>
                        <li>制定风险应对策略</li>
                        <li>创建风险跟踪矩阵</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="exercise3">
                    <AccordionTrigger className="text-amber-700 hover:text-amber-800">项目进度规划</AccordionTrigger>
                    <AccordionContent className="text-amber-600">
                      <p>练习目标：使用甘特图创建项目进度计划</p>
                      <ul className="list-disc list-inside mt-2">
                        <li>定义项目任务和工作包</li>
                        <li>估算任务持续时间</li>
                        <li>确定任务依赖关系</li>
                        <li>分配资源并平衡工作负载</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
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

      {showUpload && (
        <DocumentUpload
          onConfirm={handleUploadConfirm}
          onCancel={handleUploadCancel}
        />
      )}

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