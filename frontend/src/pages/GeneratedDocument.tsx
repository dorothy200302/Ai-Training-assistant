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

        // Add required parameters
        formData.append('description', JSON.stringify({
          title: '文档生成',
          purpose: '自动生成培训文档'
        }));
        
        formData.append('outline', JSON.stringify([
          {
            title: '文档概述',
            subsections: []
          }
        ]));

        setGenerationStep('正在生成文档内容...');
        const response = await fetch('http://localhost:8001/storage/generate_full_doc_with_doc/', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          throw new Error(`Failed to generate content: ${errorText}`);
        }

        setGenerationStep('正在整理文档格式...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const data = await response.json();
        if (data.document?.content) {
          setContent(data.document.content);
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

  const handleDownload = async (format: 'docx' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      
      toast({
        title: "正在下载",
        description: "文档生成中，请稍候...",
        variant: "default",
      });

      const response = await fetch('http://localhost:8001/download_document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          content,
          format
        })
      });

      if (!response.ok) {
        throw new Error('下载失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${content?.title || 'document'}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "下载成功",
        description: `文档已成功下载为${format.toUpperCase()}格式`,
        variant: "default",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "文档下载失败，请重试",
        variant: "destructive",
      });
    }
  };

  const navigateToTemplates = () => {
    navigate('/templates', { state: { content } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col justify-center items-center">
        <div className="text-center space-y-4">
          <Bot className="h-12 w-12 text-amber-600 mx-auto animate-bounce" />
          <Loader2 className="h-8 w-8 text-amber-600 animate-spin mx-auto" />
          <h2 className="text-xl font-semibold text-amber-800">{generationStep}</h2>
          <Progress value={loading ? 100 : 0} className="w-64 mx-auto" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex justify-center items-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-amber-800">文档生成失败</h2>
          <Button onClick={() => window.location.reload()} className="mt-4">
            重试
          </Button>
        </div>
      </div>
    );
  }

  const progress = ((currentSection + 1) / (content.sections.length)) * 100;

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="bg-amber-50 shadow-sm">
          <CardHeader className="border-b border-amber-200">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl font-bold text-amber-900">
                {content.title}
              </CardTitle>
              <div className="flex gap-4">
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
              {content.overview && (
                <div className="mb-8">
                  <div className="prose max-w-none text-amber-900">
                    <ReactMarkdown>{content.overview}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="space-y-8">
                {content.sections.map((section, index) => (
                  <div key={index} className="space-y-4">
                    <h2 className="text-xl font-semibold text-amber-900">
                      {section.title}
                    </h2>
                    {section.content && (
                      <div className="prose max-w-none text-amber-900">
                        <ReactMarkdown>{section.content}</ReactMarkdown>
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
                                <ReactMarkdown>{subsection.content}</ReactMarkdown>
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
  );
};

export default DocumentContentPage;