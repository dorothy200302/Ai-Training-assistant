interface DocumentUploadProps {
    onUploadComplete: (files: File[]) => void;
    onConfirm: (files: File[]) => void;
    maxFileSize?: number;
    acceptedFileTypes?: string[];
    hasCompletedConversation?: boolean;
}
export declare function DocumentUpload({ onUploadComplete, onConfirm, maxFileSize, // 20MB default
acceptedFileTypes, hasCompletedConversation, }: DocumentUploadProps): import("react/jsx-runtime").JSX.Element;
export {};
