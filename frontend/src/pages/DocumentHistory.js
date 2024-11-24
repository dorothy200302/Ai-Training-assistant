'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Search, Calendar, Grid, List, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
export default function DocumentHistory() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetchDocuments();
    }, []);
    const fetchDocuments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8001/api/storage/generated-documents/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error('Failed to fetch documents');
            }
            const data = await response.json();
            console.log('Fetched documents:', data);
            if (data.status === 'success' && Array.isArray(data.data)) {
                setDocuments(data.data);
            }
            else {
                console.error('Unexpected data format:', data);
                throw new Error('Unexpected data format from server');
            }
        }
        catch (error) {
            console.error('Error fetching documents:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handlePreview = async (doc) => {
        try {
            // 使用路由导航到预览页面，并传递文档信息
            navigate(`/document-preview?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.document_name)}&type=${encodeURIComponent(doc.document_type)}`);
        }
        catch (error) {
            console.error('Error navigating to preview:', error);
        }
    };
    const handleDownload = async (url) => {
        try {
            window.open(url, '_blank');
        }
        catch (error) {
            console.error('Error downloading document:', error);
        }
    };
    const filteredDocuments = documents.filter(doc => doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (selectedType === 'all' || doc.document_type === selectedType));
    return (_jsx("div", { className: "flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: _jsxs("div", { className: "w-full p-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-orange-800", children: "\u5386\u53F2\u6587\u6863" }), _jsx("div", { className: "flex gap-2", children: _jsx(Button, { variant: "outline", className: "border-orange-300 text-orange-600 hover:bg-orange-100", onClick: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid'), children: viewMode === 'grid' ? _jsx(List, { className: "h-4 w-4" }) : _jsx(Grid, { className: "h-4 w-4" }) }) })] }), _jsx("div", { className: "bg-white rounded-xl shadow-md overflow-hidden border border-orange-200", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 mb-6", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" }), _jsx(Input, { type: "text", placeholder: "\u641C\u7D22\u6587\u6863...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10 border-orange-200 focus:border-orange-300 focus:ring-orange-300" })] }), _jsxs(Select, { value: selectedType, onValueChange: setSelectedType, children: [_jsx(SelectTrigger, { className: "w-[180px] border-orange-200", children: _jsx(SelectValue, { placeholder: "\u6587\u6863\u7C7B\u578B" }) }), _jsx(SelectContent, { children: ['全部', 'PPT', 'Word', 'PDF', 'Excel'].map(type => (_jsx(SelectItem, { value: type, children: type }, type))) })] })] }), _jsx(Tabs, { defaultValue: "all", className: "mb-6", children: _jsxs(TabsList, { className: "bg-orange-100", children: [_jsx(TabsTrigger, { value: "all", className: "data-[state=active]:bg-white", children: "\u5168\u90E8\u6587\u6863" }), _jsx(TabsTrigger, { value: "recent", className: "data-[state=active]:bg-white", children: "\u6700\u8FD1\u7F16\u8F91" }), _jsx(TabsTrigger, { value: "shared", className: "data-[state=active]:bg-white", children: "\u5DF2\u5171\u4EAB" }), _jsx(TabsTrigger, { value: "starred", className: "data-[state=active]:bg-white", children: "\u5DF2\u6536\u85CF" })] }) }), loading ? (_jsx("div", { className: "flex justify-center items-center h-full", children: _jsx("p", { className: "text-orange-600", children: "\u52A0\u8F7D\u4E2D..." }) })) : (viewMode === 'grid' ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: filteredDocuments.map((doc) => (_jsx(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, className: "bg-white border border-orange-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow", children: _jsxs("div", { className: "p-4", children: [_jsx("h3", { className: "font-medium text-orange-800 mb-2 truncate", children: doc.document_name }), _jsxs("div", { className: "flex items-center justify-between text-sm text-orange-600", children: [_jsxs("span", { className: "flex items-center", children: [_jsx(Calendar, { className: "h-4 w-4 mr-1" }), new Date(doc.created_at).toLocaleDateString()] }), _jsxs("span", { className: "flex items-center", children: [_jsx(FileText, { className: "h-4 w-4 mr-1" }), doc.document_type] })] }), _jsx("div", { className: "mt-4 flex justify-between items-center", children: _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { size: "sm", variant: "ghost", className: "h-8 w-8 p-0", onClick: () => handlePreview(doc), children: _jsx(Eye, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", className: "h-8 w-8 p-0", onClick: () => handleDownload(doc.url), children: _jsx(Download, { className: "h-4 w-4" }) })] }) })] }) }, doc.id))) })) : (_jsx("div", { className: "space-y-4", children: filteredDocuments.map((doc) => (_jsxs(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.3 }, className: "bg-white p-4 rounded-lg border border-orange-200 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx(FileText, { className: "h-6 w-6 text-orange-500" }), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-orange-800", children: doc.document_name }), _jsxs("p", { className: "text-sm text-orange-600", children: [new Date(doc.created_at).toLocaleDateString(), " \u00B7 ", doc.document_type] })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => handlePreview(doc), children: [_jsx(Eye, { className: "h-4 w-4 mr-2" }), "\u9884\u89C8"] }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: () => handleDownload(doc.url), children: [_jsx(Download, { className: "h-4 w-4 mr-2" }), "\u4E0B\u8F7D"] })] })] }, doc.id))) })))] }) })] }) }));
}
