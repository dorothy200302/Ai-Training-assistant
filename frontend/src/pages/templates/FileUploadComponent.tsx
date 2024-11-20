import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import DocumentUpload from '@/components/DocumentUpload';

interface FileUploadComponentProps {
  templateType: string;
  onUploadSuccess: (content: string) => void;
}

const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ templateType, onUploadSuccess }) => {
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleUploadConfirm = async (files: File[], description: string) => {
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

      formData.append('template', templateType);

      const response = await fetch('http://localhost:8001/storage/generate_full_doc_with_template/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '文档生成失败');
      }

      const data = await response.json();
      onUploadSuccess(data.document || data.content || '');

      toast({
        title: "生成成功",
        description: "文档已生成",
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

  return (
    <>
      <Button onClick={() => setShowUpload(true)} className="bg-blue-500 hover:bg-blue-600 text-white">
        上传文档
      </Button>
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <DocumentUpload 
              onConfirm={handleUploadConfirm}
              onCancel={() => setShowUpload(false)}
              isLoading={isGenerating}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default FileUploadComponent; 