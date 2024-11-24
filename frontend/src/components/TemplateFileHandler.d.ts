import React from 'react';
interface TemplateFileHandlerProps {
    templateId: string;
    templateDescription: any;
    onContentGenerated: (content: string) => void;
    onUploadConfirm: (files: File[]) => Promise<void>;
}
declare const TemplateFileHandler: React.FC<TemplateFileHandlerProps>;
export default TemplateFileHandler;
