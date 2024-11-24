import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, X, Upload, FileText } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";

interface DocumentUploadProps {
  onConfirm: (files: File[], description?: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export default function DocumentUpload({ 
  onConfirm, 
  onCancel, 
  isLoading = false,
  maxFiles = 5,
  maxSize = DEFAULT_MAX_SIZE,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES
}: DocumentUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(file => {
      const isValidType = acceptedFileTypes.includes(file.type);
      const isValidSize = file.size <= maxSize;
      return isValidType && isValidSize;
    });

    if (validFiles.length + files.length > maxFiles) {
      alert(`最多只能上传${maxFiles}个文件`);
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);
  }, [files, maxFiles, maxSize, acceptedFileTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles: maxFiles - files.length
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(files, description);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary",
          "relative"
        )}
      >
        <input {...getInputProps()} disabled={isLoading} />
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-sm text-gray-600">
            {isDragActive ? (
              <p>将文件拖放到此处...</p>
            ) : (
              < >
                <p>点击或拖放文件到此处上传</p>
                <p className="text-xs text-gray-400">
                  支持的文件类型: PDF, Word, TXT | 最大文件大小: {formatFileSize(maxSize)}
                </p>
              </ >
            )}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="description">描述（可选）</Label>
        <Textarea
          id="description"
          placeholder="请输入文档相关描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
          disabled={isLoading}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label>已选择的文件：</Label>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={isLoading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1">
              <Progress value={uploadProgress} />
              <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            取消
          </Button>
        )}
        <Button 
          onClick={handleConfirm} 
          disabled={isLoading || files.length === 0}
          className="min-w-[100px]"
        >
          {isLoading ? (
            < >
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </ >
          ) : (
            '确认上传'
          )}
        </Button>
      </div>
    </div>
  );
}
