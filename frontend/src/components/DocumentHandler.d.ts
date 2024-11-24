import React from 'react';
interface DocumentHandlerProps {
    documentTitle: string;
    documentContent: any;
    onUpload?: (content: any) => void;
    uploadEndpoint?: string;
    className?: string;
}
declare const DocumentHandler: React.FC<DocumentHandlerProps>;
export default DocumentHandler;
