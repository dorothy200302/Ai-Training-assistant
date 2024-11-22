import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TemplateFileHandler from '@/components/TemplateFileHandler'
import { FileUp, Loader2, CheckCircle2, Download, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

const CareerPlanning: React.FC = () => {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const templateDescription = {
    title: '职业生涯规划手册',
    subtitle: '规划你的职业发展之路',
    overview: '本手册将帮助你制定清晰的职业发展目标和实现路径。',
    content: documentContent
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
          filename: '职业生涯规划手册',
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
      
      const formData = new URLSearchParams();
      formData.append('document_name', '职业生涯规划手册');
      formData.append('document_type', fileType);
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleUploadConfirm = async (files: File[]) => {
    if (!files || files.length === 0) {
      return;
    }
    
    try {
      setIsGenerating(true);
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('template', 'career_planning');
      formData.append('description', JSON.stringify(templateDescription));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'career_planning',
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
        description: "职业生涯规划文档已生成",
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
      doc.text('职业生涯规划手册', 40, 40);
      
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
      a.download = '职业生涯规划手册.pdf';
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
              text: "职业生涯规划手册",
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
      a.download = '职业生涯规划手册.docx';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white shadow-lg">
        <div className="bg-gradient-to-r from-blue-400 to-indigo-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">职业生涯规划</h1>
          <p className="text-blue-100">规划你的职业发展之路</p>
        </div>
        
        <div className="p-6 max-w-none">
          <div className="flex justify-between items-center mb-6">
            <TemplateFileHandler
              templateId="career_planning"
              templateDescription={templateDescription}
              onContentGenerated={setDocumentContent}
              onUploadConfirm={handleUploadConfirm}
            />
          </div>

          {documentContent && (
            <div className="flex gap-2 mt-6">
              <Button
                onClick={handleDownloadPdfFrontend}
                className="bg-red-500 hover:bg-red-600"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                下载PDF
              </Button>
              <Button
                onClick={handleDownloadWordFrontend}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-4 w-4" />
                )}
                下载Word
              </Button>
            </div>
          )}

          {documentContent && (
            <Card className="mt-6 bg-white">
              <CardContent className="prose max-w-none p-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {documentContent}
                </ReactMarkdown>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CareerPlanning