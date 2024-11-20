import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { CheckCircle2, UserPlus, Briefcase, Mail, Users, Coffee, FileText, Layers, Copy, Pencil, Save, FileUp, Loader2, Download, FileDown } from 'lucide-react'
import DocumentUpload from '../DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

interface ChecklistItem {
  id: string;
  content: string;
  icon: React.ReactNode;
  checked?: boolean;
}

interface OutlineItem {
  id: string;
  title: string;
  isEditing?: boolean;
  subItems: {
    id: string;
    text: string;
    isEditing?: boolean;
  }[]
}

interface Section {
  id: string;
  title: string;
  blocks: ContentBlock[];
}

interface ContentBlock {
  id: string;
  content: string;
}

interface DocumentContent {
  title: string;
  overview: string;
  sections: Array<{
    title: string;
    content: string;
    subsections?: Array<{
      title: string;
      content: string;
    }>;
  }>;
}

const NewEmployeeOrientation: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'task1', content: '完成人事部门的入职文件', icon: <UserPlus className="h-5 w-5" /> },
    { id: 'task2', content: '领取办公设备（电脑、门禁卡等）', icon: <Briefcase className="h-5 w-5" /> },
    { id: 'task3', content: '设置公司邮箱和内部系统账号', icon: <Mail className="h-5 w-5" /> },
    { id: 'task4', content: '熟悉部门同事和工作环境', icon: <Users className="h-5 w-5" /> },
    { id: 'task5', content: '与直属上级进行工作交接', icon: <Coffee className="h-5 w-5" /> },
  ])

  const [documentContent, setDocumentContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

      formData.append('template', 'new_employee_orientation');
      formData.append('description', JSON.stringify({
        title: '新员工入职培训手册',
        subtitle: '欢迎加入我们的团队！',
        overview: '本手册旨在帮助您快速了解公司文化、规章制度及您的工作职责。',
        checklist: checklist.map(item => ({
          id: item.id,
          content: item.content,
          checked: item.checked
        }))
      }));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'new_employee_orientation',
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
        description: "新员工入职培训文档已生成",
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

  const handleCheckboxChange = (id: string): void => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }

  const handleConfirm = (): void => {
    toast({
      title: "确认成功",
      description: "您已确认阅读完成",
    });
  }

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
          filename: '新员工入职培训手册',
          isBase64: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.detail === 'Token not found or expired') {
          localStorage.removeItem('token'); // Clear invalid token
          toast({
            title: "认证过期",
            description: "请重新登录",
            variant: "destructive",
          });
          // TODO: Redirect to login page if needed
          throw new Error('认证过期');
        }
        throw new Error(errorData?.detail || '保存到后端失败');
      }

      const data = await response.json();
      
      // 创建文档记录
      const formData = new URLSearchParams();
      formData.append('document_name', '新员工入职培训手册');
      formData.append('document_type', fileType);
      formData.append('url', data.url);

      const recordResponse = await fetch('http://localhost:8001/api/storage/create_generated_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!recordResponse.ok) {
        const errorText = await recordResponse.text();
        throw new Error(errorText || '创建文档记录失败');
      }

      toast({
        title: "保存成功",
        description: "文档已保存到云端",
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

  const handleDownloadPdfFrontend = async () => {
    try {
      setIsDownloading(true);
      
      // 创建PDF文档
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4'
      });
      
      // 使用内置字体
      doc.setFont('helvetica', 'normal');
      
      // 添加标题
      doc.setFontSize(20);
      doc.text('新员工入职培训手册', 40, 40);
      
      // 添加内容
      doc.setFontSize(12);
      const contentLines = documentContent.split('\n');
      let y = 80;
      
      contentLines.forEach((line) => {
        if (y > 780) { // A4纸张高度约为842pt
          doc.addPage();
          y = 40;
        }
        doc.text(line, 40, y);
        y += 20; // 增加行距
      });
      
      // 获取PDF blob
      const pdfBlob = doc.output('blob');
      
      // 下载PDF
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '新员工入职培训手册.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 保存到后端
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
      
      // 创建文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "新员工入职培训手册",
              heading: HeadingLevel.HEADING_1,
            }),
            // 添加空行
            new Paragraph({}),
            // 添加内容
            ...documentContent.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24, // 12pt
                  }),
                ],
              })
            ),
          ],
        }],
      });

      // 生成文档
      const blob = await Packer.toBlob(doc);
      
      // 下载文档
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '新员工入职培训手册.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 保存到后端
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">新员工入职培训手册</h1>
          <p className="text-amber-100">欢迎加入我们的团队！</p>
        </div>
        
        <div className="p-6 max-w-none">
          {/* Checklist Section */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">入职清单</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center mb-4 last:mb-0">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => handleCheckboxChange(item.id)}
                      className="border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <label
                      htmlFor={item.id}
                      className="flex items-center ml-3 text-amber-700 cursor-pointer"
                    >
                      <span className="bg-white p-1 rounded-full mr-3 text-amber-500">
                        {item.icon}
                      </span>
                      {item.content}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Upload and Generate Section */}
          <div className="flex justify-center mb-8">
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

          {/* Document Content Section */}
          {documentContent && (
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex justify-end gap-2 mb-4">
                <Button
                  onClick={handleDownloadPdfFrontend}
                  disabled={!documentContent || isDownloading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
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
              <div className="prose prose-amber max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {documentContent}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Upload Dialog */}
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

          {/* Confirm Button */}
          {documentContent && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={handleConfirm}
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
  );
}

export default NewEmployeeOrientation