import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, FileDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { documentService } from '@/services/DocumentService';

interface DocumentDownloaderProps {
  title: string;
  content: string;
  className?: string;
}

export const DocumentDownloader: React.FC<DocumentDownloaderProps> = ({
  title,
  content,
  className = ''
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (format: 'pdf' | 'docx') => {
    if (!content) {
      toast({
        title: "错误",
        description: "没有可下载的内容",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);

      // 生成文档
      const blob = await documentService.generateDocument({
        title,
        content,
        format
      });

      // 下载文档
      await documentService.downloadDocument(
        blob,
        `${title}.${format}`
      );

      // 保存到后端
      const reader = new FileReader();
      reader.onload = async () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1] || base64String;
        
        await documentService.saveToBackend({
          content: base64Content,
          format,
          filename: title,
          isBase64: true
        });
      };
      reader.readAsDataURL(blob);

      toast({
        title: "下载成功",
        description: `文档已下载为${format.toUpperCase()}格式`,
      });
    } catch (error) {
      console.error(`${format.toUpperCase()} generation error:`, error);
      toast({
        title: `生成${format.toUpperCase()}失败`,
        description: error instanceof Error ? error.message : `${format.toUpperCase()}生成失败，请重试`,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        onClick={() => handleDownload('pdf')}
        disabled={isDownloading || !content}
        variant="outline"
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        下载 PDF
      </Button>
      <Button
        onClick={() => handleDownload('docx')}
        disabled={isDownloading || !content}
        variant="outline"
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        下载 Word
      </Button>
    </div>
  );
};
