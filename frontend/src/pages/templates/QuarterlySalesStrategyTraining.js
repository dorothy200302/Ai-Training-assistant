import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart, Target, Calendar, CheckCircle2, Plus } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Pencil, Save } from 'lucide-react';
import { FileUp, Loader2, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DocumentUpload from '../DocumentUpload';
import jsPDF from 'jspdf';
import { createApiRequest } from "@/utils/errorHandler";
import { API_BASE_URL } from "../../config/constants";
import { Document, Paragraph, TextRun, HeadingLevel, Packer } from 'docx';
import remarkGfm from 'remark-gfm';
import ReactMarkdown from 'react-markdown';
const QuarterlySalesStrategyTraining = () => {
    const [selectedQuarter, setSelectedQuarter] = useState(1);
    const [modules, setModules] = useState([
        { id: 'module1', title: '市场分析与预测', content: '学习如何分析市场趋势，预测客户需求，并据此调整销售策略。' },
        { id: 'module2', title: '高级谈判技巧', content: '掌握复杂销售情境下的谈判策略，提高成单率。' },
        { id: 'module3', title: '数字化销售工具应用', content: '熟练使用CRM系统和销售分析工具，提升工作效率。' }
    ]);
    const [quarters] = useState([
        { id: 1, name: "第一季度", focus: "开年计划与目标设定", isEditing: false },
        { id: 2, name: "第二季度", focus: "客户关系深化与跨部门协作", isEditing: false },
        { id: 3, name: "第三季度", focus: "创新销售技巧与新市场开拓", isEditing: false },
        { id: 4, name: "第四季度", focus: "年终冲刺与来年规划", isEditing: false }
    ]);
    const [actionSteps] = useState([
        { id: 'step1', week: '第1-2周', title: '培训准备与启动', description: '制定详细培训计划准备培训材料' },
        { id: 'step2', week: '第3-6周', title: '核心培训模块实施', description: '开展集中培训，包括理论学习和实践演练' },
        // ... add other steps
    ]);
    const [objectives, setObjectives] = useState([
        { id: 'obj1', icon: 'Target', content: '增加季度销售额 20%' },
        { id: 'obj2', icon: 'Users', content: '提高客户满意度至 95%' },
        { id: 'obj3', icon: 'Zap', content: '推出 2 个新的销售策略' }
    ]);
   
    const [pageTexts] = useState([
        { id: 'overview-title', content: '季度销售策略培训模板', isEditing: false },
        { id: 'overview-subtitle', content: '提升您的团队销售能力，实现卓越业绩', isEditing: false }
    ]);
    const [documentContent, setDocumentContent] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();
    const handleModuleEdit = (moduleId, field, value) => {
        setModules(prev => prev.map(module => module.id === moduleId ? { ...module, [field]: value } : module));
    };
    const base_url=API_BASE_URL
    const handleObjectiveEdit = (objId, value) => {
        setObjectives(prev => prev.map(obj => obj.id === objId ? { ...obj, content: value } : obj));
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
            formData.append('template', 'quarterly_sales_strategy');
            formData.append('description', JSON.stringify({
                title: '季度销售策略培训手册',
                subtitle: '提升销售业绩的季度指南',
                overview: '本手册提供了季度销售策略和目标达成方法。',
                objectives: objectives,
                modules: modules,
                actionSteps: actionSteps,
                selectedQuarter: selectedQuarter
            }));
            console.log('Sending request to generate template...');
            console.log('FormData contents:', {
                files: files.map(f => f.name),
                template: 'quarterly_sales_strategy',
                token: token ? 'present' : 'missing'
            });
            const response = await createApiRequest(`${base_url}/api/storage/generate_full_doc_with_template/`, {
                method: 'POST',
               
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
                description: "季度销售策略培训文档已生成",
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
            const response = await createApiRequest(`${base_url}/api/storage/download_document`, {
                method: 'POST',
               
                body: JSON.stringify({
                    content: content,
                    format: fileType,
                    filename: '季度销售策略培训手册',
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
            const data = await response.json();
            console.log('Save to backend response:', data);
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
            doc.text('季度销售策略培训手册', 40, 40);
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
            a.download = '季度销售策略培训手册.pdf';
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
    const handleDownloadWordFrontend = async () => {
        try {
            setIsDownloading(true);
            const doc = new Document({
                sections: [{
                        properties: {},
                        children: [
                            new Paragraph({
                                text: "季度销售策略培训手册",
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
            a.download = '季度销售策略培训手册.docx';
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
    return (_jsx("div", { className: "min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100", children: _jsxs("div", { className: "w-screen bg-white shadow-lg", children: [_jsxs("div", { className: "bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: pageTexts.find(text => text.id === 'overview-title')?.content }), _jsx("p", { className: "text-amber-100", children: pageTexts.find(text => text.id === 'overview-subtitle')?.content })] }), _jsxs("div", { className: "p-6", children: [_jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u6982\u8FF0" }), _jsx("p", { className: "text-amber-700 mb-4", children: "\u672C\u57F9\u8BAD\u6A21\u677F\u65E8\u5728\u5E2E\u52A9\u9500\u552E\u56E2\u961F\u5236\u5B9A\u548C\u6267\u884C\u6BCF\u4E2A\u5B63\u5EA6\u7684\u9500\u552E\u7B56\u7565\u3002\u901A\u8FC7\u7CFB\u7EDF\u5316\u7684\u57F9\u8BAD\u548C\u5B9E\u8DF5\uFF0C\u6211\u4EEC\u5C06\u786E\u4FDD\u56E2\u961F\u59CB\u7EC8\u4FDD\u6301\u7ADE\u4E89\u529B\uFF0C\u5E76\u80FD\u591F\u9002\u5E94\u4E0D\u65AD\u53D8\u5316\u7684\u5E02\u573A\u73AF\u5883\u3002" })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u9009\u62E9\u5B63\u5EA6" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4", children: quarters.map((quarter) => (_jsx(Card, { className: `bg-amber-50 border-amber-200 cursor-pointer transition-all ${selectedQuarter === quarter.id ? 'ring-2 ring-amber-500' : ''}`, onClick: () => setSelectedQuarter(quarter.id), children: _jsxs(CardContent, { className: "pt-6 flex flex-col items-center text-center", children: [_jsx(Calendar, { className: "w-8 h-8 text-amber-500 mb-2" }), _jsx("h3", { className: "text-lg font-semibold text-amber-800", children: quarter.name }), _jsx("p", { className: "text-sm text-amber-600 mt-2", children: quarter.focus })] }) }, quarter.id))) })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u5B63\u5EA6\u57F9\u8BAD\u8BE6\u60C5" }), _jsxs(Tabs, { defaultValue: "objectives", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3 bg-amber-100", children: [_jsx(TabsTrigger, { value: "objectives", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u5173\u952E\u76EE\u6807" }), _jsx(TabsTrigger, { value: "modules", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u57F9\u8BAD\u6A21\u5757" }), _jsx(TabsTrigger, { value: "action-plan", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u884C\u52A8\u8BA1\u5212" })] }), _jsx(TabsContent, { value: "objectives", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "text-amber-800", children: ["\u7B2C ", selectedQuarter, " \u5B63\u5EA6\u5173\u952E\u76EE\u6807"] }), _jsx(CardDescription, { className: "text-amber-600", children: "\u805A\u7126\u672C\u5B63\u5EA6\u7684\u6838\u5FC3\u9500\u552E\u76EE\u6807" })] }), _jsx(CardContent, { children: _jsx("ul", { className: "space-y-2 text-amber-700", children: objectives.map(objective => (_jsx("li", { className: "flex items-center group", children: objective.isEditing ? (_jsxs("div", { className: "flex items-center gap-2 flex-1", children: [_jsx(Input, { value: objective.content, onChange: (e) => handleObjectiveEdit(objective.id, e.target.value), className: "flex-1" }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setObjectives(prev => prev.map(obj => obj.id === objective.id ? { ...obj, isEditing: false } : obj)), children: _jsx(Save, { className: "h-4 w-4" }) })] })) : (_jsxs(_Fragment, { children: [_jsx(Target, { className: "w-5 h-5 text-amber-500 mr-2" }), _jsx("span", { children: objective.content }), _jsxs("div", { className: "flex gap-1 opacity-0 group-hover:opacity-100 ml-2", children: [_jsx(Button, { size: "sm", variant: "ghost", onClick: () => setObjectives(prev => prev.map(obj => obj.id === objective.id ? { ...obj, isEditing: true } : obj)), children: _jsx(Pencil, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => {
                                                                                        const newId = `obj${objectives.length + 1}`;
                                                                                        setObjectives(prev => [...prev, {
                                                                                                ...objective,
                                                                                                id: newId,
                                                                                                isEditing: false
                                                                                            }]);
                                                                                    }, children: _jsx(Plus, { className: "h-4 w-4" }) })] })] })) }, objective.id))) }) })] }) }), _jsx(TabsContent, { value: "modules", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-amber-800", children: "\u57F9\u8BAD\u6A21\u5757" }), _jsx(CardDescription, { className: "text-amber-600", children: "\u672C\u5B63\u5EA6\u91CD\u70B9\u57F9\u8BAD\u5185\u5BB9" })] }), _jsx(CardContent, { children: _jsx(Accordion, { type: "single", collapsible: true, className: "w-full", children: modules.map(module => (_jsxs(AccordionItem, { value: module.id, children: [_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800 group", children: module.isEditing ? (_jsx(Input, { value: module.title, onChange: (e) => handleModuleEdit(module.id, 'title', e.target.value), className: "inline-block w-auto" })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: module.title }), _jsx(Button, { size: "sm", variant: "ghost", className: "opacity-0 group-hover:opacity-100", onClick: () => setModules(prev => prev.map(m => m.id === module.id ? { ...m, isEditing: true } : m)), children: _jsx(Pencil, { className: "h-4 w-4" }) })] })) }), _jsx(AccordionContent, { className: "text-amber-600 group", children: module.isEditing ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { value: module.content, onChange: (e) => handleModuleEdit(module.id, 'content', e.target.value) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => setModules(prev => prev.map(m => m.id === module.id ? { ...m, isEditing: false } : m)), children: _jsx(Save, { className: "h-4 w-4" }) })] })) : (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { children: module.content }), _jsx(Button, { size: "sm", variant: "ghost", className: "opacity-0 group-hover:opacity-100", onClick: () => setModules(prev => prev.map(m => m.id === module.id ? { ...m, isEditing: true } : m)), children: _jsx(Pencil, { className: "h-4 w-4" }) })] })) })] }, module.id))) }) })] }) }), _jsx(TabsContent, { value: "action-plan", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-amber-800", children: "\u884C\u52A8\u8BA1\u5212" }), _jsx(CardDescription, { className: "text-amber-600", children: "\u5B9E\u65BD\u6B65\u9AA4\u4E0E\u65F6\u95F4\u8868" })] }), _jsx(CardContent, { children: _jsx("ol", { className: "space-y-4 text-amber-700", children: actionSteps.map((step, index) => (_jsxs("li", { className: "flex items-start group", children: [_jsx("span", { className: "flex items-center justify-center w-6 h-6 rounded-full bg-amber-200 text-amber-700 font-bold mr-2", children: index + 1 }), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold", children: step.title }), _jsx("p", { className: "text-amber-600", children: step.description })] })] }, step.id))) }) })] }) })] })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u8FDB\u5EA6" }), _jsx(Card, { className: "bg-amber-50 border-amber-200", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "text-amber-700 font-semibold", children: "\u603B\u4F53\u5B8C\u6210\u5EA6" }), _jsx("span", { className: "text-amber-700 font-semibold", children: "75%" })] }), _jsx(Progress, { value: 75, className: "w-full bg-amber-200 [&>div]:bg-amber-500" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-800 mb-2", children: "\u5DF2\u5B8C\u6210\u6A21\u5757" }), _jsxs("ul", { className: "space-y-1 text-amber-700", children: [_jsxs("li", { className: "flex items-center", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-green-500 mr-2" }), "\u5E02\u573A\u5206\u6790\u4E0E\u9884\u6D4B"] }), _jsxs("li", { className: "flex items-center", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-green-500 mr-2" }), "\u9AD8\u7EA7\u8C08\u5224\u6280\u5DE7"] })] })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-800 mb-2", children: "\u5F85\u5B8C\u6210\u6A21\u5757" }), _jsx("ul", { className: "space-y-1 text-amber-700", children: _jsxs("li", { className: "flex items-center", children: [_jsx(BarChart, { className: "w-4 h-4 text-amber-500 mr-2" }), "\u6570\u5B57\u5316\u9500\u552E\u5DE5\u5177\u5E94\u7528"] }) })] })] })] }) }) })] }), _jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsx(Button, { onClick: () => setShowUpload(true), className: "bg-amber-500 hover:bg-amber-600 text-white", disabled: isGenerating, children: isGenerating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileUp, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u6863\u751F\u6210"] })) }), documentContent && (_jsxs(_Fragment, { children: [_jsxs(Button, { onClick: handleDownloadPdfFrontend, variant: "outline", disabled: isDownloading, children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D PDF"] }), _jsxs(Button, { onClick: handleDownloadWordFrontend, variant: "outline", disabled: isDownloading, children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D Word"] })] }))] }), showUpload && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsx("div", { className: "bg-white rounded-lg p-6 max-w-md w-full mx-4", children: _jsx(DocumentUpload, { onUpload: handleUploadConfirm, isLoading: isGenerating, onCancel: () => setShowUpload(false) }) }) })), documentContent && (_jsx("div", { className: "mt-8", children: _jsx(Card, { className: "bg-white", children: _jsx(CardContent, { className: "prose max-w-none p-6", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: documentContent }) }) }) }))] })] }) }));
};
export default QuarterlySalesStrategyTraining;
