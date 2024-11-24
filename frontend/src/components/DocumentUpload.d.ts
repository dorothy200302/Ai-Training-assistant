import React from 'react';
export interface DocumentUploadProps {
    onUpload?: (content: any) => void;
    endpoint: string;
    isUploading: boolean;
    setIsUploading: React.Dispatch<React.SetStateAction<boolean>>;
    onConfirm?: (files: File[], description?: string) => void;
    onCancel?: () => void;
    isLoading?: boolean;
    maxFiles?: number;
    maxSize?: number;
    className?: string;
}
declare const DocumentUpload: React.FC<DocumentUploadProps>;
export default DocumentUpload;
