import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from '@/hooks/use-toast'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileUp, Loader2, Download, FileDown } from 'lucide-react'
import DocumentUpload from '../DocumentUpload'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

interface SalesSkill {
  id: string;
  title: string;
  description: string;
  points: string[];
}

interface ProductInfo {
  id: string;
  name: string;
  features: string[];
  targetCustomers: string[];
}

const SalesTraining: React.FC = () => {
  const [title, setTitle] = useState("销售技能培训手册")
  const [subtitle, setSubtitle] = useState("提升您的销售能力，成为销售精英！")
  const [overview, setOverview] = useState(
    "本培训手册旨在帮助您掌握先进的销售技巧，提高客户转化率，实现销售目标。无论您是新人还是经验丰富的销售人员，这里的内容都将为您的职业发展提供有力支持。"
  )

  const [salesSkills, setSalesSkills] = useState<SalesSkill[]>([
    {
      id: "1",
      title: "需求分析",
      description: "深入了解客户需求，提供个性化解决方案",
      points: [
        "倾听客户诉求",
        "提出针对性问题",
        "记录关键信息"
      ]
    },
  ])

  const [products, setProducts] = useState<ProductInfo[]>([
    {
      id: "1",
      name: "智能家居系统",
      features: ["远程控制", "能源管理", "安全监控"],
      targetCustomers: ["科技爱好者", "新房业主"]
    },
  ])

  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({})
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  const templateDescription = {
    title,
    subtitle,
    overview,
    salesSkills,
    products,
    content: documentContent
  };

  const handleAddSkill = () => {
    setSalesSkills([...salesSkills, {
      id: "new",
      title: "新销售技能",
      description: "请编辑技能描述",
      points: ["新要点"]
    }])
  }

  const handleAddProduct = () => {
    setProducts([...products, {
      id: "new",
      name: "新产品",
      features: ["功能1"],
      targetCustomers: ["目标客户"]
    }])
  }

  const handleTitleEdit = (id: string, newValue: string) => {
    setSalesSkills(salesSkills.map(skill => 
      skill.id === id ? { ...skill, title: newValue } : skill
    ))
  }

  const toggleEdit = (id: string) => {
    setIsEditing(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleCopySkill = (skillId: string) => {
    setSalesSkills(prev => {
      const skillToCopy = prev.find(skill => skill.id === skillId);
      if (!skillToCopy) return prev;
      
      return [...prev, {
        ...skillToCopy,
        id: "new",
        title: `${skillToCopy.title} (复制)`,
      }];
    });
  };

  const handleUploadConfirm = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
      setShowUpload(false);
      return;
    }
    
    try {
      setIsGenerating(true);
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      files.forEach(file => {
        formData.append('files', file);
      });

      formData.append('template', 'sales_training');
      formData.append('description', JSON.stringify(templateDescription));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'sales_training',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch('http://localhost:8001/api/storage/generate_full_doc_with_template/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(errorText || '文档生成失败');
      }

      const data = await response.json();
      console.log('Response data:', data);
      setDocumentContent(data.document || data.content || '');
      
      toast({
        title: "生成成功",
        description: "销售培训文档已生成",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowUpload(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
  };

  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast({
          title: "认证错误",
          description: "请先登录",
          variant: "destructive",
        });
        throw new Error('未登录');
      }

      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      const response = await fetch('http://localhost:8001/api/storage/download_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: content,
          format: fileType,
          filename: '销售培训手册',
          isBase64: true
        })
      });

      const responseData = await response.json();
      console.log('Download response:', responseData);
      
      const formData = new URLSearchParams();
      formData.append('document_name', '销售培训手册');
      formData.append('document_type', fileType);

      const recordResponse = await fetch('http://localhost:8001/api/storage/create_generated_document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!recordResponse.ok) {
        const errorText = await recordResponse.text();
        throw new Error(errorText || '创建文档记录失败');
      }

      toast({
        title: "保存成功",
        description: "文档已保存到云端",
      });
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPdfFrontend = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4'
      });
      
      doc.setFont('helvetica', 'normal');
      
      doc.setFontSize(20);
      doc.text('销售培训手册', 40, 40);
      
      doc.setFontSize(12);
      const contentLines = documentContent.split('\n');
      let y = 80;
      
      contentLines.forEach((line) => {
        if (y > 780) {
          doc.addPage();
          y = 40;
        }
        doc.text(line, 40, y);
        y += 20;
      });
      
      const pdfBlob = doc.output('blob');
      
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '销售培训手册.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await saveToBackend(pdfBlob, 'pdf');
      
      toast({
        title: "下载成功",
        description: "文档已下载为PDF格式",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "生成PDF失败",
        description: error instanceof Error ? error.message : "PDF生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const handleDownloadWordFrontend = async () => {
    try {
      setIsDownloading(true);
      
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: "销售培训手册",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({}),
            ...documentContent.split('\n').map(line => 
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
      a.download = '销售培训手册.docx';
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
    <div className="container mx-auto p-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-2">{title}</h1>
                <p className="text-gray-600">{subtitle}</p>
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowUpload(true)}
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
                      上传文档
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPdfFrontend}
                  disabled={isDownloading || !documentContent}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      下载中...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      下载文档
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-gray-700">{overview}</p>
            </div>

            {/* Sales Skills Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">销售技能</h2>
                <Button variant="outline" onClick={handleAddSkill}>
                  添加技能
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {salesSkills.map((skill) => (
                  <Card key={skill.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{skill.title}</h3>
                        <p className="text-gray-600">{skill.description}</p>
                        <ul className="list-disc list-inside space-y-1">
                          {skill.points.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Products Section */}
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">产品信息</h2>
                <Button variant="outline" onClick={handleAddProduct}>
                  添加产品
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{product.name}</h3>
                        <div>
                          <h4 className="font-medium">产品特点：</h4>
                          <ul className="list-disc list-inside">
                            {product.features.map((feature, index) => (
                              <li key={index}>{feature}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium">目标客户：</h4>
                          <ul className="list-disc list-inside">
                            {product.targetCustomers.map((customer, index) => (
                              <li key={index}>{customer}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {showUpload && (
        <DocumentUpload
          onConfirm={handleUploadConfirm}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {documentContent && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {documentContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
};

export default SalesTraining;