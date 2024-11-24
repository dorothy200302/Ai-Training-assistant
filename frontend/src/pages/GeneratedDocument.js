import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, Share2, Edit2, FileText, Loader2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Textarea } from "@/components/ui/textarea";
import { toast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import ReactMarkdown from 'react-markdown';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import jsPDF from 'jspdf';
const DocumentContentPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { outline, backgroundInfo, uploadedFiles } = location.state || {};
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentSection, setCurrentSection] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [generationStep, setGenerationStep] = useState('正在分析文档...');
    const [editMode, setEditMode] = useState(false);
    const [editedContent, setEditedContent] = useState(null);
    useEffect(() => {
        const initializeContent = async () => {
            try {
                if (location.state?.content) {
                    setContent(location.state.content);
                    setLoading(false);
                    return;
                }
                setLoading(true);
                const token = localStorage.getItem('token');
                setGenerationStep('正在处理大纲和背景信息...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (!outline || !backgroundInfo) {
                    throw new Error('Missing required data');
                }
                const formData = new FormData();
                formData.append('outline', JSON.stringify(outline));
                formData.append('description', JSON.stringify(backgroundInfo));
                setGenerationStep('正在上传文件...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (uploadedFiles && uploadedFiles.length > 0) {
                    uploadedFiles.forEach((file) => {
                        formData.append('files', file);
                    });
                }
                setGenerationStep('正在生成文档内容...');
                const response = await fetch('http://localhost:8001/api/storage/generate_full_doc_with_doc/', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`Failed to generate content: ${errorText}`);
                }
                setGenerationStep('正在整理文档格式...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                const data = await response.json();
                if (data.document) {
                    setContent(data.document);
                }
                else {
                    throw new Error('文档内容为空');
                }
                toast({
                    title: "生成成功",
                    description: "文档已生成完成！",
                });
            }
            catch (error) {
                console.error('Failed to generate content:', error);
                toast({
                    title: "生成失败",
                    description: error instanceof Error ? error.message : "获取文档内容失败，请重试",
                    variant: "destructive",
                });
            }
            finally {
                setLoading(false);
            }
        };
        initializeContent();
    }, [location.state, outline, backgroundInfo, uploadedFiles]);
    useEffect(() => {
        if (content && !editedContent) {
            setEditedContent(JSON.parse(JSON.stringify(content)));
        }
    }, [content]);
    const handleDownload = async (format) => {
        try {
            if (!content)
                return;
            let fileBlob;
            let fileName = `${content.title || 'document'}.${format}`;
            // 生成文件
            if (format === 'docx') {
                const doc = new Document({
                    sections: [{
                            properties: {},
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: content.title, bold: true, size: 32 })],
                                }),
                                new Paragraph({
                                    children: [new TextRun({ text: content.overview, size: 24 })],
                                }),
                                ...content.sections.flatMap(section => [
                                    new Paragraph({
                                        children: [new TextRun({ text: section.title, bold: true, size: 28 })],
                                    }),
                                    new Paragraph({
                                        children: [new TextRun({ text: section.content, size: 24 })],
                                    }),
                                    ...(section.subsections?.flatMap(subsection => [
                                        new Paragraph({
                                            children: [new TextRun({ text: subsection.title, bold: true, size: 26 })],
                                        }),
                                        new Paragraph({
                                            children: [new TextRun({ text: subsection.content, size: 24 })],
                                        }),
                                    ]) || []),
                                ]),
                            ],
                        }],
                });
                fileBlob = await Packer.toBlob(doc);
            }
            else {
                const pdf = new jsPDF();
                let y = 20;
                pdf.setFontSize(16);
                pdf.text(content.title, 20, y);
                y += 10;
                pdf.setFontSize(12);
                const splitOverview = pdf.splitTextToSize(content.overview, 170);
                pdf.text(splitOverview, 20, y);
                y += splitOverview.length * 7;
                content.sections.forEach(section => {
                    if (y > 270) {
                        pdf.addPage();
                        y = 20;
                    }
                    pdf.setFontSize(14);
                    pdf.text(section.title, 20, y);
                    y += 10;
                    pdf.setFontSize(12);
                    const splitContent = pdf.splitTextToSize(section.content, 170);
                    pdf.text(splitContent, 20, y);
                    y += splitContent.length * 7;
                    section.subsections?.forEach(subsection => {
                        if (y > 270) {
                            pdf.addPage();
                            y = 20;
                        }
                        pdf.setFontSize(13);
                        pdf.text(subsection.title, 25, y);
                        y += 10;
                        pdf.setFontSize(12);
                        const splitSubContent = pdf.splitTextToSize(subsection.content, 165);
                        pdf.text(splitSubContent, 25, y);
                        y += splitSubContent.length * 7;
                    });
                });
                fileBlob = pdf.output('blob');
            }
            // 下载文件
            const url = window.URL.createObjectURL(fileBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.click();
            window.URL.revokeObjectURL(url);
            // 转换为 base64
            const base64Content = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64String = reader.result;
                    const base64Content = base64String.split(',')[1] || base64String;
                    resolve(base64Content);
                };
                reader.readAsDataURL(fileBlob);
            });
            // 保存到后端
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8001/api/storage/download_document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: base64Content,
                    format: format,
                    filename: fileName,
                    isBase64: true,
                    metadata: {
                        title: content.title,
                        sections: content.sections.map(section => ({
                            title: section.title,
                            content: section.content,
                            subsections: section.subsections
                        }))
                    }
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(errorData?.detail || 'Failed to save document');
            }
            const result = await response.json();
            toast({
                title: "保存成功",
                description: `文档已成功下载并保存为${format.toUpperCase()}格式`,
            });
        }
        catch (error) {
            console.error('Download error:', error);
            toast({
                title: "保存失败",
                description: error instanceof Error ? error.message : "文档生成或保存失败，请重试",
                variant: "destructive",
            });
            throw error;
        }
    };
    const navigateToTemplates = () => {
        navigate('/templates', { state: { content } });
    };
    const handleContentChange = (type, value, sectionIndex, subsectionIndex) => {
        if (!editedContent)
            return;
        const newContent = { ...editedContent };
        if (type === 'overview') {
            newContent.overview = value;
        }
        else if (type === 'section' && sectionIndex !== undefined) {
            newContent.sections[sectionIndex].content = value;
        }
        else if (type === 'subsection' && sectionIndex !== undefined && subsectionIndex !== undefined) {
            newContent.sections[sectionIndex].subsections[subsectionIndex].content = value;
        }
        setEditedContent(newContent);
    };
    const saveChanges = () => {
        setContent(editedContent);
        setEditMode(false);
        toast({
            title: "保存成功",
            description: "文档内容已更新",
        });
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex justify-center items-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" }), _jsx("p", { className: "text-amber-800", children: generationStep })] }) }));
    }
    if (!content) {
        return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex justify-center items-center", children: _jsxs("div", { className: "text-center", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin mx-auto mb-4 text-amber-600" }), _jsx("p", { className: "text-amber-800", children: generationStep })] }) }));
    }
    const progress = content?.sections ? ((currentSection + 1) / content.sections.length) * 100 : 0;
    return (_jsx("div", { className: "min-h-screen w-full bg-gradient-to-br from-amber-50 to-orange-100", children: _jsx("div", { className: "w-full bg-white shadow-lg p-6", children: _jsx("div", { className: "max-w-7xl mx-auto", children: _jsxs(Card, { className: "bg-amber-50 shadow-sm", children: [_jsx(CardHeader, { className: "border-b border-amber-200", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx(CardTitle, { className: "text-2xl font-bold text-amber-900", children: content.title }), _jsxs("div", { className: "flex gap-4", children: [_jsxs(Button, { onClick: () => setEditMode(!editMode), variant: editMode ? "destructive" : "outline", className: "flex items-center", children: [_jsx(Edit2, { className: "mr-2 h-4 w-4" }), editMode ? "取消编辑" : "编辑"] }), editMode && (_jsxs(Button, { onClick: saveChanges, className: "flex items-center", children: [_jsx(FileText, { className: "mr-2 h-4 w-4" }), "\u4FDD\u5B58"] })), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { className: "flex items-center", children: [_jsx(Download, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D"] }) }), _jsxs(DropdownMenuContent, { children: [_jsx(DropdownMenuItem, { onClick: () => handleDownload('docx'), children: "Word\u6587\u6863 (.docx)" }), _jsx(DropdownMenuItem, { onClick: () => handleDownload('pdf'), children: "PDF\u6587\u6863 (.pdf)" })] })] }), _jsxs(Button, { onClick: () => window.print(), variant: "outline", className: "flex items-center", children: [_jsx(Printer, { className: "mr-2 h-4 w-4" }), "\u6253\u5370"] }), _jsxs(Button, { variant: "outline", className: "flex items-center", children: [_jsx(Share2, { className: "mr-2 h-4 w-4" }), "\u5206\u4EAB"] })] })] }) }), _jsx(CardContent, { className: "p-8", children: _jsxs("div", { className: "space-y-8", children: [(editedContent?.overview || content?.overview) && (_jsx("div", { className: "mb-8", children: _jsx("div", { className: "prose max-w-none text-amber-900", children: editMode ? (_jsx(Textarea, { value: editedContent?.overview, onChange: (e) => handleContentChange('overview', e.target.value), className: "min-h-[200px] w-full p-4" })) : (_jsx(ReactMarkdown, { children: content?.overview || '' })) }) })), _jsx("div", { className: "space-y-8", children: (editedContent?.sections || content?.sections || []).map((section, index) => (_jsxs("div", { className: "space-y-4", children: [_jsx("h2", { className: "text-xl font-semibold text-amber-900", children: section.title }), section.content && (_jsx("div", { className: "prose max-w-none text-amber-900", children: editMode ? (_jsx(Textarea, { value: editedContent?.sections?.[index]?.content || section.content, onChange: (e) => handleContentChange('section', e.target.value, index), className: "min-h-[200px] w-full p-4" })) : (_jsx(ReactMarkdown, { children: section.content })) })), section.subsections && section.subsections.length > 0 && (_jsx("div", { className: "space-y-4 ml-4", children: section.subsections.map((subsection, subIndex) => (_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-medium text-amber-800", children: subsection.title }), subsection.content && (_jsx("div", { className: "prose max-w-none text-amber-900", children: editMode ? (_jsx(Textarea, { value: editedContent?.sections?.[index].subsections?.[subIndex].content || subsection.content, onChange: (e) => handleContentChange('subsection', e.target.value, index, subIndex), className: "min-h-[200px] w-full p-4" })) : (_jsx(ReactMarkdown, { children: subsection.content })) }))] }, subIndex))) }))] }, index))) })] }) })] }) }) }) }));
};
export default DocumentContentPage;
