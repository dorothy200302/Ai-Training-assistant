import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import {  UserPlus, Briefcase, Mail, Users, Coffee, FileUp, Loader2, FileDown } from 'lucide-react'
import DocumentUpload from '../DocumentUpload'
import { EditableDocumentContent } from "@/components/EditableDocumentContent";
import { EditableText } from '@/components/EditableText';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { API_BASE_URL } from "../../config/constants";
import { createApiRequest } from "@/utils/errorHandler";
import { LoadingOverlay } from "@/components/ui/loading-overlay";

interface ChecklistItem {
  id: string;
  content: string;
  icon: React.ReactNode;
  checked?: boolean;
}

interface EditableContent {
  title: string;
  subtitle: string;
  overview: string;
}

const NewEmployeeOrientation: React.FC = () => {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'task1', content: '完成人事部门的入职文件', icon: <UserPlus className="h-5 w-5" /> },
    { id: 'task2', content: '领取办公设备（电脑、门禁卡等）', icon: <Briefcase className="h-5 w-5" /> },
    { id: 'task3', content: '设置公司邮箱和内部系统账号', icon: <Mail className="h-5 w-5" /> },
    { id: 'task4', content: '熟悉部门同事和工作环境', icon: <Users className="h-5 w-5" /> },
    { id: 'task5', content: '与直属上级进行工作交接', icon: <Coffee className="h-5 w-5" /> },
  ])

  const [documentContent, setDocumentContent] = useState<string>('');
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [editableContent, setEditableContent] = useState<EditableContent>({
    title: '新员工入职培训手册',
    subtitle: '欢迎加入我们的团队！',
    overview: '本手册旨在帮助您快速了解公司文化、规章制度及您的工作职责。',
  });
  const handleUploadConfirm = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
      setShowUpload(false);
      return;
    }

    try {
      setIsGenerating(true);
      const formData = new FormData();
      formData.append('template', 'new_employee_orientation');
      formData.append('description', JSON.stringify({
        title: editableContent.title,
        subtitle: editableContent.subtitle,
        overview: editableContent.overview,
        checklist: checklist.map(item => ({
          content: item.content,
          checked: item.checked
        }))
      }));

      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await createApiRequest(`${API_BASE_URL}/api/storage/generate_full_doc_with_template/`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setDocumentContent(data.document || data.content || '');
      
      toast({
        title: "生成成功",
        description: "新员工入职培训文档已生成",
      });
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
      setShowUpload(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  const handleCheckboxChange = (id: string): void => {
    setChecklist(prev => 
      prev.map(item => 
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    )
  }


  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
    try {
      

      // 将文件内容转换为base64字符串
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          // 移除base64前缀（例如："data:application/pdf;base64,"）
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      // 使用现有的download_document接口
      const response = await createApiRequest(`${API_BASE_URL}/api/storage/download_document`, {
        method: 'POST',
        
        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: '新员工入职培训手册',
          isBase64: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.detail === 'Token not found or expired') {
          localStorage.removeItem('token'); // Clear invalid token
          toast({
            title: "认证过期",
            description: "请重新登录",
            variant: "destructive",
          });
          // TODO: Redirect to login page if needed
          throw new Error('认证过期');
        }
        throw new Error(errorData?.detail || '保存到后端失败');
      }

      
      // 创建文档记录
      const formData = new URLSearchParams();
      formData.append('document_name', '新员工入职培训手册');
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

  

  const handleDownloadWordFrontend = async () => {
    try {
      setIsDownloading(true);
      
      // 创建文档
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "新员工入职培训手册",
              heading: HeadingLevel.HEADING_1,
            }),
            // 添加空行
            new Paragraph({}),
            // 添加内容
            ...documentContent.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line,
                    size: 24, // 12pt
                  }),
                ],
              })
            ),
          ],
        }],
      });

      // 生成文档
      const blob = await Packer.toBlob(doc);
      
      // 下载文档
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '新员工入职培训手册.docx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // 保存到后端
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
    <div className="container mx-auto p-4 relative min-h-screen">
      {isGenerating && (
        <LoadingOverlay 
          isLoading={isGenerating}
          message="正在生成新员工入职培训文档..."
        />
      )}
      <div className="w-screen bg-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          <EditableText 
            value={editableContent.title} 
            onChange={(value) => setEditableContent(prev => ({ ...prev, title: value }))}
          />
        </h1>
        <p className="text-amber-100">
          <EditableText 
            value={editableContent.subtitle} 
            onChange={(value) => setEditableContent(prev => ({ ...prev, subtitle: value }))}
          />
        </p>
      </div>
      
      <div className="flex-1 p-6 overflow-auto">
        {/* Checklist Section */}
        <div className="max-w-none w-full space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">入职清单</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                {checklist.map(item => (
                  <div key={item.id} className="flex items-center mb-4 last:mb-0">
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      onCheckedChange={() => handleCheckboxChange(item.id)}
                      className="border-amber-400 text-amber-600 focus:ring-amber-500"
                    />
                    <label
                      htmlFor={item.id}
                      className="flex items-center ml-3 text-amber-700 cursor-pointer"
                    >
                      <span className="bg-white p-1 rounded-full mr-3 text-amber-500">
                        {item.icon}
                      </span>
                      {item.content}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          {/* Upload and Generate Section */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileUp className="mr-2 h-4 w-4" />
                  上传培训资料
                </>
              )}
            </Button>
          </div>

          {/* Document Content Section */}
          {documentContent && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-end gap-2 mb-4">
                
                <Button
                  onClick={handleDownloadWordFrontend}
                  disabled={!documentContent || isDownloading}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  下载Word
                </Button>
              </div>
              <EditableDocumentContent
                content={documentContent}
                onContentChange={setDocumentContent}
                documentTitle="新员工入职培训手册"
              />
            </div>
          )}

          {/* Upload Dialog */}
          {showUpload && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <DocumentUpload 
                  onConfirm={handleUploadConfirm}
                  onCancel={handleUploadCancel}
                  isLoading={isGenerating}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NewEmployeeOrientation