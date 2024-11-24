'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
const DocumentUpload = ({ onUploadComplete, maxFileSize = 20 * 1024 * 1024, // 20MB default
acceptedFileTypes = ['.doc', '.docx', '.pdf', '.txt', '.md'], onConfirm, onCancel, isLoading, hasConversation = false, onGenerateOutline, hasCompletedConversation = false, }) => {
    const [files, setFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const uploadFile = async (file) => {
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
        setFiles(prev => prev.map(f => f.name === file.name ? {
            ...f,
            status: 'success',
            progress: 100
        } : f));
        return data.urls[0];
    };
    const onDrop = useCallback(async (acceptedFiles) => {
        const newFiles = acceptedFiles.map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            progress: 0,
            status: 'uploading',
            originalFile: file
        }));
        setFiles(prev => [...prev, ...newFiles]);
        setIsUploading(true);
        try {
            for (const file of acceptedFiles) {
                const currentFile = newFiles.find(f => f.name === file.name);
                if (!currentFile)
                    continue;
                if (file.size > maxFileSize) {
                    setFiles(prev => prev.map(f => f.id === currentFile.id ? {
                        ...f,
                        status: 'error',
                        error: `文件超过${maxFileSize / 1024 / 1024}MB限制`
                    } : f));
                    continue;
                }
                try {
                    await uploadFile(file);
                }
                catch (error) {
                    setFiles(prev => prev.map(f => f.id === currentFile.id ? {
                        ...f,
                        status: 'error',
                        error: error instanceof Error ? error.message : '上传失败'
                    } : f));
                }
            }
        }
        catch (error) {
            toast({
                title: "上传失败",
                description: error instanceof Error ? error.message : "文件上传失败，请重试",
                variant: "destructive",
            });
        }
        finally {
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
    });
    const removeFile = (id) => {
        setFiles(prev => prev.filter(file => file.id !== id));
    };
    const handleConfirm = async () => {
        if (files.length === 0)
            return;
        const successFiles = files.filter(f => f.originalFile);
        const originalFiles = successFiles.map(f => f.originalFile);
        if (onConfirm && originalFiles.length > 0) {
            onConfirm(true, originalFiles);
        }
    };
    return (_jsx(Card, { className: "w-full", children: _jsxs(CardContent, { className: "p-6", children: [_jsxs("div", { ...getRootProps(), className: `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-amber-500 bg-amber-50' : 'border-amber-200 hover:border-amber-300'}`, children: [_jsx("input", { ...getInputProps() }), _jsx(Upload, { className: "w-12 h-12 mx-auto text-amber-500 mb-4" }), _jsx("div", { className: "text-amber-800 font-medium mb-2", children: "\u62D6\u62FD\u6587\u4EF6\u5230\u6B64\u5904\u6216\u70B9\u51FB\u4E0A\u4F20" }), _jsx("p", { className: "text-amber-600 text-sm", children: "\u652F\u6301 PDF\u3001Word\u3001TXT \u7B49\u683C\u5F0F\uFF0C\u6587\u4EF6\u76F8\u5173\u6027\u8D8A\u5F3A\u6587\u6863\u8D28\u91CF\u8D8A\u9AD8" })] }), files.length > 0 && (_jsx("div", { className: "mt-4 space-y-2", children: files.map((file) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-amber-50 rounded", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(File, { className: "h-4 w-4 text-amber-500" }), _jsx("span", { className: "text-sm text-amber-900", children: file.name })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [file.status === 'uploading' && (_jsx(Progress, { value: file.progress, className: "w-24" })), file.status === 'success' && (_jsx(CheckCircle, { className: "h-4 w-4 text-green-500" })), file.status === 'error' && (_jsx(AlertCircle, { className: "h-4 w-4 text-red-500" })), _jsx("button", { onClick: () => removeFile(file.id), className: "p-1 hover:bg-amber-100 rounded", children: _jsx(X, { className: "h-4 w-4 text-amber-500" }) })] })] }, file.id))) })), _jsxs("div", { className: "mt-4 flex justify-end space-x-2", children: [onCancel && (_jsx(Button, { variant: "outline", onClick: onCancel, children: "\u53D6\u6D88" })), _jsx(Button, { onClick: handleConfirm, disabled: files.length === 0 || files.some(f => f.status === 'uploading'), className: "bg-amber-500 hover:bg-amber-600 text-white", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : ('确认上传并生成') })] })] }) }));
};
export default DocumentUpload;
