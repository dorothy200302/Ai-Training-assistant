'use client'

import  { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from '../config/constants';

export default function DocumentPreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        const response = await fetch(`${API_BASE_URL}/api/storage/document-content/?url=${encodeURIComponent(url)}`, {
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
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载文档失败');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
        <div className="text-orange-600">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      {/* 顶部导航栏 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="text-orange-600 hover:text-orange-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
              <h1 className="text-xl font-semibold text-orange-800">{name || '文档预览'}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* 文档内容预览区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 min-h-[calc(100vh-12rem)]">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {content}
          </pre>
        </div>
      </div>
    </div>
  );
}
