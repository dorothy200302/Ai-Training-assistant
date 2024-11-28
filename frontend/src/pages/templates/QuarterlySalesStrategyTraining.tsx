import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {  Plus, Trash2 } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Save } from 'lucide-react'
import {  Loader2, FileDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
import { API_BASE_URL } from "../../config/constants"
import { DocumentUpload } from '@/components/ui/document-upload'
import { Loading } from '@/components/ui/loading'

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
  id: string
  content: string
  isEditing: boolean
}

const QuarterlySalesStrategyTraining: React.FC = () => {
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1)
  const [modules] = useState<TrainingModule[]>([
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
    { id: 'step1', week: '第1-2周', title: '培训准备与启动', description: '制定详细培训计划准备培训材料', isEditing: false },
    { id: 'step2', week: '第3-6周', title: '核心培训模块实施', description: '开展集中培训，包括理论学习和实践演练', isEditing: false },
    // ... add other steps
  ])

  const [objectives] = useState<TrainingObjective[]>([
    { id: 'obj1', icon: 'Target', content: '增加季度销售额 20%' },
    { id: 'obj2', icon: 'Users', content: '提高客户满意度至 95%' },
    { id: 'obj3', icon: 'Zap', content: '推出 2 个新的销售策略' }
  ])

  const [pageTexts, setPageTexts] = useState<EditableText[]>([
    { id: 'overview-title', content: '季度销售策略培训模板', isEditing: false },
    { id: 'overview-subtitle', content: '提升您的团队销售能力，实现卓越业绩', isEditing: false },
    { id: 'overview-description', content: '本培训模板旨在帮助销售团队制定和执行每个季度的销售策略。通过系统化的培训和实践，我们将确保团队始终保持竞争力，并能够适应不断变化的市场环境。', isEditing: false }
  ])

  const [documentContent, setDocumentContent] = useState<string>('')
  const [showUpload, setShowUpload] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const { toast } = useToast()
  const base_url = API_BASE_URL

  const handleUpload = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
      setShowUpload(false)
      return
    }

    try {
      setIsGenerating(true)
      const formData = new FormData()
      const token = localStorage.getItem('token')

      files.forEach(file => {
        formData.append('files', file)
      })

      formData.append('template', 'quarterly_sales_strategy')
      formData.append('description', JSON.stringify({
        title: '季度销售策略培训手册',
        subtitle: '提升销售业绩的季度指南',
        overview: '本手册提供了季度销售策略和目标达成方法。',
        objectives: objectives,
        modules: modules,
        actionSteps: actionSteps,
        selectedQuarter: selectedQuarter
      }))

      console.log('Sending request to generate template...')
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'quarterly_sales_strategy',
        token: token ? 'present' : 'missing'
      })

      const response = await fetch(`${base_url}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      console.log('Response status:', response.status)
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(errorText || '文档生成失败')
      }

      const data = await response.json()
      console.log('Response data:', data)
      setDocumentContent(data.document || data.content || '')

      toast({
        title: "生成成功",
        description: "季度销售策略培训文档已生成",
      })
    } catch (error) {
      console.error('Generation error:', error)
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setShowUpload(false)
    }
  }

  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
    try {
      const token = localStorage.getItem('token')

      if (!token) {
        toast({
          title: "认证错误",
          description: "请先登录",
          variant: "destructive",
        })
        throw new Error('未登录')
      }

      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => {
          const base64String = reader.result as string
          const base64Content = base64String.split(',')[1] || base64String
          resolve(base64Content)
        }
        reader.readAsDataURL(fileBlob)
      })

      const response = await fetch(`${base_url}/api/storage/download_document`, {
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
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        if (errorData?.detail === 'Token not found or expired') {
          localStorage.removeItem('token')
          toast({
            title: "认证过期",
            description: "请重新登录",
            variant: "destructive",
          })
          throw new Error('认证过期')
        }
        throw new Error(errorData?.detail || '保存到后端失败')
      }

      const data = await response.json()
      console.log('Save to backend response:', data)
    } catch (error) {
      console.error('Save to backend error:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      })
    }
  }

  const handleDownloadWordFrontend = async () => {
    try {
      setIsDownloading(true)

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
      })

      const blob = await Packer.toBlob(doc)

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = '季度销售策略培训手册.docx'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      await saveToBackend(blob, 'docx')

      toast({
        title: "下载成功",
        description: "文档已下载为Word格式",
      })
    } catch (error) {
      console.error('Word generation error:', error)
      toast({
        title: "生成Word失败",
        description: error instanceof Error ? error.message : "Word生成失败，请重试",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleQuarterEdit = (quarterId: number, field: 'name' | 'focus', value: string) => {
    setQuarters(prev => prev.map(q =>
      q.id === quarterId ? { ...q, [field]: value } : q
    ))
  }

  const handleActionStepEdit = (stepId: string, field: 'week' | 'title' | 'description', value: string) => {
    setActionSteps(prev => prev.map(step =>
      step.id === stepId ? { ...step, [field]: value } : step
    ))
  }

  const handleAddActionStep = () => {
    const newStep: ActionStep = {
      id: `step${actionSteps.length + 1}`,
      week: '新周期',
      title: '新步骤',
      description: '请输入步骤描述',
      isEditing: true
    }
    setActionSteps(prev => [...prev, newStep])
  }

  const handleDeleteActionStep = (stepId: string) => {
    setActionSteps(prev => prev.filter(step => step.id !== stepId))
  }

  const handlePageTextEdit = (textId: string, value: string) => {
    setPageTexts(prev => prev.map(text =>
      text.id === textId ? { ...text, content: value } : text
    ))
  }

  const toggleEditing = (type: string, id: string) => {
    switch (type) {
      case 'quarter':
        setQuarters(prev => prev.map(q =>
          q.id === Number(id) ? { ...q, isEditing: !q.isEditing } : q
        ))
        break
      case 'actionStep':
        setActionSteps(prev => prev.map(step =>
          step.id === id ? { ...step, isEditing: !step.isEditing } : step
        ))
        break
      case 'pageText':
        setPageTexts(prev => prev.map(text =>
          text.id === id ? { ...text, isEditing: !text.isEditing } : text
        ))
        break
    }
  }

  return (
    <div className="container mx-auto p-6">
      {isGenerating && <Loading text="正在生成文档..." />}
      <Card className="mb-6">
        <CardHeader>
          {pageTexts.map(text => (
            <div key={text.id} className="mb-2">
              {text.isEditing ? (
                <div className="flex gap-2">
                  <Input
                    value={text.content}
                    onChange={(e) => handlePageTextEdit(text.id, e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => toggleEditing('pageText', text.id)}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  {text.id === 'overview-title' ? (
                    <CardTitle>{text.content}</CardTitle>
                  ) : text.id === 'overview-subtitle' ? (
                    <CardDescription>{text.content}</CardDescription>
                  ) : (
                    <p>{text.content}</p>
                  )}
                  <Button variant="ghost" onClick={() => toggleEditing('pageText', text.id)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>季度选择</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={String(selectedQuarter)} onValueChange={(v) => setSelectedQuarter(Number(v))}>
              <TabsList className="grid grid-cols-4 w-full">
                {quarters.map(quarter => (
                  <TabsTrigger key={quarter.id} value={String(quarter.id)}>
                    {quarter.isEditing ? (
                      <Input
                        value={quarter.name}
                        onChange={(e) => handleQuarterEdit(quarter.id, 'name', e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      <span onClick={() => toggleEditing('quarter', String(quarter.id))}>
                        {quarter.name}
                      </span>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              {quarters.map(quarter => (
                <TabsContent key={quarter.id} value={String(quarter.id)}>
                  <Card>
                    <CardHeader>
                      <CardTitle>重点内容</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {quarter.isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={quarter.focus}
                            onChange={(e) => handleQuarterEdit(quarter.id, 'focus', e.target.value)}
                          />
                          <Button onClick={() => toggleEditing('quarter', String(quarter.id))}>
                            <Save className="h-4 w-4 mr-2" />保存
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <p>{quarter.focus}</p>
                          <Button variant="ghost" onClick={() => toggleEditing('quarter', String(quarter.id))}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>行动步骤</span>
              <Button onClick={handleAddActionStep} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />添加步骤
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {actionSteps.map(step => (
                <AccordionItem key={step.id} value={step.id}>
                  <AccordionTrigger>
                    {step.isEditing ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          value={step.week}
                          onChange={(e) => handleActionStepEdit(step.id, 'week', e.target.value)}
                          className="w-24"
                        />
                        <Input
                          value={step.title}
                          onChange={(e) => handleActionStepEdit(step.id, 'title', e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>{step.week}</span>
                        <span>{step.title}</span>
                      </div>
                    )}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {step.isEditing ? (
                        <>
                          <Textarea
                            value={step.description}
                            onChange={(e) => handleActionStepEdit(step.id, 'description', e.target.value)}
                          />
                          <div className="flex justify-end gap-2">
                            <Button onClick={() => toggleEditing('actionStep', step.id)}>
                              <Save className="h-4 w-4 mr-2" />保存
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteActionStep(step.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />删除
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between items-center">
                          <p>{step.description}</p>
                          <Button variant="ghost" onClick={() => toggleEditing('actionStep', step.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>

      {/* Document Content Section */}
      {documentContent && (
        <div className="bg-white rounded-lg shadow-lg p-8 mt-4">
          <div className="flex justify-end gap-2 mb-4">
            <Button
              onClick={handleDownloadWordFrontend}
              disabled={!documentContent || isDownloading}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              下载Word文档
            </Button>
          </div>
          <div className="prose max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{documentContent}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Document Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-2/3">
            <DocumentUpload 
              onUpload={handleUpload} 
              onCancel={() => setShowUpload(false)} 
              disabled={isGenerating}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default QuarterlySalesStrategyTraining