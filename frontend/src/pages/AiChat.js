"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Bot, FileText, MessageSquare, Send, Upload, Loader2 } from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
const models = [
    {
        id: "gpt-4",
        name: "GPT-4",
        description: "最强大的GPT-4模型，支持高级推理和创作",
        category: "OpenAI"
    },
    {
        id: "gpt-4o-mini",
        name: "GPT-4 Mini",
        description: "GPT-4的轻量版本，响应更快",
        category: "OpenAI"
    },
    {
        id: "qwen-77b",
        name: "Qwen 7B Chat",
        description: "通义千问-7B聊天模型，中英双语优化",
        category: "Siliconflow"
    },
    {
        id: "grok-beta",
        name: "Grok Beta",
        description: "具有实时互联网访问能力的新型对话模型",
        category: "Other"
    }
];
const convertUploadedFilesToFiles = (uploadedFiles) => {
    return uploadedFiles.map(uploadedFile => {
        if (uploadedFile.originalFile) {
            return uploadedFile.originalFile;
        }
        // Fallback in case originalFile is not available
        return new File([new ArrayBuffer(0)], uploadedFile.name, {
            type: uploadedFile.type || 'application/octet-stream',
            lastModified: Date.now(),
        });
    });
};
export default function Component() {
    const [messages, setMessages] = React.useState([]);
    const [input, setInput] = React.useState("");
    const [mode, setMode] = React.useState("chat");
    const [selectedModel, setSelectedModel] = React.useState(models[0].id);
    const [loading, setLoading] = React.useState(false);
    const [uploadProgress, setUploadProgress] = React.useState(0);
    const [showUploadDialog, setShowUploadDialog] = React.useState(false);
    const [uploadedUrls, setUploadedUrls] = React.useState([]);
    const [selectedFiles, setSelectedFiles] = React.useState(null);
    const [uploadedFiles, setUploadedFiles] = React.useState([]);
    const [documentUrls, setDocumentUrls] = React.useState([]);
    const [showUpload, setShowUpload] = React.useState(false);
    const [hasCompletedConversation, setHasCompletedConversation] = React.useState(false);
    const fileInputRef = React.useRef(null);
    const handleFileChange = (event) => {
        setSelectedFiles(event.target.files);
    };
    const token = localStorage.getItem('token');
    const handleFileUpload = async () => {
        if (!selectedFiles || selectedFiles.length === 0)
            return;
        if (!token) {
            toast({
                title: "认证错误",
                description: "请先登录后再上传文件",
                variant: "destructive",
            });
            return;
        }
        setUploadProgress(0);
        const formData = new FormData();
        for (let i = 0; i < selectedFiles.length; i++) {
            formData.append('files', selectedFiles[i]);
        }
        try {
            const response = await fetch(`http://localhost:8001/api/chatbot/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Upload failed');
            }
            const data = await response.json();
            setUploadedUrls(prev => [...prev, ...data.urls]);
            // Add system message about the uploaded document
            setMessages(prev => [...prev,
                { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
            ]);
            toast({
                title: "上传成功",
                description: "文档已成功上传，您可以开始提问了",
            });
        }
        catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "上传失败",
                description: error instanceof Error ? error.message : "文档上传失败，请重试",
                variant: "destructive",
            });
        }
        finally {
            setUploadProgress(100);
            setShowUploadDialog(false);
            setSelectedFiles(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };
    const handleSend = async () => {
        if (!input.trim() || loading)
            return;
        setMessages(prev => [...prev, { role: 'user', content: input }]);
        setInput('');
        setLoading(true);
        try {
            const { response } = await fetch(`http://localhost:8001/api/chatbot/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ query: input, model_name: selectedModel, document_urls: uploadedUrls }),
            }).then(res => res.ok ? res.json() : Promise.reject(`Error: ${res.status}`));
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        }
        catch (error) {
            console.error(error);
            toast({ title: "发送失败", description: "请重试", variant: "destructive" });
            setMessages(prev => prev.slice(0, -1));
        }
        finally {
            setLoading(false);
        }
    };
    const handleUploadConfirm = async (files) => {
        try {
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', file);
            });
            const response = await fetch(`http://localhost:8001/api/chatbot/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`上传失败: ${errorText}`);
            }
            const data = await response.json();
            setUploadedUrls(prev => [...prev, ...data.urls]);
            setMessages(prev => [...prev,
                { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
            ]);
            toast({
                title: "上传成功",
                description: "文档已上传并处理完成",
            });
            setShowUpload(false);
        }
        catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "上传失败",
                description: error instanceof Error ? error.message : "文档上传失败，请重试",
                variant: "destructive",
            });
        }
    };
    const handleUploadComplete = (uploadedFiles) => {
        const files = uploadedFiles.map(f => f.originalFile).filter((f) => f !== undefined);
        if (files.length > 0) {
            setMessages(prev => [...prev,
                { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
            ]);
            toast({
                title: "上传成功",
                description: "文档已上传并处理完成",
            });
            setShowUpload(false);
        }
    };
    return (_jsx("div", { className: "flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-50 to-orange-100", children: _jsx("div", { className: "w-full p-6", children: _jsxs("div", { className: "flex w-full gap-6", children: [_jsxs("div", { className: "w-[300px] flex flex-col bg-white rounded-xl shadow-lg", children: [_jsxs("div", { className: "w-full", children: [_jsx("h2", { className: "mb-2 text-lg font-semibold", children: "\u9009\u62E9\u6A21\u578B" }), _jsxs(Select, { value: selectedModel, onValueChange: setSelectedModel, children: [_jsx(SelectTrigger, { children: _jsx(SelectValue, {}) }), _jsx(SelectContent, { children: _jsx("div", { className: "grid gap-2 p-2", children: Object.entries(models.reduce((acc, model) => {
                                                        if (!acc[model.category]) {
                                                            acc[model.category] = [];
                                                        }
                                                        acc[model.category].push(model);
                                                        return acc;
                                                    }, {})).map(([category, categoryModels]) => (_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-sm font-semibold text-muted-foreground", children: category }), categoryModels.map((model) => (_jsx(SelectItem, { value: model.id, children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("div", { className: "font-medium", children: model.name }), _jsx("div", { className: "text-xs text-muted-foreground", children: model.description })] }) }, model.id)))] }, category))) }) })] })] }), _jsxs("div", { className: "p-4", children: [_jsx(Label, { className: "mb-2 block text-lg font-semibold", children: "\u6A21\u5F0F\u9009\u62E9" }), _jsxs(RadioGroup, { defaultValue: "chat", onValueChange: setMode, children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "chat", id: "chat" }), _jsx(Label, { htmlFor: "chat", children: "\u95EE\u7B54\u6A21\u5F0F" })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(RadioGroupItem, { value: "quiz", id: "quiz" }), _jsx(Label, { htmlFor: "quiz", children: "\u7B54\u9898\u6A21\u5F0F" })] })] })] }), _jsx("div", { className: "flex-1", children: _jsxs(Tabs, { defaultValue: "chat", className: "h-full", children: [_jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [_jsxs(TabsTrigger, { value: "chat", children: [_jsx(MessageSquare, { className: "mr-2 h-4 w-4" }), "\u804A\u5929"] }), _jsxs(TabsTrigger, { value: "docs", children: [_jsx(FileText, { className: "mr-2 h-4 w-4" }), "\u6587\u6863"] })] }), _jsx(TabsContent, { value: "chat", className: "h-[calc(100%-40px)]", children: _jsxs(Card, { className: "h-full", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "\u804A\u5929\u8BB0\u5F55" }), _jsx(CardDescription, { children: "\u4E0EAI\u52A9\u624B\u7684\u5BF9\u8BDD\u5386\u53F2" })] }), _jsx(CardContent, { children: _jsx(ScrollArea, { className: "h-[300px]", children: messages.map((message, index) => (_jsx("div", { className: `mb-4 flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`, children: _jsx("div", { className: `rounded-lg px-4 py-2 ${message.role === "assistant"
                                                                        ? "bg-muted text-muted-foreground"
                                                                        : "bg-orange-500 text-white"}`, children: message.content }) }, index))) }) })] }) }), _jsx(TabsContent, { value: "docs", children: _jsxs(Card, { children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: "\u6587\u6863\u7BA1\u7406" }), _jsx(CardDescription, { children: "\u4E0A\u4F20\u5E76\u7BA1\u7406\u53C2\u8003\u6587\u6863" })] }), _jsx(CardContent, { children: _jsxs(Dialog, { open: showUploadDialog, onOpenChange: setShowUploadDialog, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", className: "w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200", children: [_jsx(Upload, { className: "mr-2 h-4 w-4" }), "\u4E0A\u4F20\u6587\u6863"] }) }), _jsxs(DialogContent, { className: "bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-amber-800", children: "\u4E0A\u4F20\u6587\u6863" }), _jsx(DialogDescription, { className: "text-amber-700", children: "\u9009\u62E9\u8981\u4E0A\u4F20\u7684\u6587\u6863\u6587\u4EF6\u3002\u652F\u6301PDF\u3001Word\u3001PPT\u3001TXT\u7B49\u683C\u5F0F\u3002" })] }), _jsxs("div", { className: "grid gap-4", children: [_jsx("div", { className: "grid gap-2", children: _jsx(Input, { ref: fileInputRef, id: "files", type: "file", multiple: true, accept: ".pdf,.doc,.docx,.ppt,.pptx,.txt", onChange: handleFileChange, className: "bg-white border-2 border-dashed border-amber-200 hover:border-amber-300 cursor-pointer" }) }), uploadProgress > 0 && (_jsx(Progress, { value: uploadProgress, className: "bg-amber-100" })), _jsx(Button, { onClick: handleFileUpload, className: "mt-4 bg-amber-500 text-white hover:bg-amber-600", children: "\u786E\u8BA4\u4E0A\u4F20" })] })] })] }) })] }) })] }) })] }), _jsxs("div", { className: "flex-1", children: [_jsxs(Card, { className: "h-[calc(100vh-6rem)]", children: [_jsxs(CardHeader, { className: "pb-4", children: [_jsx(CardTitle, { children: "AI \u667A\u80FD\u52A9\u624B" }), _jsx(CardDescription, { children: "\u76F4\u63A5\u5F00\u59CB\u5BF9\u8BDD\uFF0C\u6216\u4E0A\u4F20\u6587\u6863\u4EE5\u83B7\u5F97\u66F4\u7CBE\u51C6\u7684\u56DE\u7B54" })] }), _jsxs(CardContent, { className: "flex flex-col h-[calc(100vh-12rem)]", children: [_jsx(ScrollArea, { className: "flex-1 pr-4", children: messages.length === 0 ? (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-muted-foreground", children: [_jsx(Bot, { className: "h-12 w-12 mb-4 text-amber-500" }), _jsx("p", { className: "text-center mb-2", children: "\u60A8\u53EF\u4EE5\uFF1A" }), _jsxs("ul", { className: "text-sm space-y-2", children: [_jsxs("li", { className: "flex items-center", children: [_jsx(MessageSquare, { className: "h-4 w-4 mr-2 text-amber-500" }), "\u76F4\u63A5\u8F93\u5165\u95EE\u9898\u5F00\u59CB\u5BF9\u8BDD"] }), _jsx("li", { children: _jsxs(Dialog, { open: showUpload, onOpenChange: setShowUpload, children: [_jsx(DialogTrigger, { asChild: true, children: _jsxs("div", { className: "flex items-center cursor-pointer hover:text-amber-600", children: [_jsx(Upload, { className: "h-4 w-4 mr-2 text-amber-500" }), "\u4E0A\u4F20\u6587\u6863\u83B7\u5F97\u66F4\u7CBE\u51C6\u7684\u56DE\u7B54"] }) }), _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u4E0A\u4F20\u6587\u6863" }), _jsx(DialogDescription, { children: "\u4E0A\u4F20\u6587\u6863\u540E\uFF0CAI \u5C06\u6839\u636E\u6587\u6863\u5185\u5BB9\u4E3A\u60A8\u63D0\u4F9B\u66F4\u7CBE\u51C6\u7684\u56DE\u7B54\u3002" })] }), _jsx(DocumentUpload, { onUploadComplete: (uploadedFiles) => {
                                                                                            const files = uploadedFiles.map(f => f.originalFile).filter((f) => !!f);
                                                                                            if (files.length > 0) {
                                                                                                handleUploadConfirm(files);
                                                                                            }
                                                                                            setShowUpload(false);
                                                                                        }, maxFileSize: 20 * 1024 * 1024, acceptedFileTypes: ['.doc', '.docx', '.pdf', '.txt', '.md'], hasCompletedConversation: hasCompletedConversation })] })] }) })] })] })) : (_jsxs("div", { className: "space-y-4", children: [messages.map((message, index) => (_jsx("div", { className: `mb-4 flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`, children: _jsx("div", { className: `rounded-lg px-4 py-2 max-w-[80%] ${message.role === "assistant"
                                                                    ? "bg-muted text-muted-foreground"
                                                                    : "bg-amber-500 text-white"}`, children: message.content }) }, index))), loading && (_jsx("div", { className: "flex justify-start", children: _jsxs("div", { className: "bg-muted rounded-lg px-4 py-2 flex items-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin text-amber-500" }), _jsx("span", { className: "text-sm text-muted-foreground", children: "AI \u6B63\u5728\u601D\u8003..." })] }) }))] })) }), _jsxs("div", { className: "mt-4", children: [_jsx(Dialog, { open: showUpload, onOpenChange: setShowUpload, children: _jsx(DialogContent, { children: _jsx(DocumentUpload, { onUploadComplete: handleUploadComplete, maxFileSize: 20 * 1024 * 1024, acceptedFileTypes: ['.doc', '.docx', '.pdf', '.txt', '.md'], onCancel: () => setShowUpload(false) }) }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { placeholder: "\u8F93\u5165\u60A8\u7684\u95EE\u9898...", value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => {
                                                                    if (e.key === "Enter" && !e.shiftKey) {
                                                                        e.preventDefault();
                                                                        handleSend();
                                                                    }
                                                                }, disabled: loading }), _jsx(Button, { onClick: handleSend, disabled: loading || !input.trim(), children: loading ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Send, { className: "h-4 w-4" })) })] })] })] })] }), uploadedUrls.length > 0 && (_jsxs("div", { className: "p-4 border-t", children: [_jsx("h2", { className: "mb-2 text-lg font-semibold", children: "\u5DF2\u4E0A\u4F20\u6587\u4EF6" }), _jsx("div", { className: "space-y-2", children: uploadedUrls.map((url, index) => {
                                            const fileName = decodeURIComponent(url.split('/').pop() || '');
                                            return (_jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg bg-gray-50", children: [_jsx(FileText, { className: "h-4 w-4 text-blue-500" }), _jsx("span", { className: "text-sm truncate flex-1", title: fileName, children: fileName }), _jsx("a", { href: url, target: "_blank", rel: "noopener noreferrer", className: "text-xs text-blue-500 hover:text-blue-700", children: "\u67E5\u770B" })] }, index));
                                        }) })] }))] })] }) }) }));
}
