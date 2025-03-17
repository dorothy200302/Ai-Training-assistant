import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, FileText, Eye, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Document, Packer } from "docx"
import { API_BASE_URL } from "@/config/constants"
import { createApiRequest } from "@/utils/errorHandler"

interface DocumentActionsProps {
  documentContent: string;
  title?: string;
  onPreview?: () => void;
  isGenerating?: boolean;
}

const DocumentActions: React.FC<DocumentActionsProps> = ({
  documentContent,
  title = "文档",
  onPreview,
  isGenerating = false,
}) => {
  const handlePreview = async () => {
    if (onPreview) {
      onPreview();
      return;
    }

    try {
      window.open("/document-preview", "_blank");
    } catch (error) {
      toast({
        title: "预览失败",
        description: "无法打开预览，请稍后重试",
        variant: "destructive",
      });
    }
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
          filename: title,
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
    } catch (error) {
      console.error('Save to backend error:', error);
      throw error;
    }
  };

  const handleDownload = async (format: 'pdf' | 'docx') => {
    try {
      let blob: Blob;
      
      if (format === 'docx') {
        // 创建Word文档
        const doc = new Document({
          sections: [{
            properties: {},
            children: documentContent.split('\n').map(line => ({
              text: line,
              size: 24,
            })),
          }],
        });
        blob = await Packer.toBlob(doc);
      } else {
        // 获取PDF版本
        const response = await createApiRequest(
          `${API_BASE_URL}/api/storage/pdf/generate/?content=${encodeURIComponent(documentContent)}`,
          { method: 'GET' }
        );
        blob = await response.blob();
      }

      // 下载文件
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 保存到后端
      await saveToBackend(blob, format);

      toast({
        title: "下载成功",
        description: `文档已下载为${format.toUpperCase()}格式`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "下载失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[180px]" disabled={isGenerating}>
          文档操作
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={handlePreview}>
          <Eye className="mr-2 h-4 w-4" />
          在线预览
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          下载 PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('docx')}>
          <Download className="mr-2 h-4 w-4" />
          下载 Word
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DocumentActions;