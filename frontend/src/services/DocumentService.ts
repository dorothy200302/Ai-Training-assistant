import { API_BASE_URL } from '../config/constants';

export interface DocumentService {
  generateDocument(params: { title: string; content: string; format: 'pdf' | 'docx' }): Promise<Blob>;
  downloadDocument(blob: Blob, filename: string): Promise<void>;
  saveToBackend(params: { content: string; format: string; filename: string; isBase64: boolean }): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
}

class DocumentServiceImpl implements DocumentService {
  private baseUrl = API_BASE_URL;

  async generateDocument(params: { title: string; content: string; format: 'pdf' | 'docx' }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/documents/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate document: ${response.statusText}`);
    }

    return await response.blob();
  }

  async downloadDocument(blob: Blob, filename: string): Promise<void> {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async saveToBackend(params: { content: string; format: string; filename: string; isBase64: boolean }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Failed to save document: ${response.statusText}`);
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete document: ${response.statusText}`);
    }
  }
}

export const documentService = new DocumentServiceImpl();
