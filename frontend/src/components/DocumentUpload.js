import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, X, Upload, FileText } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
];
const DocumentUpload = ({ onUpload, endpoint, isUploading, setIsUploading, onConfirm, onCancel, isLoading = false, maxFiles = 5, maxSize = DEFAULT_MAX_SIZE, className }) => {
    const { toast } = useToast();
    const [files, setFiles] = useState([]);
    const [description, setDescription] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const onDrop = useCallback((acceptedFiles) => {
        const validFiles = acceptedFiles.filter(file => {
            const isValidType = DEFAULT_ACCEPTED_TYPES.includes(file.type);
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
    }, [files, maxFiles, maxSize]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: DEFAULT_ACCEPTED_TYPES.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
        maxSize,
        maxFiles: maxFiles - files.length
    });
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };
    const handleUpload = async (files, description) => {
        if (onConfirm) {
            onConfirm(files, description);
        }
        else if (onUpload) {
            try {
                setIsUploading(true);
                const formData = new FormData();
                files.forEach(file => {
                    formData.append('file', file);
                });
                if (description) {
                    formData.append('description', description);
                }
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error('Upload failed');
                }
                const data = await response.json();
                onUpload(data);
            }
            catch (error) {
                console.error('Upload error:', error);
                toast({
                    title: "上传失败",
                    description: error instanceof Error ? error.message : "文件上传失败，请重试",
                    variant: "destructive",
                });
            }
            finally {
                setIsUploading(false);
            }
        }
    };
    const handleConfirm = () => {
        if (files.length === 0)
            return;
        handleUpload(files, description);
    };
    const formatFileSize = (bytes) => {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    return (_jsxs("div", { className: cn("space-y-4", className), children: [_jsxs("div", { ...getRootProps(), className: cn("border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors", isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary", "relative"), children: [_jsx("input", { ...getInputProps(), disabled: isLoading }), _jsxs("div", { className: "flex flex-col items-center justify-center space-y-2 text-center", children: [_jsx(Upload, { className: "h-8 w-8 text-gray-400" }), _jsx("div", { className: "text-sm text-gray-600", children: isDragActive ? (_jsx("p", { children: "\u5C06\u6587\u4EF6\u62D6\u653E\u5230\u6B64\u5904..." })) : (_jsxs(_Fragment, { children: [_jsx("p", { children: "\u70B9\u51FB\u6216\u62D6\u653E\u6587\u4EF6\u5230\u6B64\u5904\u4E0A\u4F20" }), _jsxs("p", { className: "text-xs text-gray-400", children: ["\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B: PDF, Word, TXT | \u6700\u5927\u6587\u4EF6\u5927\u5C0F: ", formatFileSize(maxSize)] })] })) })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "description", children: "\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09" }), _jsx(Textarea, { id: "description", placeholder: "\u8BF7\u8F93\u5165\u6587\u6863\u76F8\u5173\u63CF\u8FF0...", value: description, onChange: (e) => setDescription(e.target.value), className: "mt-1", disabled: isLoading })] }), files.length > 0 && (_jsxs("div", { className: "mt-4 space-y-2", children: [_jsx(Label, { children: "\u5DF2\u9009\u62E9\u7684\u6587\u4EF6\uFF1A" }), _jsx("div", { className: "space-y-2", children: files.map((file, index) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded-md", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(FileText, { className: "h-4 w-4 text-gray-400" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-700", children: file.name }), _jsx("p", { className: "text-xs text-gray-500", children: formatFileSize(file.size) })] })] }), _jsx(Button, { variant: "ghost", size: "icon", onClick: (e) => {
                                        e.stopPropagation();
                                        removeFile(index);
                                    }, disabled: isLoading, children: _jsx(X, { className: "h-4 w-4" }) })] }, index))) }), uploadProgress > 0 && uploadProgress < 100 && (_jsxs("div", { className: "space-y-1", children: [_jsx(Progress, { value: uploadProgress }), _jsxs("p", { className: "text-xs text-gray-500 text-right", children: [uploadProgress, "%"] })] }))] })), _jsxs("div", { className: "flex justify-end space-x-2", children: [onCancel && (_jsx(Button, { variant: "outline", onClick: onCancel, disabled: isLoading, children: "\u53D6\u6D88" })), _jsx(Button, { onClick: handleConfirm, disabled: isLoading || files.length === 0, className: "min-w-[100px]", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : ('确认上传') })] })] }));
};
export default DocumentUpload;
