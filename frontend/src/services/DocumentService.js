class DocumentServiceImpl {
    constructor() {
        Object.defineProperty(this, "baseUrl", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'http://localhost:8001/api'
        });
    }
    async generateDocument(params) {
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
    async downloadDocument(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }
    async saveToBackend(params) {
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
    async deleteDocument(documentId) {
        const response = await fetch(`${this.baseUrl}/api/documents/${documentId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new Error(`Failed to delete document: ${response.statusText}`);
        }
    }
}
export const documentService = new DocumentServiceImpl();
