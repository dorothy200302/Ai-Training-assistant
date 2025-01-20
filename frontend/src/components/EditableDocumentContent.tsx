import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Save, X, FileDown, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from "@/hooks/use-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { createApiRequest } from "@/utils/errorHandler";
import { API_BASE_URL } from "../config/constants";
import { ButtonLoading } from "@/components/ui/loading-state";

interface EditableDocumentContentProps {
  content: string;
  onContentChange: (newContent: string) => void;
  documentTitle: string;
}

export const EditableDocumentContent: React.FC<EditableDocumentContentProps> = ({
  content,
  onContentChange,
  documentTitle,
}) => {
  const [editingContent, setEditingContent] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  const handleEditContent = () => {
    setEditedContent(content);
    setEditingContent(true);
  };

  const handleSaveContent = () => {
    onContentChange(editedContent);
    setEditingContent(false);
    toast({
      title: "保存成功",
      description: "文档内容已更新",
    });
  };

  const handleCancelEdit = () => {
    setEditingContent(false);
    setEditedContent('');
  };

  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
    try {
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',
        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: documentTitle,
          isBase64: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.detail === 'Token not found or expired') {
          localStorage.removeItem('token');
          toast({
            title: "认证过期",
            description: "请重新登录",
            variant: "destructive",
          });
          throw new Error('认证过期');
        }
        throw new Error(errorData?.detail || '保存到后端失败');
      }

      const formData = new URLSearchParams();
      formData.append('document_name', documentTitle);
      formData.append('document_type', fileType);
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleDownloadWord = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: documentTitle,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({}),
            ...content.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24,
                  }),
                ],
              })
            ),
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await saveToBackend(blob, 'docx');

      toast({
        title: "下载成功",
        description: "文档已下载为Word格式",
      });
    } catch (error) {
      console.error('Word generation error:', error);
      toast({
        title: "生成Word失败",
        description: error instanceof Error ? error.message : "Word生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card>
      <CardContent className="relative prose prose-amber max-w-none mt-4">
        <div className="flex justify-end mb-4">
          {!editingContent ? (
            <div className="flex gap-2 absolute top-2 right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditContent}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                编辑
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadWord}
                disabled={isDownloading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {isDownloading ? (
                  <ButtonLoading text="下载中..." />
                ) : (
                  <>
                    <FileDown className="w-4 h-4 mr-2" />
                    下载Word文档
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 absolute top-2 right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveContent}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                保存
              </Button>
            </div>
          )}
        </div>
        {content ? (
          editingContent ? (
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[500px] font-mono text-sm"
            />
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          )
        ) : (
          <div className="text-center text-gray-500">
            请先生成文档内容
          </div>
        )}
      </CardContent>
    </Card>
  );
};
