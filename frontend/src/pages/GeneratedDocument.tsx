import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Loader2, Save, Edit, X, Download } from 'lucide-react'
import { useLocation } from 'react-router-dom';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createApiRequest } from "@/utils/errorHandler";
import { API_BASE_URL } from "../config/constants";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
console.log('API_BASE_URL:', API_BASE_URL);

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

interface OutlineSection {
  title: string;
  content?: string;
  subsections?: OutlineSection[];
  items?: string[];
  level: number;
  time?: string;
}

interface EditState {
  overview: boolean;
  sections: { [key: number]: boolean };
  subsections: { [key: string]: boolean };
}

const DocumentContentPage: React.FC = () => {
  const location = useLocation();
  const { outline, backgroundInfo, uploadedFiles } = location.state || {};
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationStep, setGenerationStep] = useState<string>('正在分析文档...');
  const [editedContent, setEditedContent] = useState<DocumentContent | null>(null);
  const [outlineText, setOutlineText] = useState<string>(' ');
  const [editState, setEditState] = useState<EditState>({
    overview: false,
    sections: {} ,
    subsections: {}
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const initializeContent = async () => {
      try {
        if (location.state?.content) {
          setContent(location.state.content);
          setLoading(false);
          return;
        }

        setLoading(true);
        
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
        const API_URL = API_BASE_URL;

        setGenerationStep('正在生成文档内容...');
        const response = await createApiRequest(`${API_URL}/api/storage/generate_full_doc_with_doc/`, {
          method: 'POST',
          
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          console.error('Response status:', response.status);
          console.error('Response URL:', response.url);
          throw new Error(`Failed to generate content: ${errorText}`);
        }

        setGenerationStep('正在整理文档格式...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const data = await response.json();
        if (data.document) {
          setContent(data.document);
          setOutlineText(data.document.overview || ' ');
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

  useEffect(() => {
    if (outline) {
      setOutlineText(outlineToText(outline));
    }
  }, [outline]);

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

  

  const handleOutlineTextChange = (text: string) => {
    setOutlineText(text);
  };

  const saveToBackend = async (fileBlob: Blob, fileType: 'docx') => {
    try {
      
      // Convert blob to base64
      const base64Content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',
       
        body: JSON.stringify({
          content: base64Content,
          format: fileType,
          filename: content?.title || '培训文档',
          isBase64: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      return await response.json();
    } catch (error) {
      console.error('Save to backend error:', error);
      throw error;
    }
  };

  const handleDownload = async (format: 'docx' | 'pdf') => {
    try {
      if (!content) return;
      setIsDownloading(true);

      if (format === 'docx') {
        // Create DOCX document
        const doc = new Document({
          sections: [{
            properties: {} ,
            children: [
              new Paragraph({
                children: [new TextRun({ text: content.title, bold: true, size: 32 })],
              }),
              new Paragraph({ children: [new TextRun({ text: '\n' })] }),
              new Paragraph({
                children: [new TextRun({ text: content.overview || '', size: 24 })],
              }),
              new Paragraph({ children: [new TextRun({ text: '\n' })] }),
              ...content.sections.flatMap(section => [
                new Paragraph({
                  children: [new TextRun({ text: section.title, bold: true, size: 28 })],
                }),
                new Paragraph({
                  children: [new TextRun({ text: section.content, size: 24 })],
                }),
                new Paragraph({ children: [new TextRun({ text: '\n' })] }),
                ...(section.subsections?.flatMap(subsection => [
                  new Paragraph({
                    children: [new TextRun({ text: subsection.title, bold: true, size: 26 })],
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: subsection.content, size: 24 })],
                  }),
                  new Paragraph({ children: [new TextRun({ text: '\n' })] }),
                ]) || []),
              ]),
            ],
          }],
        });

        // Generate and download DOCX
        const blob = await Packer.toBlob(doc);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${content.title || '生成文档'}.docx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Save to backend
        await saveToBackend(blob, 'docx');


        

      } else if (format === 'pdf') {
        // Create PDF document
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfContent = document.getElementById('pdf-content');
        if (!pdfContent) {
          throw new Error('PDF content element not found');
        }

        // 等待所有图片加载完成
        const images = pdfContent.getElementsByTagName('img');
        await Promise.all(Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => img.addEventListener('load', resolve));
        }));

        const pdfCanvas = await html2canvas(pdfContent, {
          scale: 2,
          useCORS: true,
          logging: true,
          backgroundColor: '#ffffff',
          windowWidth: pdfContent.scrollWidth,
          windowHeight: pdfContent.scrollHeight
        });

        // 获取内容尺寸
        const contentWidth = pdfCanvas.width;
        const contentHeight = pdfCanvas.height;
        
        // 计算PDF页面尺寸
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // 计算缩放比例
        const scale = Math.min(pageWidth / contentWidth, pageHeight / contentHeight);
        
        // 计算居中位置
        const x = (pageWidth - contentWidth * scale) / 2;
        const y = (pageHeight - contentHeight * scale) / 2;

        // 添加图像到PDF
        const imgData = pdfCanvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', x, y, contentWidth * scale, contentHeight * scale);

        // 保存PDF
        pdf.save(`${content.title || '生成文档'}.pdf`);

      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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

  const handleSave = async (_e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      setIsSaving(true);

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',
       
        body: JSON.stringify({
          content: content,
          format: 'docx',
          filename: content?.title || '培训文档',
          isBase64: false
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      const result = await response.json();
      console.log('Document saved successfully:', result);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEdit = (
    type: 'overview' | 'section' | 'subsection',
    sectionIndex?: number,
    subsectionIndex?: number
  ) => {
    setEditState(prev => {
      const newState = { ...prev };
      if (type === 'overview') {
        newState.overview = !prev.overview;
      } else if (type === 'section' && sectionIndex !== undefined) {
        newState.sections = {
          ...prev.sections,
          [sectionIndex]: !prev.sections[sectionIndex]
        };
      } else if (type === 'subsection' && sectionIndex !== undefined && subsectionIndex !== undefined) {
        const key = `${sectionIndex}-${subsectionIndex}`;
        newState.subsections = {
          ...prev.subsections,
          [key]: !prev.subsections[key]
        };
      }
      return newState;
    });
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <div className="w-full max-w-6xl mx-auto p-6 sm:p-8 md:p-10">
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-amber-900">{content?.title}</h1>
            <div className="space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/80 hover:bg-white"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      < >
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        下载中
                      </ >
                    ) : (
                      < >
                        <Download className="mr-2 h-4 w-4" />
                        下载文档
                      </ >
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleDownload('docx')}>
                    下载 DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                className="bg-white/80 hover:bg-white"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  < >
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中
                  </ >
                ) : (
                  < >
                    <Save className="mr-2 h-4 w-4" />
                    保存
                  </ >
                )}
              </Button>
            </div>
          </div>

          <div className="container mx-auto py-6 px-4">
            <div className="max-w-6xl mx-auto">
              {loading && (
                <LoadingOverlay
                  isLoading={loading}
                  message={generationStep}
                />
              )}
              {loading ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                  <p className="text-amber-900">{generationStep}</p>
                </div>
              ) : (
                <div id="pdf-content">
                  <div className="space-y-8">
                    <div className="bg-amber-100/50 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-amber-900">文档大纲</h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleEdit('overview')}
                        >
                          {editState.overview ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Edit className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {editState.overview ? (
                        <div className="p-4 bg-amber-50 rounded-lg">
                          <Textarea
                            value={outlineText}
                            onChange={(e) => handleOutlineTextChange(e.target.value)}
                            className="min-h-[200px] w-full p-4 bg-white/80 rounded border-amber-200"
                            placeholder="输入大纲内容..."
                          />
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 rounded-lg">
                          <ReactMarkdown>{outlineText}</ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {content && (
                      <div className="prose max-w-none text-amber-900">
                        {content.overview && (
                          <div className="space-y-4 mb-8 bg-white/30 rounded-lg p-6">
                            <div className="flex justify-between items-center">
                              <h2 className="text-xl font-bold text-amber-900">概述</h2>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEdit('overview')}
                              >
                                {editState.overview ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {editState.overview ? (
                              <Textarea
                                value={editedContent?.overview || ''}
                                onChange={(e) => handleContentChange('overview', e.target.value)}
                                className="w-full p-4 bg-white/80 rounded border-amber-200 text-base leading-relaxed resize-y"
                                style={{ minHeight: '200px', height: 'auto' }}
                                placeholder="编辑概述内容..."
                              />
                            ) : (
                              <div className="prose max-w-none bg-white/20 rounded-lg p-4">
                                <ReactMarkdown>{content.overview}</ReactMarkdown>
                              </div>
                            )}
                          </div>
                        )}

                        {content.sections?.map((section, index) => (
                          <div key={index} className="space-y-4 mb-8 bg-white/30 rounded-lg p-6">
                            <div className="flex justify-between items-center">
                              <h2 className="text-xl font-bold text-amber-900">{section.title}</h2>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleEdit('section', index)}
                              >
                                {editState.sections[index] ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Edit className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            {editState.sections[index] ? (
                              <Textarea
                                value={editedContent?.sections[index].content || ''}
                                onChange={(e) => handleContentChange('section', e.target.value, index)}
                                className="w-full p-4 bg-white/80 rounded border-amber-200 text-base leading-relaxed resize-y"
                                style={{ minHeight: '300px', height: 'auto' }}
                                placeholder="编辑章节内容..."
                              />
                            ) : (
                              <div className="prose max-w-none bg-white/20 rounded-lg p-4">
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                              </div>
                            )}
                            {section.subsections?.map((subsection, subIndex) => (
                              <div key={subIndex} className="ml-4 space-y-2 bg-white/20 rounded-lg p-4 mt-4">
                                <div className="flex justify-between items-center">
                                  <h3 className="text-lg font-medium text-amber-800">{subsection.title}</h3>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleEdit('subsection', index, subIndex)}
                                  >
                                    {editState.subsections[`${index}-${subIndex}`] ? (
                                      <X className="h-4 w-4" />
                                    ) : (
                                      <Edit className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                {editState.subsections[`${index}-${subIndex}`] ? (
                                  <Textarea
                                    value={editedContent?.sections[index].subsections?.[subIndex].content || ''}
                                    onChange={(e) => handleContentChange('subsection', e.target.value, index, subIndex)}
                                    className="min-h-[250px] w-full p-4 bg-white/80 rounded border-amber-200 text-base leading-relaxed"
                                    placeholder="编辑小节内容..."
                                  />
                                ) : (
                                  <div className="prose max-w-none bg-white/10 rounded-lg p-4">
                                    <ReactMarkdown>{subsection.content}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentContentPage;