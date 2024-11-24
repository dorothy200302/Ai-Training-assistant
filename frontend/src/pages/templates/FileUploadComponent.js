import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, Loader2 } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import { toast } from '@/hooks/use-toast';
export default function FileUploadComponent({ onUploadSuccess }) {
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const handleUploadConfirm = async (files, description) => {
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
        }
        catch (error) {
            console.error('Error uploading files:', error);
            toast({
                title: "上传失败",
                description: "文件上传过程中出现错误，请重试",
                variant: "destructive",
            });
        }
        finally {
            setIsUploading(false);
        }
    };
    const handleUploadCancel = () => {
        setShowUpload(false);
    };
    return (_jsxs(Card, { className: "w-full", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "\u4E0A\u4F20\u6587\u4EF6" }), _jsx(CardDescription, { children: "\u4E0A\u4F20\u6587\u6863\u4EE5\u751F\u6210\u6A21\u677F\u6216\u76F4\u63A5\u5904\u7406" })] }), _jsxs(CardContent, { children: [_jsx("div", { className: "flex flex-col space-y-4", children: _jsx(Button, { onClick: () => setShowUpload(true), disabled: isUploading, className: "w-full", children: isUploading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u4E0A\u4F20\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileUp, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u4EF6"] })) }) }), showUpload && (_jsx(DocumentUpload, { endpoint: "/api/documents/upload", isUploading: isUploading, setIsUploading: setIsUploading, onConfirm: handleUploadConfirm, onCancel: handleUploadCancel, isLoading: isLoading }))] })] }));
}
