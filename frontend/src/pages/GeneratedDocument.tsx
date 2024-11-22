import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Download, Printer, Share2, Edit2, FileText, Loader2, Bot } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom';
import { Textarea } from "@/components/ui/textarea"
import { toast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import ReactMarkdown from 'react-markdown'
import { Document, Packer, Paragraph, TextRun } from 'docx';
import jsPDF from 'jspdf';

interface Section {
  title: string;
  content: string;
  subsections?: Array<{
    title: string;
    content: string;
  }>;
}

interface DocumentContent {
  title: string;
  overview: string;
  sections: Section[];
}

const DocumentContentPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { outline, backgroundInfo, uploadedFiles } = location.state || {};
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSection, setCurrentSection] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('正在分析文档...');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<DocumentContent | null>(null);

  useEffect(() => {
    const initializeContent = async () => {
      try {
        if (location.state?.content) {
          setContent(location.state.content);
          setLoading(false);
          return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        
        setGenerationStep('正在处理大纲和背景信息...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!outline || !backgroundInfo) {
          throw new Error('Missing required data');
        }

        const formData = new FormData();
        formData.append('outline', JSON.stringify(outline));
        formData.append('description', JSON.stringify(backgroundInfo));

        setGenerationStep('正在上传文件...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (uploadedFiles && uploadedFiles.length > 0) {
          uploadedFiles.forEach((file: File) => {
            formData.append('files', file);
          });
        }

        setGenerationStep('正在生成文档内容...');
        const response = await fetch('http://localhost:8001/api/storage/generate_full_doc_with_doc/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate content: ${errorText}`);
        }

        setGenerationStep('正在整理文档格式...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const data = await response.json();
        if (data.document) {
          setContent(data.document);
        } else {
          throw new Error('文档内容为空');
        }
        
        toast({
          title: "生成成功",
          description: "文档已生成完成！",
        });
      } catch (error) {
        console.error('Failed to generate content:', error);
        toast({
          title: "生成失败",
          description: error instanceof Error ? error.message : "获取文档内容失败，请重试",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    initializeContent();
  }, [location.state, outline, backgroundInfo, uploadedFiles]);

  useEffect(() => {
    if (content && !editedContent) {
      setEditedContent(JSON.parse(JSON.stringify(content)));
    }
  }, [content]);

  const handleDownload = async (format: 'docx' | 'pdf') => {
    try {
      if (!content) return;

      let fileBlob: Blob;
      let fileName = `${content.title || 'document'}.${format}`;

      // 生成文件
      if (format === 'docx') {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                children: [new TextRun({ text: content.title, bold: true, size: 32 })],
              }),
              new Paragraph({
                children: [new TextRun({ text: content.overview, size: 24 })],
              }),
              ...content.sections.flatMap(section => [
                new Paragraph({
                  children: [new TextRun({ text: section.title, bold: true, size: 28 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: section.content, size: 24 })],
                }),
                ...(section.subsections?.flatMap(subsection => [
                  new Paragraph({
                    children: [new TextRun({ text: subsection.title, bold: true, size: 26 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: subsection.content, size: 24 })],
                  }),
                ]) || []),
              ]),
            ],
          }],
        });
        fileBlob = await Packer.toBlob(doc);
      } else {
        const pdf = new jsPDF();
        let y = 20;

        pdf.setFontSize(16);
        pdf.text(content.title, 20, y);
        y += 10;

        pdf.setFontSize(12);
        const splitOverview = pdf.splitTextToSize(content.overview, 170);
        pdf.text(splitOverview, 20, y);
        y += splitOverview.length * 7;

        content.sections.forEach(section => {
          if (y > 270) {
            pdf.addPage();
            y = 20;
          }

          pdf.setFontSize(14);
          pdf.text(section.title, 20, y);
          y += 10;

          pdf.setFontSize(12);
          const splitContent = pdf.splitTextToSize(section.content, 170);
          pdf.text(splitContent, 20, y);
          y += splitContent.length * 7;

          section.subsections?.forEach(subsection => {
            if (y > 270) {
              pdf.addPage();
              y = 20;
            }

            pdf.setFontSize(13);
            pdf.text(subsection.title, 25, y);
            y += 10;

            pdf.setFontSize(12);
            const splitSubContent = pdf.splitTextToSize(subsection.content, 165);
            pdf.text(splitSubContent, 25, y);
            y += splitSubContent.length * 7;
          });
        });

        fileBlob = pdf.output('blob');
      }

      // 下载文件
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);

      // 转换为 base64
      const base64Content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      // 保存到后端
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8001/api/storage/download_document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: base64Content,
          format: format,
          filename: fileName,
          isBase64: true,
          metadata: {
            title: content.title,
            sections: content.sections.map(section => ({
              title: section.title,
              content: section.content,
              subsections: section.subsections
            }))
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Failed to save document');
      }

      const result = await response.json();
    
      toast({
        title: "保存成功",
        description: `文档已成功下载并保存为${format.toUpperCase()}格式`,
      });

    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档生成或保存失败，请重试",
        variant: "destructive",
      });
      throw error;
    }
  };

  const navigateToTemplates = () => {
    navigate('/templates', { state: { content } });
  };

  const handleContentChange = (
    type: 'overview' | 'section' | 'subsection',
    value: string,
    sectionIndex?: number,
    subsectionIndex?: number
  ) => {
    if (!editedContent) return;
    
    const newContent = { ...editedContent };
    
    if (type === 'overview') {
      newContent.overview = value;
    } else if (type === 'section' && sectionIndex !== undefined) {
      newContent.sections[sectionIndex].content = value;
    } else if (type === 'subsection' && sectionIndex !== undefined && subsectionIndex !== undefined) {
      newContent.sections[sectionIndex].subsections![subsectionIndex].content = value;
    }
    
    setEditedContent(newContent);
  };

  const saveChanges = () => {
    setContent(editedContent);
    setEditMode(false);
    toast({
      title: "保存成功",
      description: "文档内容已更新",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-amber-800">{generationStep}</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex justify-center items-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" />
          <p className="text-amber-800">{generationStep}</p>
        </div>
      </div>
    );
  }

  const progress = content?.sections ? ((currentSection + 1) / content.sections.length) * 100 : 0;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-full bg-white shadow-lg p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="bg-amber-50 shadow-sm">
            <CardHeader className="border-b border-amber-200">
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold text-amber-900">
                  {content.title}
                </CardTitle>
                <div className="flex gap-4">
                  <Button 
                    onClick={() => setEditMode(!editMode)} 
                    variant={editMode ? "destructive" : "outline"} 
                    className="flex items-center"
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    {editMode ? "取消编辑" : "编辑"}
                  </Button>
                  {editMode && (
                    <Button 
                      onClick={saveChanges} 
                      className="flex items-center"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      保存
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="flex items-center">
                        <Download className="mr-2 h-4 w-4" />
                        下载
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDownload('docx')}>
                        Word文档 (.docx)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                        PDF文档 (.pdf)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => window.print()} variant="outline" className="flex items-center">
                    <Printer className="mr-2 h-4 w-4" />
                    打印
                  </Button>
                  <Button variant="outline" className="flex items-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    分享
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <div className="space-y-8">
                {/* Overview Section */}
                {(editedContent?.overview || content?.overview) && (
                  <div className="mb-8">
                    <div className="prose max-w-none text-amber-900">
                      {editMode ? (
                        <Textarea
                          value={editedContent?.overview}
                          onChange={(e) => handleContentChange('overview', e.target.value)}
                          className="min-h-[200px] w-full p-4"
                        />
                      ) : (
                        <ReactMarkdown>{content?.overview || ''}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Content */}
                <div className="space-y-8">
                  {(editedContent?.sections || content?.sections || []).map((section, index) => (
                    <div key={index} className="space-y-4">
                      <h2 className="text-xl font-semibold text-amber-900">
                        {section.title}
                      </h2>
                      {section.content && (
                        <div className="prose max-w-none text-amber-900">
                          {editMode ? (
                            <Textarea
                              value={editedContent?.sections?.[index]?.content || section.content}
                              onChange={(e) => handleContentChange('section', e.target.value, index)}
                              className="min-h-[200px] w-full p-4"
                            />
                          ) : (
                            <ReactMarkdown>{section.content}</ReactMarkdown>
                          )}
                        </div>
                      )}
                      {section.subsections && section.subsections.length > 0 && (
                        <div className="space-y-4 ml-4">
                          {section.subsections.map((subsection, subIndex) => (
                            <div key={subIndex}>
                              <h3 className="text-lg font-medium text-amber-800">
                                {subsection.title}
                              </h3>
                              {subsection.content && (
                                <div className="prose max-w-none text-amber-900">
                                  {editMode ? (
                                    <Textarea
                                      value={editedContent?.sections?.[index].subsections?.[subIndex].content || subsection.content}
                                      onChange={(e) => handleContentChange('subsection', e.target.value, index, subIndex)}
                                      className="min-h-[200px] w-full p-4"
                                    />
                                  ) : (
                                    <ReactMarkdown>{subsection.content}</ReactMarkdown>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DocumentContentPage;