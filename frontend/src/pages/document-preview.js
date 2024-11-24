'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
export default function DocumentPreview() {
    const navigate = useNavigate();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState(null);
    const [error, setError] = useState(null);
    // 从URL参数获取文档信息
    const url = searchParams.get('url');
    const name = searchParams.get('name');
    useEffect(() => {
        if (!url) {
            navigate('/document-history');
            return;
        }
        const fetchContent = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:8001/api/storage/document-content/?url=${encodeURIComponent(url)}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch document content');
                }
                const text = await response.text();
                setContent(text);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : '加载文档失败');
            }
            finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [url, navigate]);
    const handleBack = () => {
        navigate(-1);
    };
    if (loading) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: _jsx("div", { className: "text-orange-600", children: "\u52A0\u8F7D\u4E2D..." }) }));
    }
    if (error) {
        return (_jsx("div", { className: "flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: _jsx("div", { className: "text-red-600", children: error }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300", children: [_jsx("div", { className: "bg-white shadow-sm", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4", children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: handleBack, className: "text-orange-600 hover:text-orange-700", children: [_jsx(ArrowLeft, { className: "h-4 w-4 mr-2" }), "\u8FD4\u56DE"] }), _jsx("h1", { className: "text-xl font-semibold text-orange-800", children: name || '文档预览' })] }) }) }) }), _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8", children: _jsx("div", { className: "bg-white rounded-lg shadow-lg p-6 min-h-[calc(100vh-12rem)]", children: _jsx("pre", { className: "whitespace-pre-wrap font-mono text-sm", children: content }) }) })] }));
}
