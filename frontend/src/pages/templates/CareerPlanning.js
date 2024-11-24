import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { BookOpen, Briefcase, GraduationCap, LineChart, Target, Users, FileDown, FileUp, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import DocumentUpload from '@/components/DocumentUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
const CareerPlanning = () => {
    const [selectedPath, setSelectedPath] = useState(null);
    const [documentContent, setDocumentContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [isEditable, setIsEditable] = useState(false);
    const [editableContent, setEditableContent] = useState({
        title: '职业发展规划',
        subtitle: '探索您的职业道路，实现自我提升',
        careerPaths: [
            { id: 'technical', name: '技术专家' },
            { id: 'management', name: '管理路线' },
            { id: 'project', name: '项目管理' }
        ],
        skillsTitle: '核心技能要求',
        skillsDescription: '发展所需的关键能力',
        trainingTitle: '培训与发展计划',
        trainingDescription: '为您量身定制的学习路径',
        internalTrainingTitle: '内部培训课程',
        externalCoursesTitle: '外部进修机会',
        mentorshipTitle: '导师计划',
        technicalSkills: ['深入的技术专业知识', '问题分析与解决能力', '技术创新思维', '技术文档编写'],
        managementSkills: ['团队领导与激励', '战略规划与执行', '沟通与协调能力', '决策制定能力'],
        projectSkills: ['项目规划与管理', '风险评估与控制', '团队协作与沟通', '资源优化配置'],
        internalTraining: ['新技术研讨会', '领导力培训营', '项目管理实践工作坊'],
        externalCourses: ['行业认证课程', '高级管理培训项目', '国际会议与研讨会'],
        mentorship: '与经验丰富的高级员工配对，获得一对一指导和职业建议。',
        nextStepsTitle: '您的下一步',
        discussionTitle: '与您的经理讨论',
        discussionDescription: '安排一次职业发展会谈，讨论您的目标和期望'
    });
    const { toast } = useToast();
    const handleContentEdit = (section, index, newValue) => {
        setEditableContent(prev => {
            const newContent = { ...prev };
            // Handle array of objects (careerPaths)
            if (section === 'careerPaths' && index !== null) {
                const careerPaths = [...newContent.careerPaths];
                careerPaths[index] = { ...careerPaths[index], name: newValue };
                return { ...newContent, careerPaths };
            }
            // Handle arrays of strings
            const stringArrayKeys = [
                'technicalSkills',
                'managementSkills',
                'projectSkills',
                'internalTraining',
                'externalCourses'
            ];
            if (stringArrayKeys.includes(section) && index !== null) {
                const array = [...newContent[section]];
                array[index] = newValue;
                return { ...newContent, [section]: array };
            }
            // Handle string values
            if (index === null) {
                return { ...newContent, [section]: newValue };
            }
            return newContent;
        });
    };
    const toggleEditable = () => {
        setIsEditable(!isEditable);
        if (!isEditable) {
            toast({
                title: "编辑模式已开启",
                description: "您现在可以编辑所有内容",
                variant: "default",
            });
        }
    };
    const careerPaths = [
        { id: 'technical', name: '技术专家', icon: _jsx(BookOpen, { className: "w-6 h-6" }) },
        { id: 'management', name: '管理路线', icon: _jsx(Users, { className: "w-6 h-6" }) },
        { id: 'project', name: '项目管理', icon: _jsx(Target, { className: "w-6 h-6" }) },
    ];
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
            formData.append('template', 'career_planning');
            formData.append('description', JSON.stringify({
                title: '职业发展规划手册',
                subtitle: '探索您的职业道路，实现自我提升',
                overview: '本手册旨在帮助您规划职业发展路径，设定目标并实现职业理想。',
                careerPaths: careerPaths.map(path => ({ id: path.id, name: path.name })),
                selectedPath
            }));
            console.log('Sending request to generate template...');
            console.log('FormData contents:', {
                files: files.map(f => f.name),
                template: 'career_planning',
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
                description: "职业发展规划文档已生成",
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
                    filename: '职业发展规划手册',
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
            a.download = `职业发展规划手册.${fileType}`;
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
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6", children: _jsxs("div", { className: "max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden", children: [_jsxs("div", { className: "bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [isEditable ? (_jsx("input", { type: "text", value: editableContent.title, onChange: (e) => handleContentEdit('title', null, e.target.value), className: "text-3xl font-semibold text-amber-800 bg-transparent border-b border-white focus:outline-none w-full" })) : (_jsx("h1", { className: "text-3xl font-semibold text-amber-800", children: editableContent.title })), _jsx("div", { className: "flex gap-4", children: _jsx(Button, { onClick: toggleEditable, variant: isEditable ? "destructive" : "default", className: "bg-amber-600 hover:bg-amber-700", children: isEditable ? "完成编辑" : "开启编辑" }) })] }), isEditable ? (_jsx("input", { type: "text", value: editableContent.subtitle, onChange: (e) => handleContentEdit('subtitle', null, e.target.value), className: "text-amber-100 bg-transparent border-b border-white focus:outline-none w-full" })) : (_jsx("p", { className: "text-amber-100", children: editableContent.subtitle }))] }), _jsxs("div", { className: "p-6", children: [_jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u60A8\u7684\u804C\u4E1A\u53D1\u5C55\u4E4B\u65C5" }), isEditable ? (_jsx("input", { type: "text", value: editableContent.skillsDescription, onChange: (e) => handleContentEdit('skillsDescription', null, e.target.value), className: "text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-4" })) : (_jsx("p", { className: "text-amber-700 mb-4", children: editableContent.skillsDescription })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx(Button, { onClick: () => setShowUpload(true), disabled: isGenerating, className: "bg-amber-500 hover:bg-amber-600", children: isGenerating ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "\u751F\u6210\u4E2D..."] })) : (_jsxs(_Fragment, { children: [_jsx(FileUp, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u6863"] })) }), documentContent && (_jsxs("div", { className: "space-x-2", children: [_jsxs(Button, { onClick: () => saveToBackend(new Blob([documentContent], { type: 'text/plain' }), 'pdf'), disabled: isUploading, variant: "outline", className: "border-amber-500 text-amber-500 hover:bg-amber-50", children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D PDF"] }), _jsxs(Button, { onClick: () => saveToBackend(new Blob([documentContent], { type: 'text/plain' }), 'docx'), disabled: isUploading, variant: "outline", className: "border-amber-500 text-amber-500 hover:bg-amber-50", children: [_jsx(FileDown, { className: "mr-2 h-4 w-4" }), "\u4E0B\u8F7D Word"] })] }))] }), showUpload && (_jsx(DocumentUpload, { endpoint: "/api/documents/upload", isUploading: isGenerating, setIsUploading: setIsGenerating, onConfirm: handleUploadConfirm, onCancel: handleUploadCancel, isLoading: isGenerating })), documentContent && (_jsx(Card, { className: "mt-6", children: _jsx(CardContent, { className: "prose max-w-none pt-6", children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: documentContent }) }) }))] })] }), _jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u9009\u62E9\u60A8\u7684\u804C\u4E1A\u53D1\u5C55\u65B9\u5411" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: careerPaths.map((path) => (_jsx(Card, { className: `bg-amber-50 border-amber-200 cursor-pointer transition-all ${selectedPath === path.id ? 'ring-2 ring-amber-500' : ''}`, onClick: () => setSelectedPath(path.id), children: _jsxs(CardContent, { className: "pt-6 flex flex-col items-center text-center", children: [_jsx("div", { className: "w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4", children: path.icon }), isEditable ? (_jsx("input", { type: "text", value: path.name, onChange: (e) => {
                                                        const newPath = careerPaths.map(p => p.id === path.id ? { ...p, name: e.target.value } : p);
                                                        setEditableContent(prev => ({ ...prev, careerPaths: newPath }));
                                                    }, className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : (_jsx("h3", { className: "font-semibold text-amber-800", children: path.name }))] }) }, path.id))) })] }), selectedPath && (_jsxs("section", { className: "mb-8", children: [_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: "\u53D1\u5C55\u8DEF\u5F84\u8BE6\u60C5" }), _jsxs(Tabs, { defaultValue: "overview", className: "w-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-3 bg-amber-100", children: [_jsx(TabsTrigger, { value: "overview", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u6982\u89C8" }), _jsx(TabsTrigger, { value: "skills", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u6240\u9700\u6280\u80FD" }), _jsx(TabsTrigger, { value: "training", className: "data-[state=active]:bg-amber-500 data-[state=active]:text-white", children: "\u57F9\u8BAD\u8BA1\u5212" })] }), _jsx(TabsContent, { value: "overview", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: editableContent.skillsTitle, onChange: (e) => handleContentEdit('skillsTitle', null, e.target.value), className: "text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: editableContent.skillsDescription, onChange: (e) => handleContentEdit('skillsDescription', null, e.target.value), className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx(CardTitle, { className: "text-amber-800", children: editableContent.skillsTitle }), _jsx(CardDescription, { className: "text-amber-600", children: editableContent.skillsDescription })] })) }), _jsxs(CardContent, { children: [_jsxs("p", { className: "text-amber-700 mb-4", children: [selectedPath === 'technical' && '技术专家路线专注于深化专业技能，成为行业内的技术权威。', selectedPath === 'management' && '管理路线致力于培养您的领导能力，带领团队实现卓越成果。', selectedPath === 'project' && '项目管理路线旨在提升您的项目规划和执行能力，确保项目成功交付。'] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-amber-700", children: "\u521D\u7EA7" }), _jsx("span", { className: "text-amber-700", children: "\u9AD8\u7EA7" })] }), _jsx(Progress, { value: 33, className: "w-full bg-amber-200", indicatorClassName: "bg-amber-500" })] })] })] }) }), _jsx(TabsContent, { value: "skills", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: editableContent.skillsTitle, onChange: (e) => handleContentEdit('skillsTitle', null, e.target.value), className: "text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: editableContent.skillsDescription, onChange: (e) => handleContentEdit('skillsDescription', null, e.target.value), className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx(CardTitle, { className: "text-amber-800", children: editableContent.skillsTitle }), _jsx(CardDescription, { className: "text-amber-600", children: editableContent.skillsDescription })] })) }), _jsx(CardContent, { children: _jsxs("ul", { className: "space-y-2 text-amber-700", children: [selectedPath === 'technical' && (_jsx(_Fragment, { children: editableContent.technicalSkills.map((skill, index) => (_jsx("li", { children: isEditable ? (_jsx("input", { type: "text", value: skill, onChange: (e) => handleContentEdit('technicalSkills', index, e.target.value), className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : skill }, index))) })), selectedPath === 'management' && (_jsx(_Fragment, { children: editableContent.managementSkills.map((skill, index) => (_jsx("li", { children: isEditable ? (_jsx("input", { type: "text", value: skill, onChange: (e) => handleContentEdit('managementSkills', index, e.target.value), className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : skill }, index))) })), selectedPath === 'project' && (_jsx(_Fragment, { children: editableContent.projectSkills.map((skill, index) => (_jsx("li", { children: isEditable ? (_jsx("input", { type: "text", value: skill, onChange: (e) => handleContentEdit('projectSkills', index, e.target.value), className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : skill }, index))) }))] }) })] }) }), _jsx(TabsContent, { value: "training", children: _jsxs(Card, { className: "bg-amber-50 border-amber-200", children: [_jsx(CardHeader, { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: editableContent.trainingTitle, onChange: (e) => handleContentEdit('trainingTitle', null, e.target.value), className: "text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: editableContent.trainingDescription, onChange: (e) => handleContentEdit('trainingDescription', null, e.target.value), className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx(CardTitle, { className: "text-amber-800", children: editableContent.trainingTitle }), _jsx(CardDescription, { className: "text-amber-600", children: editableContent.trainingDescription })] })) }), _jsx(CardContent, { children: _jsxs(Accordion, { type: "single", collapsible: true, className: "w-full", children: [_jsxs(AccordionItem, { value: "internal-training", children: [isEditable ? (_jsx("input", { type: "text", value: editableContent.internalTrainingTitle, onChange: (e) => handleContentEdit('internalTrainingTitle', null, e.target.value), className: "w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none" })) : (_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: editableContent.internalTrainingTitle })), _jsx(AccordionContent, { className: "text-amber-600", children: _jsx("ul", { className: "list-disc list-inside space-y-1", children: editableContent.internalTraining.map((item, index) => (_jsx("li", { children: isEditable ? (_jsx("input", { type: "text", value: item, onChange: (e) => handleContentEdit('internalTraining', index, e.target.value), className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : item }, index))) }) })] }), _jsxs(AccordionItem, { value: "external-courses", children: [isEditable ? (_jsx("input", { type: "text", value: editableContent.externalCoursesTitle, onChange: (e) => handleContentEdit('externalCoursesTitle', null, e.target.value), className: "w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none" })) : (_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: editableContent.externalCoursesTitle })), _jsx(AccordionContent, { className: "text-amber-600", children: _jsx("ul", { className: "list-disc list-inside space-y-1", children: editableContent.externalCourses.map((item, index) => (_jsx("li", { children: isEditable ? (_jsx("input", { type: "text", value: item, onChange: (e) => handleContentEdit('externalCourses', index, e.target.value), className: "w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500" })) : item }, index))) }) })] }), _jsxs(AccordionItem, { value: "mentorship", children: [isEditable ? (_jsx("input", { type: "text", value: editableContent.mentorshipTitle, onChange: (e) => handleContentEdit('mentorshipTitle', null, e.target.value), className: "w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none" })) : (_jsx(AccordionTrigger, { className: "text-amber-700 hover:text-amber-800", children: editableContent.mentorshipTitle })), _jsx(AccordionContent, { className: "text-amber-600", children: isEditable ? (_jsx("textarea", { value: editableContent.mentorship, onChange: (e) => handleContentEdit('mentorship', null, e.target.value), className: "w-full p-2 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500", rows: 3 })) : (_jsx("p", { children: editableContent.mentorship })) })] })] }) })] }) })] })] })), _jsxs("section", { className: "mb-8", children: [isEditable ? (_jsx("input", { type: "text", value: editableContent.nextStepsTitle, onChange: (e) => handleContentEdit('nextStepsTitle', null, e.target.value), className: "text-2xl font-semibold text-amber-800 mb-4 bg-transparent border-b border-amber-200 focus:outline-none w-full" })) : (_jsx("h2", { className: "text-2xl font-semibold text-amber-800 mb-4", children: editableContent.nextStepsTitle })), _jsx(Card, { className: "bg-amber-50 border-amber-200", children: _jsx(CardContent, { className: "pt-6", children: _jsxs("div", { className: "flex flex-col space-y-4", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Briefcase, { className: "w-8 h-8 text-amber-500 mr-4" }), _jsx("div", { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: editableContent.discussionTitle, onChange: (e) => handleContentEdit('discussionTitle', null, e.target.value), className: "text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: editableContent.discussionDescription, onChange: (e) => handleContentEdit('discussionDescription', null, e.target.value), className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-700", children: editableContent.discussionTitle }), _jsx("p", { className: "text-amber-600", children: editableContent.discussionDescription })] })) })] }), _jsx("div", { className: "w-0.5 h-6 bg-amber-300 ml-4" }), _jsxs("div", { className: "flex items-center", children: [_jsx(GraduationCap, { className: "w-8 h-8 text-amber-500 mr-4" }), _jsx("div", { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: "\u5236\u5B9A\u5B66\u4E60\u8BA1\u5212", onChange: (e) => { }, className: "text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: "\u6839\u636E\u60A8\u7684\u804C\u4E1A\u76EE\u6807\uFF0C\u9009\u62E9\u76F8\u5E94\u7684\u57F9\u8BAD\u8BFE\u7A0B\u548C\u53D1\u5C55\u673A\u4F1A", onChange: (e) => { }, className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-700", children: "\u5236\u5B9A\u5B66\u4E60\u8BA1\u5212" }), _jsx("p", { className: "text-amber-600", children: "\u6839\u636E\u60A8\u7684\u804C\u4E1A\u76EE\u6807\uFF0C\u9009\u62E9\u76F8\u5E94\u7684\u57F9\u8BAD\u8BFE\u7A0B\u548C\u53D1\u5C55\u673A\u4F1A" })] })) })] }), _jsx("div", { className: "w-0.5 h-6 bg-amber-300 ml-4" }), _jsxs("div", { className: "flex items-center", children: [_jsx(LineChart, { className: "w-8 h-8 text-amber-500 mr-4" }), _jsx("div", { children: isEditable ? (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: "\u5B9A\u671F\u56DE\u987E\u4E0E\u8C03\u6574", onChange: (e) => { }, className: "text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2" }), _jsx("input", { type: "text", value: "\u6BCF\u5B63\u5EA6\u8BC4\u4F30\u60A8\u7684\u8FDB\u5C55\uFF0C\u5E76\u6839\u636E\u9700\u8981\u8C03\u6574\u60A8\u7684\u53D1\u5C55\u8BA1\u5212", onChange: (e) => { }, className: "text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full" })] })) : (_jsxs(_Fragment, { children: [_jsx("h3", { className: "text-lg font-semibold text-amber-700", children: "\u5B9A\u671F\u56DE\u987E\u4E0E\u8C03\u6574" }), _jsx("p", { className: "text-amber-600", children: "\u6BCF\u5B63\u5EA6\u8BC4\u4F30\u60A8\u7684\u8FDB\u5C55\uFF0C\u5E76\u6839\u636E\u9700\u8981\u8C03\u6574\u60A8\u7684\u53D1\u5C55\u8BA1\u5212" })] })) })] })] }) }) })] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { className: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600", children: "\u5F00\u59CB\u6211\u7684\u804C\u4E1A\u89C4\u5212" }) })] })] }) }));
};
export default CareerPlanning;
