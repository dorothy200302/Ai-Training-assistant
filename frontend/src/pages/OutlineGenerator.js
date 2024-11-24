import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const parseOutlineText = (text) => {
    const lines = text.split('\n').map(line => line.trim());
    const outline = [];
    let currentSection = null;
    let currentContent = [];
    let currentItems = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line && !currentSection)
            continue;
        if (line.startsWith('#')) {
            if (currentSection) {
                if (currentContent.length > 0) {
                    currentSection.content = currentContent.join('\n');
                }
                if (currentItems.length > 0) {
                    currentSection.items = currentItems;
                }
                outline.push(currentSection);
                currentContent = [];
                currentItems = [];
            }
            const level = line.match(/^#+/)?.[0].length || 1;
            currentSection = {
                title: line.replace(/^#+\s*/, ''),
                level: level,
                items: [],
                content: ''
            };
        }
        else if (line.startsWith('-') && currentSection) {
            if (currentContent.length > 0) {
                currentSection.content = currentContent.join('\n');
                currentContent = [];
            }
            currentItems.push(line.replace(/^-\s*/, ''));
        }
        else if (currentSection) {
            if (currentItems.length > 0 && line) {
                currentSection.items = currentItems;
                currentItems = [];
            }
            currentContent.push(line);
        }
    }
    if (currentSection) {
        if (currentContent.length > 0) {
            currentSection.content = currentContent.join('\n');
        }
        if (currentItems.length > 0) {
            currentSection.items = currentItems;
        }
        outline.push(currentSection);
    }
    return outline;
};
const OutlineEditCard = ({ outline }) => {
    const sections = parseOutlineText(outline);
    return (_jsx(Card, { className: "mt-4 bg-white shadow-sm", children: _jsx(CardContent, { className: "p-6", children: _jsx("div", { className: "prose prose-amber max-w-none", children: sections.map((section, index) => (_jsxs("div", { className: "mb-4", children: [_jsx("div", { className: `font-bold text-${['2xl', 'xl', 'lg', 'md', 'sm', 'xs'][section.level - 1] || 'md'}`, children: section.title }), section.content && (_jsx("div", { className: "mt-2 whitespace-pre-wrap", children: section.content })), section.items && section.items.length > 0 && (_jsx("ul", { className: "list-disc pl-6 mt-2", children: section.items.map((item, itemIndex) => (_jsx("li", { children: item }, itemIndex))) }))] }, index))) }) }) }));
};
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Bot, FileText, HelpCircle, LayoutTemplate, Loader2, Plus, Recycle, Send, Eye } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import DocumentUpload from './DocumentUpload';
import { toast } from "@/hooks/use-toast";
const OutlineGenerator = () => {
    const location = useLocation();
    const chatEndRef = useRef(null);
    const [input, setInput] = useState(location.state?.topic || "");
    const [loading, setLoading] = useState(false);
    const [outline, setOutline] = useState([]);
    const [generatingOutline, setGeneratingOutline] = useState(false); // 添加生成中状态
    const [currentStep, setCurrentStep] = useState(0);
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [backgroundInfo, setBackgroundInfo] = useState({
        industry_info: '',
        audience_info: '',
        company_name: '',
        company_culture: '',
        company_industry: '',
        company_competition: '',
        user_role: '',
        project_title: '',
        project_dutys: '',
        project_goals: '',
        project_theme: '',
        project_aim: '',
        content_needs: '',
        format_style: ''
    });
    const [showUpload, setShowUpload] = useState(false);
    const questions = [
        { key: 'company_name', question: '请问您所在的公司名是？' },
        { key: 'company_culture', question: '您公司的企业文化和核心价值观是什么？' },
        { key: 'company_industry', question: '您公司在行业中的定位是？' },
        { key: 'company_competition', question: '公司的主要竞争优势有哪些？' },
        { key: 'user_role', question: '您在公司担任什么角色？' },
        { key: 'industry_info', question: '能简单描述下您所在行业的背景情况吗？' },
        { key: 'project_title', question: '本次培训针对的职位名称是？' },
        { key: 'project_dutys', question: '这个职位的主要职责包括哪些？' },
        { key: 'project_goals', question: '本次培训的主要目标是什么？' },
        { key: 'project_theme', question: '需要覆盖哪些培训主题？' },
        { key: 'project_aim', question: '开展此次培训的主要目的是？' },
        { key: 'content_needs', question: '对培训内容有什么具体要求？' },
        { key: 'format_style', question: '期望的培训格式和风格是怎样的？' },
        { key: 'audience_info', question: '培训对象是哪些人员？' },
        { key: 'file_or_not', question: '您想要上传文件并据此生成（1）还是直成文档（2）？' },
        // { key: 'page_num', question: '您期望的数是多少？' },
        // { key: 'page_style', question: '您期望的文档样的？' },
        // { key: 'page_theme', question: '您期望的文档主题是样的？' },
    ];
    useEffect(() => {
        if (location.state?.topic) {
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
        }
    }, [location.state?.topic]);
    const token = localStorage.getItem('token');
    const generateOutline = async (description, files = []) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('description', description);
            formData.append('ai_model', 'gpt-4o-mini');
            // Add files if available
            files.forEach((file, index) => {
                formData.append('files', file);
            });
            const response = await fetch('/api/storage/generate_outline_and_upload/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to generate outline');
            }
            const data = await response.json();
            if (data.outline) {
                setOutline(parseOutlineText(data.outline));
            }
            else {
                throw new Error('No outline generated');
            }
        }
        catch (error) {
            console.error('Error generating outline:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to generate outline",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
        }
    };
    // 修改按钮点击处理函数
    const handleGenerateClick = () => {
        if (input.trim()) {
            generateOutline(input);
        }
    };
    const handleAIGenerate = () => {
        console.log("Starting AI chat...");
        setShowChat(true);
        setCurrentStep(0);
        setChatHistory([{
                type: 'bot',
                content: questions[0].question
            }]);
    };
    const topics = [
        "新员工入职培训方案",
        "销售技能提升培训",
        "客户服务标准培训",
        "团队管理能力培训",
        "项目管理实践培训",
        "职业素养提升培训",
        "领导力发展培训",
        "沟通技巧提升培训",
        "时间管理效能培训",
        "企业文化建设培训",
        "危机处理能力培训",
        "创新思维培养培训",
        "跨部门协作培训"
    ];
    const [isSubmitting, setIsSubmitting] = useState(false);
    // 添加上传文件状态
    const [files, setFiles] = useState([]);
    const handleAnswer = (answer) => {
        if (!answer.trim())
            return;
        if (currentStep >= questions.length)
            return;
        const currentQuestion = questions[currentStep];
        setBackgroundInfo(prev => ({
            ...prev,
            [currentQuestion.key]: answer.trim()
        }));
        setChatHistory(prev => [...prev, { type: 'user', content: answer }]);
        // 检查是否是最后个问题
        if (currentStep === questions.length - 1) {
            console.log('Last question answered, mode:', selectedMode); // 调试日志
            if (selectedMode === 1) {
                console.log('Showing upload component'); // 调试日志
                setShowUpload(true);
                setShowChat(false);
                // 确保上传组件显示
                setTimeout(() => {
                    if (!showUpload) {
                        setShowUpload(true);
                        setShowChat(false);
                    }
                }, 100);
            }
            else if (selectedMode === 2 || selectedMode === 3) {
                navigate('/templates', {
                    state: {
                        backgroundInfo,
                        mode: selectedMode
                    }
                });
            }
        }
        else {
            setCurrentStep(prev => prev + 1);
            setInput('');
            setTimeout(() => {
                setChatHistory(prev => [...prev,
                    { type: 'bot', content: questions[currentStep + 1].question }
                ]);
                chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
    };
    const [hasCompletedConversation, setHasCompletedConversation] = useState(false);
    // 添加上传确认处理函数
    const handleUploadConfirm = async (uploadSuccess, uploadedFiles) => {
        if (!uploadSuccess || !uploadedFiles || uploadedFiles.length === 0) {
            return;
        }
        // Store the files for later use
        setFiles(uploadedFiles);
        try {
            setLoading(true);
            setGeneratingOutline(true);
            const formData = new FormData();
            const token = localStorage.getItem('token');
            console.log('Using token:', token); // 调试日志
            uploadedFiles.forEach((file) => {
                formData.append('files', file);
            });
            const completeBackgroundInfo = {
                ...backgroundInfo,
            };
            formData.append('description', JSON.stringify(completeBackgroundInfo));
            formData.append('ai_model', 'gpt-4o-mini');
            // 修改请求头的设置方式
            const headers = new Headers();
            headers.append('Authorization', `Bearer ${token}`);
            // 不要设置 Content-Type，因为是 FormData
            const response = await fetch('http://localhost:8001/api/storage/generate_outline_and_upload/', { method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include' // 添加这个选项
            });
            // 打印响应详情以便调试
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText); // 试日志
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            console.log('response', response);
            const data = await response.json();
            console.log('Received outline data:', data);
            if (data.outline) {
                const parsedOutline = parseOutlineText(data.outline);
                console.log('Parsed outline:', parsedOutline);
                setOutline(parsedOutline);
                setHasCompletedConversation(true);
                toast({
                    title: "生成成功",
                    description: "大纲已生成完成",
                    duration: 3000,
                });
            }
            else {
                console.error('No outline data received:', data);
                toast({
                    title: "生成失败",
                    description: "未能生成大纲",
                    variant: "destructive",
                    duration: 3000,
                });
            }
        }
        catch (error) {
            console.error('Error generating outline:', error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "生成大纲时发生错误",
                variant: "destructive",
                duration: 3000,
            });
        }
        finally {
            setLoading(false);
            setGeneratingOutline(false);
        }
    };
    const handleAllQuestionsCompleted = async () => {
        setHasCompletedConversation(true);
        // 如果是模板模式，完成后跳转到模板页
        if (selectedMode === 1) {
            navigate('/templates', {
                state: {
                    backgroundInfo,
                    mode: 1
                }
            });
            return;
        }
        // AI智能生成或导入企业文件生成模式
        if (files.length > 0) {
            // 开始生成大纲
            await handleGeneration(files);
        }
        else {
            toast({
                title: "生成失败",
                description: "请先上传文件",
                variant: "destructive",
            });
        }
    };
    useEffect(() => {
        if (currentStep >= questions.length) {
            handleAllQuestionsCompleted();
        }
    }, [currentStep]);
    // 添加生成函数
    const [isGenerating, setIsGenerating] = useState(false);
    const handleGeneration = async (files) => {
        try {
            setIsGenerating(true);
            setGeneratingOutline(true); // 添加生成中状态
            const formData = new FormData();
            const token = localStorage.getItem('token');
            console.log('Using token:', token); // 调试日志
            files.forEach(file => {
                formData.append('files', file);
            });
            const completeBackgroundInfo = {
                ...backgroundInfo,
            };
            formData.append('description', JSON.stringify(completeBackgroundInfo));
            formData.append('ai_model', 'gpt-4o-mini');
            // 修改请求头的设置方式
            const headers = new Headers();
            headers.append('Authorization', `Bearer ${token}`);
            // 不要设置 Content-Type，因为是 FormData
            const response = await fetch('http://localhost:8001/api/storage/generate_outline_and_upload/', { method: 'POST',
                headers: headers,
                body: formData,
                credentials: 'include' // 添加这个选项
            });
            // 打印响应详情以便调试
            console.log('Response status:', response.status);
            console.log('Response headers:', Object.fromEntries(response.headers));
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText); // 试日志
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            console.log('response', response);
            const data = await response.json();
            setOutline(parseOutlineText(data.outline));
        }
        catch (error) {
            console.error('Error generating outline:', error);
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "生成大纲时发生错误",
                variant: "destructive",
            });
        }
        finally {
            setIsGenerating(false);
            setGeneratingOutline(false); // 清除生成中状态
        }
    };
    // 添加解析大纲文本的函数
    const parseOutlineText = (text) => {
        const lines = text.split('\n').map(line => line.trim());
        const outline = [];
        let currentSection = null;
        let currentContent = [];
        let currentItems = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (!line && !currentSection)
                continue;
            if (line.startsWith('#')) {
                if (currentSection) {
                    if (currentContent.length > 0) {
                        currentSection.content = currentContent.join('\n');
                    }
                    if (currentItems.length > 0) {
                        currentSection.items = currentItems;
                    }
                    outline.push(currentSection);
                    currentContent = [];
                    currentItems = [];
                }
                const level = line.match(/^#+/)?.[0].length || 1;
                currentSection = {
                    title: line.replace(/^#+\s*/, ''),
                    level: level,
                    items: [],
                    content: ''
                };
            }
            else if (line.startsWith('-') && currentSection) {
                if (currentContent.length > 0) {
                    currentSection.content = currentContent.join('\n');
                    currentContent = [];
                }
                currentItems.push(line.replace(/^-\s*/, ''));
            }
            else if (currentSection) {
                if (currentItems.length > 0 && line) {
                    currentSection.items = currentItems;
                    currentItems = [];
                }
                currentContent.push(line);
            }
        }
        if (currentSection) {
            if (currentContent.length > 0) {
                currentSection.content = currentContent.join('\n');
            }
            if (currentItems.length > 0) {
                currentSection.items = currentItems;
            }
            outline.push(currentSection);
        }
        return outline;
    };
    // 添加大纲编辑卡片组件
    // 添加重生成大纲的函数
    const [showImprovementInput, setShowImprovementInput] = useState(false);
    const [improvementDirection, setImprovementDirection] = useState("");
    const handleRegenerateOutline = async () => {
        if (!improvementDirection.trim()) {
            toast({
                title: "请输入修改方向",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        console.log('improvementDirection', improvementDirection);
        try {
            setLoading(true);
            setGeneratingOutline(true);
            // Check if we have files
            if (!files || files.length === 0) {
                window.alert('Please upload at least one file with content.');
                setLoading(false);
                setGeneratingOutline(false);
                return;
            }
            // Update background info with improvement direction
            const updatedBackgroundInfo = {
                ...backgroundInfo,
                requirements: improvementDirection.trim()
            };
            setBackgroundInfo(updatedBackgroundInfo);
            const formData = new FormData();
            formData.append('description', JSON.stringify(updatedBackgroundInfo));
            // Add stored files
            files.forEach((file) => {
                formData.append('files', file);
            });
            formData.append('ai_model', 'gpt-4o-mini');
            const token = localStorage.getItem('token');
            console.log('FormData contents for regeneration:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }
            const response = await fetch('http://localhost:8001/api/storage/generate_outline_and_upload/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const data = await response.json();
            if (data.outline) {
                setOutline(parseOutlineText(data.outline));
            }
            else {
                throw new Error('No outline generated');
            }
        }
        catch (error) {
            console.error('Error regenerating outline:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to regenerate outline",
                variant: "destructive"
            });
        }
        finally {
            setLoading(false);
            setGeneratingOutline(false);
        }
    };
    const handleRegenerateClick = () => {
        setShowImprovementInput(true);
    };
    const handleImprovementSubmit = async () => {
        if (!improvementDirection.trim()) {
            toast({
                title: "请输入修改方向",
                variant: "destructive",
                duration: 3000,
            });
            return;
        }
        console.log('improvementDirection', improvementDirection);
        await handleRegenerateOutline();
    };
    // 添加 navigate
    const navigate = useNavigate();
    // Add new state for mode selection
    const [selectedMode, setSelectedMode] = useState(0);
    // Update the button handlers
    const handleModeSelection = (mode) => {
        setSelectedMode(mode);
        if (mode === 1) {
            // AI智能生成：先问答再上传
            handleAIGenerate();
        }
        else if (mode === 2 || mode === 3) {
            // 使用模板生成或混合模板：直接开始问答，完成后跳转
            handleAIGenerate();
        }
    };
    const handleSelectTemplate = () => {
        navigate('/templates', { state: { outline } });
    };
    const handlePreview = () => {
        // 如果没有大纲数据，直接返回
        if (!outline || outline.length === 0) {
            toast({
                title: "无法预览",
                description: "请先生成大纲内容",
                variant: "destructive",
            });
            return;
        }
        // 跳转到生成页面并传递数据
        navigate('/generated-document', {
            state: {
                outline: outline,
                backgroundInfo: backgroundInfo,
                uploadedFiles: files // 添加文件信息
            }
        });
    };
    // Add state for edited outline
    const [editedOutline, setEditedOutline] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    // Update outline state handling
    useEffect(() => {
        setEditedOutline(outline);
    }, [outline]);
    // Add handlers for editing
    const handleEditSection = (sectionIndex, field, value) => {
        setEditedOutline(prev => prev.map((section, index) => {
            if (index === sectionIndex) {
                return { ...section, [field]: value };
            }
            return section;
        }));
    };
    const handleEditItem = (sectionIndex, itemIndex, value) => {
        setEditedOutline(prev => prev.map((section, index) => {
            if (index === sectionIndex) {
                const newItems = [...(section.items || [])];
                newItems[itemIndex] = value;
                return { ...section, items: newItems };
            }
            return section;
        }));
    };
    const handleSaveOutline = () => {
        setOutline(editedOutline);
        setIsEditing(false);
        toast({
            title: "保存成功",
            description: "大纲修改已保存",
            duration: 3000,
        });
    };
    // Update the outline rendering section
    const [outlineText, setOutlineText] = useState('');
    const outlineToText = (sections) => {
        return sections.map(section => {
            let text = '#'.repeat(section.level) + ' ' + section.title + '\n';
            if (section.content) {
                text += section.content + '\n';
            }
            if (section.items && section.items.length > 0) {
                text += section.items.map(item => '- ' + item).join('\n') + '\n';
            }
            return text;
        }).join('\n');
    };
    const handleOutlineTextChange = (text) => {
        setOutlineText(text);
        const newOutline = parseOutlineText(text);
        setOutline(newOutline);
    };
    useEffect(() => {
        if (outline.length > 0) {
            setOutlineText(outlineToText(outline));
        }
    }, [outline]);
    const renderEditableOutline = () => {
        return (_jsx("div", { className: "p-4 bg-amber-50 rounded-lg", children: _jsx("textarea", { value: outlineText, onChange: (e) => handleOutlineTextChange(e.target.value), className: "w-full h-[400px] p-4 font-mono text-amber-600 bg-white border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-300", placeholder: "\u5927\u7EB2\u5185\u5BB9..." }) }));
    };
    return (_jsxs("div", { className: "flex min-h-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: [_jsxs("header", { className: "flex h-14 items-center gap-4 border-b bg-white px-6", children: [_jsx(Link, { to: "#", className: "flex items-center gap-2", children: _jsx(ArrowLeft, { className: "h-5 w-5 text-amber-600" }) }), _jsxs("div", { className: "ml-auto flex items-center gap-4", children: [_jsx(Button, { variant: "ghost", size: "icon", children: _jsx(HelpCircle, { className: "h-5 w-5 text-amber-600" }) }), _jsx(Button, { variant: "ghost", size: "icon", children: _jsx(Recycle, { className: "h-5 w-5 text-amber-600" }) })] })] }), _jsx("main", { className: "flex flex-1 gap-4 p-4", children: _jsxs("div", { className: "grid w-full gap-4", children: [_jsx(Card, { className: "bg-white shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(Bot, { className: "h-5 w-5 text-amber-600" }), _jsx("p", { className: "text-sm text-amber-600", children: "Hi~\u5C0A\u656C\u7684\u7528\u6237\uFF0C\u6211\u662F\u60A8\u7684AI\u667A\u80FD\u52A9\u7406\u5C0FA\uFF0C\u8BF7\u95EE\u60A8\u60F3\u901A\u8FC7\u4EC0\u4E48\u65B9\u5F0F\u6765\u751F\u6210PPT\u5462\uFF1F" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 md:grid-cols-4", children: [_jsxs(Button, { variant: "outline", className: "h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50", onClick: () => {
                                                    setSelectedMode(1); // AI智能生成
                                                    handleAIGenerate();
                                                }, children: [_jsx(Bot, { className: "h-8 w-8 text-amber-500" }), _jsx("span", { children: "AI\u667A\u80FD\u751F\u6210" })] }), _jsxs(Button, { variant: "outline", className: "h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50", onClick: () => {
                                                    setSelectedMode(2); // 使用模板生成
                                                    handleAIGenerate();
                                                }, children: [_jsx(FileText, { className: "h-8 w-8 text-amber-500" }), _jsx("span", { children: "\u4F7F\u7528\u6A21\u677F\u751F\u6210" })] }), _jsxs(Button, { variant: "outline", className: "h-auto flex-col gap-2 p-4 border-amber-200 text-amber-600 hover:bg-amber-50", onClick: () => {
                                                    setSelectedMode(3); // 混合模板+自由生成
                                                    handleAIGenerate();
                                                }, children: [_jsx(LayoutTemplate, { className: "h-8 w-8 text-amber-500" }), _jsx("span", { children: "\u6DF7\u5408\u6A21\u677F+\u81EA\u7531\u751F\u6210" })] })] })] }) }), _jsx(Card, { className: "bg-white shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [_jsx("div", { className: "mb-4", children: _jsx("p", { className: "text-sm text-amber-600", children: "\u60A8\u53EF\u4EE5\u5728\u4E0B\u65B9\u8F93\u5165\u60A8\u60F3\u8981\u7684\u6587\u6863\u4E3B\u9898\uFF0C\u82E5\u80FD\u8865\u5145\u884C\u4E1A\u3001\u7528\u9014\u3001\u5C97\u4F4D\u7B49\u4FE1\u606F\uFF0C\u667A\u80FD\u751F\u6210\u7684\u5927\u7EB2\u5185\u5BB9\u4F1A\u66F4\u4E30\u5BCC\u54E6" }) }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx(Badge, { variant: "secondary", className: "bg-amber-100 text-amber-600", children: "\u53C2\u8003\u6587\u6863" }), _jsx(Badge, { variant: "outline", className: "border-amber-200 text-amber-600", children: "\u9875\u6570 20-30\u9875" }), _jsx(Badge, { variant: "outline", className: "border-amber-200 text-amber-600", children: "\u53D7\u4F17 \u5927\u4F17" }), _jsx(Badge, { variant: "outline", className: "border-amber-200 text-amber-600", children: "\u573A\u666F \u901A\u7528" })] }), _jsxs("div", { className: "relative", children: [_jsx(Input, { placeholder: "\u8BF7\u8F93\u5165\u6587\u6863\u4E3B\u9898\uFF0C\u5982\uFF1A\u65B0\u5458\u5DE5\u804C\u57F9\u8BAD\u65B9\u6848", value: input, onChange: (e) => setInput(e.target.value), className: "border-amber-200 focus:border-amber-300 focus:ring-amber-300" }), _jsxs(Button, { className: "absolute right-1 top-1 h-7 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white", size: "sm", onClick: () => {
                                                            setSelectedMode(1); // AI智能生成
                                                            handleAIGenerate();
                                                        }, disabled: loading, children: [loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : _jsx(Send, { className: "h-4 w-4" }), "AI\u751F\u6210"] })] }), _jsx(ScrollArea, { className: "h-[120px]", children: _jsx("div", { className: "flex flex-wrap gap-2", children: topics.map((topic) => (_jsx(Badge, { variant: "secondary", className: "cursor-pointer bg-amber-50 text-amber-600 hover:bg-amber-100", onClick: () => setInput(topic), children: topic }, topic))) }) })] })] }) }), _jsx(Card, { className: "bg-white shadow-sm", children: _jsxs(CardContent, { className: "p-4", children: [showChat && (_jsxs("div", { className: "mt-6", children: [_jsx(ScrollArea, { className: "h-[400px] pr-4", children: _jsxs("div", { className: "space-y-4", children: [chatHistory.map((message, index) => (_jsxs("div", { className: "space-y-2", children: [message.type === 'bot' && (_jsx("div", { className: "flex justify-start", children: _jsxs("div", { className: "max-w-[80%] rounded-lg p-3 bg-amber-50", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx(Bot, { className: "h-4 w-4 text-amber-600" }), _jsx("span", { className: "text-xs font-medium text-amber-600", children: "AI\u52A9\u7406" })] }), _jsx("p", { className: "text-sm text-amber-800", children: message.content })] }) })), message.type === 'user' && (_jsx("div", { className: "flex justify-end", children: _jsx("div", { className: "max-w-[80%] rounded-lg p-3 bg-gradient-to-r from-amber-600 to-amber-500", children: _jsx("p", { className: "text-sm text-white", children: message.content }) }) }))] }, index))), showUpload && (_jsx(DocumentUpload, { onUploadComplete: (files) => {
                                                                setFiles(files.map(file => file));
                                                                console.log('Files saved:', files.map(f => f.name));
                                                            }, maxFileSize: 20 * 1024 * 1024, acceptedFileTypes: ['.doc', '.docx', '.pdf', '.txt', '.md'], onConfirm: handleUploadConfirm, hasCompletedConversation: hasCompletedConversation })), !showUpload && (_jsx("div", { className: "flex justify-end mt-4", children: _jsx("div", { className: "max-w-[80%] w-full", children: _jsx("div", { className: "relative", children: _jsx(Input, { value: input, onChange: (e) => setInput(e.target.value), placeholder: "\u6309\u56DE\u8F66\u53D1\u9001\u6D88\u606F...", className: "pr-20 border-amber-200 focus-visible:ring-amber-500 focus-visible:ring-1 focus-visible:border-amber-500", onKeyDown: (e) => {
                                                                            if (e.key === 'Enter' && input.trim()) {
                                                                                e.preventDefault();
                                                                                handleAnswer(input);
                                                                            }
                                                                        }, autoFocus: true }) }) }) })), isSubmitting && (_jsxs("div", { className: "flex items-center justify-center mt-4", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }), _jsx("span", { className: "text-sm text-amber-600", children: "\u6B63\u5728\u63D0\u4EA4..." })] })), _jsx("div", { ref: chatEndRef })] }) }), currentStep >= questions.length && (_jsxs(Button, { className: "w-full mt-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white", onClick: () => generateOutline(input, files), disabled: loading, children: [loading ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "\u5F00\u59CB\u751F\u6210\u57F9\u8BAD\u5927\u7EB2"] }))] })), _jsxs("div", { className: "mt-4 flex justify-between", children: [_jsxs("div", { className: "flex flex-col gap-4 flex-grow mr-4", children: [_jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "border-amber-200 text-amber-600 hover:bg-amber-50", onClick: handlePreview, disabled: !outline || outline.length === 0, children: [_jsx(Eye, { className: "mr-2 h-4 w-4" }), "\u9884\u89C8\u6B63\u6587"] }), _jsxs("div", { className: "flex gap-2 items-center", children: [showImprovementInput && (_jsx(Input, { value: improvementDirection, onChange: (e) => setImprovementDirection(e.target.value), placeholder: "\u8BF7\u8F93\u5165\u6539\u8FDB\u65B9\u5411...", className: "w-48 border-amber-200", onKeyDown: (e) => {
                                                                            if (e.key === 'Enter' && improvementDirection.trim()) {
                                                                                handleImprovementSubmit();
                                                                            }
                                                                        } })), _jsxs(Button, { variant: "outline", size: "sm", className: "border-amber-200 text-amber-600 hover:bg-amber-50", onClick: handleRegenerateClick, disabled: isGenerating, children: [_jsx(Recycle, { className: "mr-2 h-4 w-4" }), showImprovementInput ? '确认改进' : '换个大纲'] })] })] }), outline.length > 0 && (_jsx("div", { className: "p-4 bg-amber-50 rounded-lg", children: renderEditableOutline() }))] }), _jsxs(Button, { size: "sm", className: "bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white", onClick: handleSelectTemplate, disabled: !outline || outline.length === 0, children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), "\u6311\u9009PPT\u6A21\u677F"] })] })] }) }), showUpload && (_jsx(Card, { className: "bg-white shadow-sm mt-4", children: _jsxs(CardContent, { className: "p-4", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(Bot, { className: "h-5 w-5 text-amber-600" }), _jsx("p", { className: "text-sm text-amber-600", children: "\u8BF7\u4E0A\u4F20\u7684\u4F01\u4E1A\u6587\u4EF6\uFF0C\u6211\u4EEC\u5C06\u57FA\u4E8E\u6587\u4EF6\u5185\u5BB9\u4E3A\u60A8\u751F\u6210\u76F8\u5173\u6587\u6863" })] }), _jsx(DocumentUpload, { onUploadComplete: (files) => {
                                            setFiles(files.map(file => file));
                                            console.log('Files saved:', files.map(f => f.name));
                                        }, maxFileSize: 20 * 1024 * 1024, acceptedFileTypes: ['.doc', '.docx', '.pdf', '.txt', '.md'], onConfirm: handleUploadConfirm, hasCompletedConversation: hasCompletedConversation })] }) })), showImprovementInput && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg p-6 w-96", children: [_jsx("h3", { className: "text-lg font-medium mb-4", children: "\u8BF7\u8F93\u5165\u4FEE\u6539\u65B9\u5411" }), _jsx(Input, { value: improvementDirection, onChange: (e) => setImprovementDirection(e.target.value), placeholder: "\u4F8B\u5982\uFF1A\u589E\u52A0\u66F4\u591A\u6280\u672F\u7EC6\u8282...", className: "mb-4", autoFocus: true }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                                    setShowImprovementInput(false);
                                                    setImprovementDirection("");
                                                }, children: "\u53D6\u6D88" }), _jsx(Button, { onClick: handleImprovementSubmit, disabled: !improvementDirection.trim(), children: "\u786E\u8BA4" })] })] }) }))] }) }), (isGenerating || generatingOutline) && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsx(Card, { className: "w-[300px] p-6", children: _jsxs("div", { className: "flex flex-col items-center gap-4", children: [_jsx(Loader2, { className: "h-8 w-8 animate-spin text-amber-600" }), _jsxs("div", { className: "text-center", children: [_jsx("h3", { className: "font-semibold text-lg mb-2", children: "\u6B63\u5728\u751F\u6210\u5927\u7EB2" }), _jsx("p", { className: "text-sm text-gray-500", children: "\u8BF7\u7A0D\u5019\uFF0C\u8FD9\u53EF\u80FD\u9700\u8981\u4E00\u70B9\u65F6\u95F4..." })] })] }) }) }))] }));
};
export default OutlineGenerator;
