import React from 'react';
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
    maxFileSize?: number;
    acceptedFileTypes?: string[];
    onConfirm?: (uploadSuccess: boolean, files?: File[]) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    hasConversation?: boolean;
    onGenerateOutline?: () => void;
    hasCompletedConversation?: boolean;
}
declare const DocumentUpload: React.FC<DocumentUploadProps>;
export default DocumentUpload;
