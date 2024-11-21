'use client'

import React, { useState, useCallback } from 'react'
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  originalFile?: File;
}

interface DocumentUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  onConfirm?: (uploadSuccess: boolean, files?: File[]) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  hasConversation?: boolean;
  onGenerateOutline?: () => void;
  hasCompletedConversation?: boolean;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  maxFileSize = 20 * 1024 * 1024, // 20MB default
  acceptedFileTypes = ['.doc', '.docx', '.pdf', '.txt', '.md'],
  onConfirm,
  onCancel,
  isLoading,
  hasConversation = false,
  onGenerateOutline,
  hasCompletedConversation = false,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('files', file);

    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('未登录，请先登录');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chatbot/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${errorText}`);
    }

    const data = await response.json();
    if (onUploadComplete) {
      onUploadComplete([{
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 100,
        status: 'success',
        originalFile: file
      }]);
    }

    setFiles(prev => prev.map(f => 
      f.name === file.name ? { 
        ...f, 
        status: 'success', 
        progress: 100 
      } : f
    ));

    return data.urls[0];
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: 'uploading' as const,
      originalFile: file
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setIsUploading(true);

    try {
      for (const file of acceptedFiles) {
        const currentFile = newFiles.find(f => f.name === file.name);
        if (!currentFile) continue;

        if (file.size > maxFileSize) {
          setFiles(prev => prev.map(f => 
            f.id === currentFile.id ? { 
              ...f, 
              status: 'error', 
              error: `文件超过${maxFileSize / 1024 / 1024}MB限制` 
            } : f
          ));
          continue;
        }

        try {
          await uploadFile(file);
        } catch (error) {
          setFiles(prev => prev.map(f => 
            f.id === currentFile.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : '上传失败' 
            } : f
          ));
        }
      }
    } catch (error) {
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "文件上传失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [maxFileSize, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxSize: maxFileSize
  })

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id))
  }

  const handleConfirm = async () => {
    if (files.length === 0) return;
    
    const successFiles = files.filter(f => f.originalFile);
    const originalFiles = successFiles.map(f => f.originalFile!);
    
    if (onConfirm && originalFiles.length > 0) {
      onConfirm(true, originalFiles);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-amber-500 bg-amber-50' : 'border-amber-200 hover:border-amber-300'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-amber-500 mb-4" />
          <div className="text-amber-800 font-medium mb-2">
            拖拽文件到此处或点击上传
          </div>
          <p className="text-amber-600 text-sm">
            支持 PDF、Word、TXT 等格式，文件相关性越强文档质量越高
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4 space-y-2">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-amber-50 rounded">
                <div className="flex items-center space-x-2">
                  <File className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-900">{file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="w-24" />
                  )}
                  {file.status === 'success' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-amber-100 rounded"
                  >
                    <X className="h-4 w-4 text-amber-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end space-x-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
          )}
          <Button 
            onClick={handleConfirm}
            disabled={files.length === 0 || files.some(f => f.status === 'uploading')}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              '确认上传并生成'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default DocumentUpload