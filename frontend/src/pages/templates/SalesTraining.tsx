import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PlusCircle, Trash2, Save, Edit2, FileDown, FileUp, Loader2 } from 'lucide-react'
import DocumentUpload from '../DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API_BASE_URL } from "../../config/constants";
import { toast } from "@/hooks/use-toast"
import { Loading } from '@/components/ui/loading'

const SalesTraining: React.FC = () => {
  const [sections, setSections] = useState([
    {
      id: '1',
      title: '销售基础',
      content: '销售是一门艺术，也是一门科学。本节将介绍销售的基本概念和原则。',
      subsections: [
        { id: '1-1', title: '什么是销售', content: '销售是通过有效沟通和说服，将产品或服务转化为客户价值的过程。' },
        { id: '1-2', title: '销售流程', content: '了解客户需求 → 提供解决方案 → 处理异议 → 达成交易 → 后续跟进' },
      ]
    },
    {
      id: '2',
      title: '沟通技巧',
      content: '有效的沟通是成功销售的关键。本节将介绍如何提升您的沟通技巧。',
      subsections: [
        { id: '2-1', title: '积极倾听', content: '专注于客户的话语，理解他们的需求和关切。' },
        { id: '2-2', title: '提问技巧', content: '使用开放式问题深入了解客户需求，引导对话方向。' },
      ]
    },
  ])

  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editingSubsection, setEditingSubsection] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const Base_URL = API_BASE_URL;

  const handleAddSection = () => {
    const newSection = {
      id: `${sections.length + 1}`,
      title: '新章节',
      content: '请在此输入章节内容。',
      subsections: []
    }
    setSections([...sections, newSection])
  }

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(section => section.id !== id))
  }

  const handleEditSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(section => 
      section.id === id ? { ...section, [field]: value } : section
    ))
  }

  const handleAddSubsection = (sectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const newSubsection = {
          id: `${sectionId}-${section.subsections.length + 1}`,
          title: '新小节',
          content: '请在此输入小节内容。'
        }
        return { ...section, subsections: [...section.subsections, newSubsection] }
      }
      return section
    }))
  }

  const handleDeleteSubsection = (sectionId: string, subsectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, subsections: section.subsections.filter(sub => sub.id !== subsectionId) }
      }
      return section
    }))
  }

  const handleEditSubsection = (sectionId: string, subsectionId: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          subsections: section.subsections.map(sub => 
            sub.id === subsectionId ? { ...sub, [field]: value } : sub
          )
        }
      }
      return section
    }))
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

      formData.append('template', 'sales_training');
      formData.append('description', JSON.stringify({
        sections: sections.map(section => ({
          title: section.title,
          content: section.content,
          subsections: section.subsections
        }))
      }));

      const response = await fetch(`${Base_URL}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('文档生成失败');
      }

      const data = await response.json();
      setDocumentContent(data.document || data.content || '');
      
      toast({
        title: "生成成功",
        description: "销售培训文档已生成",
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

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  const handleDownloadWordFrontend = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`${Base_URL}/api/word/generate/?template=sales_training`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sections }),
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '销售培训手册.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "下载成功",
        description: "文档已成功下载到您的设备",
      });
    } catch (error) {
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "文档下载失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      {isGenerating && <Loading text="正在生成文档..." />}
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">销售技能培训手册</h1>
          <p className="text-amber-100">提升您的销售技能，成为顶尖销售精英</p>
        </div>
        
        <div className="p-6">
          <Tabs defaultValue={sections[0]?.id} className="w-full">
            <div className="flex justify-between items-center mb-4">
              <TabsList className="bg-amber-100">
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button onClick={handleAddSection} className="bg-green-500 hover:bg-green-600 text-white">
                <PlusCircle className="w-4 h-4 mr-2" /> 添加章节
              </Button>
            </div>
            {sections.map((section) => (
              <TabsContent key={section.id} value={section.id}>
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    {editingSection === section.id ? (
                      <div className="space-y-2">
                        <Input
                          value={section.title}
                          onChange={(e) => handleEditSection(section.id, 'title', e.target.value)}
                          className="font-bold text-xl text-amber-800"
                        />
                        <Textarea
                          value={section.content}
                          onChange={(e) => handleEditSection(section.id, 'content', e.target.value)}
                          className="text-amber-700"
                        />
                        <Button onClick={() => setEditingSection(null)} className="bg-amber-500 hover:bg-amber-600 text-white">
                          <Save className="w-4 h-4 mr-2" /> 保存
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <CardTitle className="text-amber-800 flex justify-between items-center">
                          {section.title}
                          <div>
                            <Button onClick={() => setEditingSection(section.id)} variant="ghost" size="sm" className="mr-2">
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button onClick={() => handleDeleteSection(section.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardTitle>
                        <p className="text-amber-700 mt-2">{section.content}</p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {section.subsections.map((subsection) => (
                        <AccordionItem key={subsection.id} value={subsection.id}>
                          <AccordionTrigger className="text-amber-800 hover:text-amber-900">
                            {subsection.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            {editingSubsection === subsection.id ? (
                              <div className="space-y-2">
                                <Input
                                  value={subsection.title}
                                  onChange={(e) => handleEditSubsection(section.id, subsection.id, 'title', e.target.value)}
                                  className="font-semibold text-amber-800"
                                />
                                <Textarea
                                  value={subsection.content}
                                  onChange={(e) => handleEditSubsection(section.id, subsection.id, 'content', e.target.value)}
                                  className="text-amber-700"
                                />
                                <Button onClick={() => setEditingSubsection(null)} className="bg-amber-500 hover:bg-amber-600 text-white">
                                  <Save className="w-4 h-4 mr-2" /> 保存
                                </Button>
                              </div>
                            ) : (
                              <div>
                                <p className="text-amber-700">{subsection.content}</p>
                                <div className="flex justify-end mt-2">
                                  <Button onClick={() => setEditingSubsection(subsection.id)} variant="ghost" size="sm" className="mr-2">
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button onClick={() => handleDeleteSubsection(section.id, subsection.id)} variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                    <Button onClick={() => handleAddSubsection(section.id)} className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                      <PlusCircle className="w-4 h-4 mr-2" /> 添加小节
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* 添加上传按钮 */}
          <div className="flex justify-center mt-8">
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
                  上传培训资料
                </>
              )}
            </Button>
          </div>

          {/* 文档内容展示区域 */}
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

          {/* 上传对话框 */}
          {showUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <DocumentUpload 
                  onConfirm={handleUploadConfirm}
                  onCancel={handleUploadCancel}
                  isLoading={isGenerating}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SalesTraining