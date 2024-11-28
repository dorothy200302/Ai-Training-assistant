import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Download,  Edit2, FileText, Loader2 } from 'lucide-react'
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
import jsPDF from 'jspdf';
import { API_BASE_URL } from "../config/constants";

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

const DocumentContentPage: React.FC = () => {
  const location = useLocation();
  const { outline, backgroundInfo, uploadedFiles } = location.state || {};
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationStep, setGenerationStep] = useState<string>('正在分析文档...');
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<DocumentContent | null>(null);
  const [outlineText, setOutlineText] = useState<string>('');
  const [currentOutline, setCurrentOutline] = useState<OutlineSection[]>([]);

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
        const API_URL = API_BASE_URL;


        setGenerationStep('正在生成文档内容...');
        const response = await fetch(`${API_URL}/api/storage/generate_full_doc_with_doc/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
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
      setCurrentOutline(outline);
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
          level,
          content: '',
          items: []
        };
      } else if (line.startsWith('-')) {
        currentItems.push(line.replace(/^-\s*/, ''));
      } else if (line) {
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

  const handleOutlineTextChange = (text: string) => {
    setOutlineText(text);
    const newOutline = parseOutlineText(text);
    setCurrentOutline(newOutline);
  };

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
      const response = await fetch(`${API_BASE_URL}/api/storage/download_document`, {
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

  const handleSave = async () => {
    if (!editedContent) return;

    try {
      setLoading(true);

      // Update content with current outline
      const updatedContent = {
        ...editedContent,
        outline: currentOutline
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/storage/save_document/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedContent),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      setContent(updatedContent);
      setEditedContent(updatedContent);
      setEditMode(false);
      toast({
        title: "保存成功",
        description: "文档内容已更新",
      });
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存文档时发生错误",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const renderEditableOutline = () => {
    return (
      <div className="p-4 bg-amber-50 rounded-lg">
        <textarea
          className="w-full min-h-[300px] p-2 font-mono text-sm border rounded"
          value={outlineText}
          onChange={(e) => handleOutlineTextChange(e.target.value)}
          placeholder="输入大纲内容..."
        />
      </div>
    );
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

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-amber-900">
                {editMode ? (
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    value={editedContent?.title || ''}
                    onChange={(e) => setEditedContent(prev => prev ? { ...prev, title: e.target.value } : null)}
                  />
                ) : (
                  content?.title
                )}
              </h1>
            </div>
            <div className="flex gap-2">
              {!editMode ? (
                <>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    onClick={() => setEditMode(true)}
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    编辑
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-amber-200 text-amber-600 hover:bg-amber-50">
                        <Download className="h-4 w-4 mr-2" />
                        导出
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDownload('docx')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Word文档
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                        <FileText className="h-4 w-4 mr-2" />
                        PDF文档
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                  <Button
                    variant="outline"
                    className="border-amber-200 text-amber-600 hover:bg-amber-50"
                    onClick={() => {
                      setEditMode(false);
                      setEditedContent(content);
                    }}
                  >
                    取消
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">文档大纲</h2>
            {editMode ? (
              renderEditableOutline()
            ) : (
              <div className="p-4 bg-amber-50 rounded-lg">
                <ReactMarkdown>
                  {outlineText}
                </ReactMarkdown>
              </div>
            )}
          </div>

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
                  <h2 className="text-xl font-bold text-amber-900">
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
        </div>
      </div>
  );
};

export default DocumentContentPage;