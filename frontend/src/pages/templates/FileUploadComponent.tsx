import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import { toast } from '@/hooks/use-toast';

interface FileUploadComponentProps {
  onUploadSuccess?: (content: string) => void;
}

export default function FileUploadComponent({ onUploadSuccess }: FileUploadComponentProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUploadConfirm = async (files: File[], description?: string) => {
    if (!files || files.length === 0) {
      setShowUpload(false);
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      const token = localStorage.getItem('token');

      files.forEach(file => {
        formData.append('files', file);
      });

      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/storage/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload files');
      }

      const data = await response.json();
      
      if (onUploadSuccess) {
        onUploadSuccess(data.content);
      }

      toast({
        title: "上传成功",
        description: "文件已成功上传",
      });
      
      setShowUpload(false);
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "上传失败",
        description: "文件上传过程中出现错误，请重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>上传文件</CardTitle>
        <CardDescription>
          上传文档以生成模板或直接处理
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <Button
            onClick={() => setShowUpload(true)}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <FileUp className="mr-2 h-4 w-4" />
                上传文件
              </>
            )}
          </Button>
        </div>

        {showUpload && (
          <DocumentUpload
            endpoint="/api/documents/upload"
            isUploading={isUploading}
            setIsUploading={setIsUploading}
            onConfirm={handleUploadConfirm}
            onCancel={handleUploadCancel}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
}