import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { FileUp, Loader2, Download } from 'lucide-react';
import DocumentUpload from './DocumentUpload';
import { Document, Paragraph, TextRun, Packer } from 'docx';
import jsPDF from 'jspdf';

interface TemplateFileHandlerProps {
  templateId: string;
  templateDescription: any;
  onContentGenerated: (content: string) => void;
  onUploadConfirm: (files: File[]) => Promise<void>;
}

const TemplateFileHandler: React.FC<TemplateFileHandlerProps> = ({
  templateId,
  templateDescription,
  onContentGenerated,
  
}) => {
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

      formData.append('template', templateId);
      formData.append('description', JSON.stringify({
        ...templateDescription,
        userDescription: description || ''
      }));

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const data = await response.json();
      onContentGenerated(data.content);

      toast({
        title: "文档生成成功",
        description: "您可以预览或下载生成的文档",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "生成失败",
        description: "文档生成过程中出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowUpload(false);
    }
  };

  const downloadAsPDF = async (content: string) => {
    try {
      setIsDownloading(true);
      const pdf = new jsPDF();
      pdf.text(content, 10, 10);
      pdf.save(`${templateId}_document.pdf`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "下载失败",
        description: "PDF文件生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadAsWord = async (content: string) => {
    try {
      setIsDownloading(true);
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun(content)
              ],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${templateId}_document.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading Word document:', error);
      toast({
        title: "下载失败",
        description: "Word文件生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          onClick={() => setShowUpload(true)}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              上传文件生成文档
            </>
          )}
        </Button>
        <Button
          onClick={() => downloadAsPDF(templateDescription.content)}
          disabled={isDownloading || !templateDescription.content}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          下载 PDF
        </Button>
        <Button
          onClick={() => downloadAsWord(templateDescription.content)}
          disabled={isDownloading || !templateDescription.content}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          下载 Word
        </Button>
      </div>

      {showUpload && (
        <DocumentUpload
          endpoint="/api/documents/upload"
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          onConfirm={handleUploadConfirm}
          onCancel={handleUploadCancel}
        />
      )}
    </div>
  );
};

export default TemplateFileHandler;
