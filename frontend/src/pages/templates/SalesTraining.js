import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileUp, Loader2, FileDown } from 'lucide-react';
import DocumentUpload from '../DocumentUpload';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
const SalesTraining = () => {
    const [title, setTitle] = useState("销售技能培训手册");
    const [subtitle, setSubtitle] = useState("提升您的销售能力，成为销售精英！");
    const [overview, setOverview] = useState("本培训手册旨在帮助您掌握先进的销售技巧，提高客户转化率，实现销售目标。无论您是新人还是经验丰富的销售人员，这里的内容都将为您的职业发展提供有力支持。");
    const [salesSkills, setSalesSkills] = useState([
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
    ]);
    const [products, setProducts] = useState([
        {
            id: "1",
            name: "智能家居系统",
            features: ["远程控制", "能源管理", "安全监控"],
            targetCustomers: ["科技爱好者", "新房业主"]
        },
    ]);
    const [isEditing, setIsEditing] = useState({});
    const [documentContent, setDocumentContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
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
            }]);
    };
    const handleAddProduct = () => {
        setProducts([...products, {
                id: "new",
                name: "新产品",
                features: ["功能1"],
                targetCustomers: ["目标客户"]
            }]);
    };
    const handleTitleEdit = (id, newValue) => {
        setSalesSkills(salesSkills.map(skill => skill.id === id ? { ...skill, title: newValue } : skill));
    };
    const toggleEdit = (id) => {
        setIsEditing(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };
    const handleCopySkill = (skillId) => {
        setSalesSkills(prev => {
            const skillToCopy = prev.find(skill => skill.id === skillId);
            if (!skillToCopy)
                return prev;
            return [...prev, {
                    ...skillToCopy,
                    id: "new",
                    title: `${skillToCopy.title} (复制)`,
                }];
        });
    };
    const handleUploadConfirm = async (uploadSuccess, files) => {
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
        }
        catch (error) {
            console.error('Generation error:', error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "文档生成失败，请重试",
                variant: "destructive",
            });
        }
        finally {
            setIsGenerating(false);
            setShowUpload(false);
        }
    };
    const handleUploadCancel = () => {
        setShowUpload(false);
    };
    const saveToBackend = async (fileBlob, fileType) => {
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
            const content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result;
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
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('PDF generation error:', error);
            toast({
                title: "生成PDF失败",
                description: error instanceof Error ? error.message : "PDF生成失败，请重试",
                variant: "destructive",
            });
        }
        finally {
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
                            ...documentContent.split('\n').map(line => new Paragraph({
                                children: [
                                    new TextRun({
                                        text: line,
                                        size: 24,
                                    }),
                                ],
                            })),
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
        }
        catch (error) {
            console.error('Word generation error:', error);
            toast({
                title: "生成Word失败",
                description: error instanceof Error ? error.message : "Word生成失败，请重试",
                variant: "destructive",
            });
        }
        finally {
            setIsDownloading(false);
        }
    };
    return (_jsxs("div", { className: "container mx-auto p-6", children: [_jsx(Card, { className: "mb-6", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold mb-2", children: title }), _jsx("p", { className: "text-gray-600", children: subtitle })] }), _jsxs("div", { className: "space-x-2", children: [_jsx(Button, { variant: "outline", onClick: () => setShowUpload(true), disabled: isGenerating, children: isGenerating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileUp, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u6863"] })) }), _jsx(Button, { variant: "outline", onClick: handleDownloadPdfFrontend, disabled: isDownloading || !documentContent, children: isDownloading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u4E0B\u8F7D\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D\u6587\u6863"] })) })] })] }), _jsx("div", { className: "mt-6", children: _jsx("p", { className: "text-gray-700", children: overview }) }), _jsxs("div", { className: "mt-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: "\u9500\u552E\u6280\u80FD" }), _jsx(Button, { variant: "outline", onClick: handleAddSkill, children: "\u6DFB\u52A0\u6280\u80FD" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: salesSkills.map((skill) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "font-semibold", children: skill.title }), _jsx("p", { className: "text-gray-600", children: skill.description }), _jsx("ul", { className: "list-disc list-inside space-y-1", children: skill.points.map((point, index) => (_jsx("li", { children: point }, index))) })] }) }) }, skill.id))) })] }), _jsxs("div", { className: "mt-8", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-xl font-semibold", children: "\u4EA7\u54C1\u4FE1\u606F" }), _jsx(Button, { variant: "outline", onClick: handleAddProduct, children: "\u6DFB\u52A0\u4EA7\u54C1" })] }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: products.map((product) => (_jsx(Card, { children: _jsx(CardContent, { className: "p-4", children: _jsxs("div", { className: "space-y-2", children: [_jsx("h3", { className: "font-semibold", children: product.name }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium", children: "\u4EA7\u54C1\u7279\u70B9\uFF1A" }), _jsx("ul", { className: "list-disc list-inside", children: product.features.map((feature, index) => (_jsx("li", { children: feature }, index))) })] }), _jsxs("div", { children: [_jsx("h4", { className: "font-medium", children: "\u76EE\u6807\u5BA2\u6237\uFF1A" }), _jsx("ul", { className: "list-disc list-inside", children: product.targetCustomers.map((customer, index) => (_jsx("li", { children: customer }, index))) })] })] }) }) }, product.id))) })] })] }) }) }), showUpload && (_jsx(DocumentUpload, { onConfirm: handleUploadConfirm, onCancel: () => setShowUpload(false) })), documentContent && (_jsx(Card, { className: "mt-6", children: _jsx(CardContent, { className: "pt-6", children: _jsx("div", { className: "prose max-w-none", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: documentContent }) }) }) }))] }));
};
export default SalesTraining;
