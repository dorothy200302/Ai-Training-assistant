import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import DocumentUpload from '@/components/DocumentUpload';
import { FileUp, Loader2, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';

interface DocumentHandlerProps {
  documentTitle: string;
  documentContent: any;
  onUpload?: (content: any) => void;
  uploadEndpoint?: string;
  className?: string;
}

const DocumentHandler: React.FC<DocumentHandlerProps> = ({
  documentTitle,
  documentContent,
  onUpload,
  uploadEndpoint,
  className
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async (format: 'pdf' | 'docx') => {
    try {
      setIsDownloading(true);

      if (format === 'pdf') {
        // Create PDF document
        const pdf = new jsPDF();
        let y = 20; // Starting y position
        const pageHeight = pdf.internal.pageSize.height;
        const margin = 20;
        const lineHeight = 7;

        // Add title
        pdf.setFontSize(18);
        pdf.setFont("helvetica", "bold");
        pdf.text(documentTitle, margin, y);
        y += lineHeight * 2;

        // Add overview if exists
        if (documentContent.overview) {
          pdf.setFontSize(12);
          pdf.setFont("helvetica", "normal");
          const overviewLines = pdf.splitTextToSize(documentContent.overview, pdf.internal.pageSize.width - 2 * margin);
          overviewLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += lineHeight;
          });
          y += lineHeight;
        }

        // Add sections
        documentContent.sections?.forEach((section: any) => {
          if (y > pageHeight - margin * 2) {
            pdf.addPage();
            y = margin;
          }

          // Add section title
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(14);
          pdf.text(section.title, margin, y);
          y += lineHeight;

          // Add section content
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(12);
          const contentLines = pdf.splitTextToSize(section.content, pdf.internal.pageSize.width - 2 * margin);
          contentLines.forEach((line: string) => {
            if (y > pageHeight - margin) {
              pdf.addPage();
              y = margin;
            }
            pdf.text(line, margin, y);
            y += lineHeight;
          });
          y += lineHeight;

          // Add subsections if they exist
          section.subsections?.forEach((subsection: any) => {
            if (y > pageHeight - margin * 2) {
              pdf.addPage();
              y = margin;
            }

            // Add subsection title
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(13);
            pdf.text(subsection.title, margin + 5, y);
            y += lineHeight;

            // Add subsection content
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(12);
            const subContentLines = pdf.splitTextToSize(subsection.content, pdf.internal.pageSize.width - 2 * margin - 10);
            subContentLines.forEach((line: string) => {
              if (y > pageHeight - margin) {
                pdf.addPage();
                y = margin;
              }
              pdf.text(line, margin + 5, y);
              y += lineHeight;
            });
            y += lineHeight;
          });
        });

        // Save the PDF
        pdf.save(`${documentTitle}.pdf`);

        // After generating PDF, save to backend
        const pdfBlob = pdf.output('blob');
        const formData = new FormData();
        formData.append('file', pdfBlob, `${documentTitle}.pdf`);
        formData.append('document_type', 'training');
        formData.append('user_id', localStorage.getItem('user_id') || '');

        const token = localStorage.getItem('token');
        await fetch('http://localhost:8001/api/storage/save_generated_document', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData
        });

        toast({
          title: "下载成功",
          description: "PDF文件已生成并下载",
        });
      } else {
        // For DOCX, use backend API
        const token = localStorage.getItem('token');
        
        const response = await fetch('http://localhost:8001/api/storage/download_document', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          },
          body: JSON.stringify({
            content: documentContent,
            format: 'docx',
            filename: documentTitle
          })
        });

        if (!response.ok) {
          throw new Error('下载失败');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${documentTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "下载成功",
          description: "DOCX文件已下载",
        });
      }
    } catch (error) {
      console.error('Download error:', error);
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
    <div className={className}>
      {uploadEndpoint && (
        <DocumentUpload
          onUpload={onUpload}
          endpoint={uploadEndpoint}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
        />
      )}
      <div className="flex gap-2 mt-4">
        <Button
          onClick={() => handleDownload('pdf')}
          disabled={isDownloading || !documentContent}
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          下载PDF
        </Button>
        <Button
          onClick={() => handleDownload('docx')}
          disabled={isDownloading || !documentContent}
          variant="outline"
        >
          {isDownloading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileDown className="mr-2 h-4 w-4" />
          )}
          下载DOCX
        </Button>
      </div>
    </div>
  );
};

export default DocumentHandler;
