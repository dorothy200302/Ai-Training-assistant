export interface DocumentService {
    generateDocument(params: {
        title: string;
        content: string;
        format: 'pdf' | 'docx';
    }): Promise<Blob>;
    downloadDocument(blob: Blob, filename: string): Promise<void>;
    saveToBackend(params: {
        content: string;
        format: string;
        filename: string;
        isBase64: boolean;
    }): Promise<void>;
    deleteDocument(documentId: string): Promise<void>;
}
declare class DocumentServiceImpl implements DocumentService {
    private baseUrl;
    generateDocument(params: {
        title: string;
        content: string;
        format: 'pdf' | 'docx';
    }): Promise<Blob>;
    downloadDocument(blob: Blob, filename: string): Promise<void>;
    saveToBackend(params: {
        content: string;
        format: string;
        filename: string;
        isBase64: boolean;
    }): Promise<void>;
    deleteDocument(documentId: string): Promise<void>;
}
export declare const documentService: DocumentServiceImpl;
export {};
