import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ClipboardList, BarChart, CheckCircle2, FileText, Target, FileUp, Loader2, FileDown } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import DocumentUpload from '@/components/DocumentUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const ManagementSkillsTraining = () => {
    const [completedSections, setCompletedSections] = useState([]);
    const [documentContent, setDocumentContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const sections = [
        { id: 'intro', title: '项目管理简介' },
        { id: 'planning', title: '项目规划' },
        { id: 'execution', title: '项目执行' },
        { id: 'monitoring', title: '监控与控制' },
        { id: 'closing', title: '项目收尾' },
    ];
    const toggleSectionCompletion = (sectionId) => {
        setCompletedSections(prev => prev.includes(sectionId)
            ? prev.filter(id => id !== sectionId)
            : [...prev, sectionId]);
    };
    const calculateProgress = () => {
        return (completedSections.length / sections.length) * 100;
    };
    const handleUploadConfirm = async (files, description) => {
        if (!files || files.length === 0) {
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
            formData.append('template', 'management_skills');
            formData.append('description', JSON.stringify({
                title: '管理技能培训手册',
                subtitle: '提升您的管理能力',
                overview: '本手册旨在帮助您掌握核心管理技能，提高团队效率。',
                content: documentContent,
                training_sections: sections.map(section => ({
                    id: section.id,
                    title: section.title,
                    completed: completedSections.includes(section.id)
                }))
            }));
            console.log('Sending request to generate template...');
            console.log('FormData contents:', {
                files: files.map(f => f.name),
                template: 'management_skills',
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
            setDocumentContent(data.document ?? data.content ?? '');
            toast({
                title: "生成成功",
                description: "管理技能培训文档已生成",
            });
            // Scroll to the generated content
            setTimeout(() => {
                window.scrollTo({
                    top: document.documentElement.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
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
            // 将文件内容转换为base64字符串
            const content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result;
                    // 移除base64前缀（例如："data:application/pdf;base64,"）
                    const base64Content = base64String.split(',')[1] || base64String;
                    resolve(base64Content);
                };
                reader.readAsDataURL(fileBlob);
            });
            // 使用现有的download_document接口
            const response = await fetch('http://localhost:8001/api/storage/download_document', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    format: fileType,
                    filename: '管理技能培训手册',
                    isBase64: true
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || '保存到后端失败');
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `管理技能培训手册.${fileType}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            toast({
                title: "下载成功",
                description: `文档已保存为${fileType.toUpperCase()}格式`,
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
    const handleDownloadPdf = async () => {
        try {
            setIsDownloading(true);
            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4'
            });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(20);
            doc.text('管理技能培训手册', 40, 40);
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
            await saveToBackend(pdfBlob, 'pdf');
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
    const handleDownloadWord = async () => {
        try {
            setIsDownloading(true);
            const doc = new Document({
                sections: [{
                        properties: {},
                        children: [
                            new Paragraph({
                                text: "管理技能培训手册",
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
            await saveToBackend(blob, 'docx');
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
    return (_jsxs("div", { className: "min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100", children: [_jsxs("div", { className: "w-screen bg-white shadow-lg", children: [_jsxs("div", { className: "bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "\u9879\u76EE\u7BA1\u7406\u57F9\u8BAD\u6587\u6863" }), _jsx("p", { className: "text-amber-100", children: "\u638C\u63E1\u9879\u76EE\u7BA1\u7406\u6280\u80FD\uFF0C\u63D0\u5347\u56E2\u961F\u6548\u7387" })] }), _jsxs("div", { className: "p-6", children: [_jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u6982\u8FF0" }), _jsx("p", { className: "text-amber-700 mb-4", children: "\u672C\u57F9\u8BAD\u65E8\u5728\u5E2E\u52A9\u5B66\u5458\u638C\u63E1\u9879\u76EE\u7BA1\u7406\u7684\u6838\u5FC3\u6982\u5FF5\u3001\u65B9\u6CD5\u8BBA\u548C\u6700\u4F73\u5B9E\u8DF5\u3002\u901A\u8FC7\u7406\u8BBA\u5B66\u4E60\u548C\u5B9E\u8DF5\u7EC3\u4E60\uFF0C\u5B66\u5458\u5C06\u80FD\u591F\u6709\u6548\u5730\u89C4\u5212\u3001\u6267\u884C\u548C\u63A7\u5236\u9879\u76EE\uFF0C\u786E\u4FDD\u9879\u76EE\u6309\u65F6\u3001\u6309\u9884\u7B97\u5B8C\u6210\uFF0C\u5E76\u8FBE\u5230\u9884\u671F\u7684\u8D28\u91CF\u6807\u51C6\u3002" })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u6A21\u5757" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: sections.map((section) => (_jsx(Card, { className: `bg-amber-50 border-amber-200 cursor-pointer transition-all ${completedSections.includes(section.id) ? 'ring-2 ring-green-500' : ''}`, onClick: () => toggleSectionCompletion(section.id), children: _jsxs(CardContent, { className: "pt-6 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsxs("div", { className: "bg-amber-100 rounded-full p-3 mr-4", children: [section.id === 'intro' && _jsx(FileText, { className: "w-6 h-6 text-amber-600" }), section.id === 'planning' && _jsx(ClipboardList, { className: "w-6 h-6 text-amber-600" }), section.id === 'execution' && _jsx(Target, { className: "w-6 h-6 text-amber-600" }), section.id === 'monitoring' && _jsx(BarChart, { className: "w-6 h-6 text-amber-600" }), section.id === 'closing' && _jsx(CheckCircle2, { className: "w-6 h-6 text-amber-600" })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-800", children: section.title }), _jsx("p", { className: "text-amber-600 text-sm", children: completedSections.includes(section.id) ? '已完成' : '点击标记为已完成' })] })] }), completedSections.includes(section.id) && (_jsx(CheckCircle2, { className: "w-6 h-6 text-green-500" }))] }) }, section.id))) })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u5185\u5BB9\u8BE6\u60C5" }), _jsxs(Tabs, { defaultValue: "intro", className: "w-full", children: [_jsx(TabsList, { className: "grid w-full grid-cols-5 bg-amber-100", children: sections.map((section) => (_jsx(TabsTrigger, { value: section.id, className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: section.title }, section.id))) }), _jsx(TabsContent, { value: "intro", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-amber-800", children: "\u9879\u76EE\u7BA1\u7406\u7B80\u4ECB" }) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [_jsx("li", { children: "\u9879\u76EE\u7BA1\u7406\u7684\u5B9A\u4E49\u548C\u91CD\u8981\u6027" }), _jsx("li", { children: "\u9879\u76EE\u751F\u547D\u5468\u671F" }), _jsx("li", { children: "\u9879\u76EE\u7BA1\u7406\u77E5\u8BC6\u9886\u57DF" }), _jsx("li", { children: "\u9879\u76EE\u7ECF\u7406\u7684\u89D2\u8272\u548C\u804C\u8D23" })] }) })] }) }), _jsx(TabsContent, { value: "planning", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-amber-800", children: "\u9879\u76EE\u89C4\u5212" }) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [_jsx("li", { children: "\u5236\u5B9A\u9879\u76EE\u7AE0\u7A0B" }), _jsx("li", { children: "\u8BC6\u522B\u5E72\u7CFB\u4EBA" }), _jsx("li", { children: "\u521B\u5EFA\u5DE5\u4F5C\u5206\u89E3\u7ED3\u6784\uFF08WBS\uFF09" }), _jsx("li", { children: "\u8FDB\u5EA6\u89C4\u5212\u548C\u8D44\u6E90\u5206\u914D" }), _jsx("li", { children: "\u98CE\u9669\u8BC6\u522B\u548C\u7BA1\u7406" })] }) })] }) }), _jsx(TabsContent, { value: "execution", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-amber-800", children: "\u9879\u76EE\u6267\u884C" }) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [_jsx("li", { children: "\u56E2\u961F\u7BA1\u7406\u548C\u9886\u5BFC\u529B" }), _jsx("li", { children: "\u6C9F\u901A\u7BA1\u7406" }), _jsx("li", { children: "\u8D28\u91CF\u4FDD\u8BC1" }), _jsx("li", { children: "\u91C7\u8D2D\u7BA1\u7406" })] }) })] }) }), _jsx(TabsContent, { value: "monitoring", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-amber-800", children: "\u76D1\u63A7\u4E0E\u63A7\u5236" }) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [_jsx("li", { children: "\u8FDB\u5EA6\u548C\u6210\u672C\u63A7\u5236" }), _jsx("li", { children: "\u6323\u503C\u7BA1\u7406" }), _jsx("li", { children: "\u53D8\u66F4\u63A7\u5236" }), _jsx("li", { children: "\u98CE\u9669\u76D1\u63A7" })] }) })] }) }), _jsx(TabsContent, { value: "closing", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-amber-800", children: "\u9879\u76EE\u6536\u5C3E" }) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [_jsx("li", { children: "\u9A8C\u6536\u548C\u79FB\u4EA4" }), _jsx("li", { children: "\u7ECF\u9A8C\u6559\u8BAD\u603B\u7ED3" }), _jsx("li", { children: "\u9879\u76EE\u6587\u6863\u5F52\u6863" }), _jsx("li", { children: "\u56E2\u961F\u89E3\u6563\u548C\u8D44\u6E90\u91CA\u653E" })] }) })] }) })] })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u5B9E\u8DF5\u7EC3\u4E60" }), _jsx(Card, { className: "bg-amber-50 border-amber-200", children: _jsx(CardContent, { className: "pt-6", children: _jsxs(Accordion, { type: "single", collapsible: true, className: "w-full", children: [_jsxs(AccordionItem, { value: "exercise1", children: [_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: "\u9879\u76EE\u7AE0\u7A0B\u7F16\u5199" }), _jsxs(AccordionContent, { className: "text-amber-600", children: [_jsx("p", { children: "\u7EC3\u4E60\u76EE\u6807\uFF1A\u7F16\u5199\u4E00\u4E2A\u5B8C\u6574\u7684\u9879\u76EE\u7AE0\u7A0B" }), _jsxs("ul", { className: "list-disc list-inside mt-2", children: [_jsx("li", { children: "\u5B9A\u4E49\u9879\u76EE\u76EE\u6807\u548C\u8303\u56F4" }), _jsx("li", { children: "\u8BC6\u522B\u5173\u952E\u5E72\u7CFB\u4EBA" }), _jsx("li", { children: "\u5217\u51FA\u4E3B\u8981\u91CC\u7A0B\u7891" }), _jsx("li", { children: "\u4F30\u7B97\u9884\u7B97\u548C\u65F6\u95F4\u8868" })] })] })] }), _jsxs(AccordionItem, { value: "exercise2", children: [_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: "\u98CE\u9669\u7BA1\u7406\u8BA1\u5212" }), _jsxs(AccordionContent, { className: "text-amber-600", children: [_jsx("p", { children: "\u7EC3\u4E60\u76EE\u6807\uFF1A\u4E3A\u4E00\u4E2A\u865A\u62DF\u9879\u76EE\u521B\u5EFA\u98CE\u9669\u7BA1\u7406\u8BA1\u5212" }), _jsxs("ul", { className: "list-disc list-inside mt-2", children: [_jsx("li", { children: "\u8BC6\u522B\u6F5C\u5728\u98CE\u9669" }), _jsx("li", { children: "\u8BC4\u4F30\u98CE\u9669\u6982\u7387\u548C\u5F71\u54CD" }), _jsx("li", { children: "\u5236\u5B9A\u98CE\u9669\u5E94\u5BF9\u7B56\u7565" }), _jsx("li", { children: "\u521B\u5EFA\u98CE\u9669\u8DDF\u8E2A\u77E9\u9635" })] })] })] }), _jsxs(AccordionItem, { value: "exercise3", children: [_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: "\u9879\u76EE\u8FDB\u5EA6\u89C4\u5212" }), _jsxs(AccordionContent, { className: "text-amber-600", children: [_jsx("p", { children: "\u7EC3\u4E60\u76EE\u6807\uFF1A\u4F7F\u7528\u7518\u7279\u56FE\u521B\u5EFA\u9879\u76EE\u8FDB\u5EA6\u8BA1\u5212" }), _jsxs("ul", { className: "list-disc list-inside mt-2", children: [_jsx("li", { children: "\u5B9A\u4E49\u9879\u76EE\u4EFB\u52A1\u548C\u5DE5\u4F5C\u5305" }), _jsx("li", { children: "\u4F30\u7B97\u4EFB\u52A1\u6301\u7EED\u65F6\u95F4" }), _jsx("li", { children: "\u786E\u5B9A\u4EFB\u52A1\u4F9D\u8D56\u5173\u7CFB" }), _jsx("li", { children: "\u5206\u914D\u8D44\u6E90\u5E76\u5E73\u8861\u5DE5\u4F5C\u8D1F\u8F7D" })] })] })] })] }) }) })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u57F9\u8BAD\u8FDB\u5EA6" }), _jsx(Card, { className: "bg-amber-50 border-amber-200", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "text-amber-700 font-semibold", children: "\u603B\u4F53\u5B8C\u6210\u5EA6" }), _jsxs("span", { className: "text-amber-700 font-semibold", children: [calculateProgress().toFixed(0), "%"] })] }), _jsx(Progress, { value: calculateProgress(), className: "w-full bg-amber-200" })] }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-800 mb-2", children: "\u5DF2\u5B8C\u6210\u6A21\u5757" }), _jsx("ul", { className: "space-y-1 text-amber-700", children: completedSections.map(sectionId => {
                                                                    const section = sections.find(s => s.id === sectionId);
                                                                    return section ? (_jsxs("li", { className: "flex items-center", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-green-500 mr-2" }), section.title] }, sectionId)) : null;
                                                                }) })] })] }) }) })] }), _jsxs("div", { className: "flex justify-end space-x-2", children: [_jsx(Button, { variant: "outline", onClick: () => setShowUpload(true), disabled: isGenerating, className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600", children: isGenerating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileUp, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u6863"] })) }), documentContent && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", onClick: handleDownloadPdf, disabled: isDownloading, className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600", children: isDownloading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u4E0B\u8F7D\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7DPDF"] })) }), _jsx(Button, { variant: "outline", onClick: handleDownloadWord, disabled: isDownloading, className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600", children: isDownloading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u4E0B\u8F7D\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7DWord"] })) })] }))] })] })] }), showUpload && (_jsx(DocumentUpload, { endpoint: "/api/documents/upload", isUploading: isUploading, setIsUploading: setIsUploading, onConfirm: handleUploadConfirm, onCancel: handleUploadCancel, isLoading: isGenerating })), documentContent && (_jsx("div", { className: "mt-6 p-6 bg-white rounded-lg shadow", children: _jsx("div", { className: "prose max-w-none", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: documentContent || '' }) }) }))] }));
};
export default ManagementSkillsTraining;
