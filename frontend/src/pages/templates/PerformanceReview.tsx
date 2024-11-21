import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileUp, Loader2, Download, FileDown } from 'lucide-react'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import TemplateFileHandler from '@/components/TemplateFileHandler'

const PerformanceReview: React.FC = () => {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const templateDescription = {
    title: '绩效评估报告',
    subtitle: '全面评估员工表现',
    overview: '本报告将帮助您客观评估员工的工作表现和发展潜力。',
    content: documentContent
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
      doc.text('绩效考核报告', 40, 40);
      
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
      a.download = '绩效考核报告.pdf';
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
              text: "绩效考核报告",
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
      a.download = '绩效考核报告.docx';
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
          filename: '绩效考核报告',
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
      formData.append('document_name', '绩效考核报告');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
      <div className="bg-white shadow-lg">
        <div className="bg-gradient-to-r from-green-400 to-teal-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">{templateDescription.title}</h1>
          <p className="text-green-100">{templateDescription.overview}</p>
        </div>
        
        <div className="p-6 max-w-none">
          <TemplateFileHandler
            templateId="performance_review"
            templateDescription={templateDescription}
            onContentGenerated={setDocumentContent}
          />

          {documentContent && (
            <div className="mt-6 p-4 border rounded-lg bg-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {documentContent}
              </ReactMarkdown>
            </div>
          )}

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
                className="bg-green-600 hover:bg-green-700"
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
        </div>
      </div>
    </div>
  );
};

export default PerformanceReview;
