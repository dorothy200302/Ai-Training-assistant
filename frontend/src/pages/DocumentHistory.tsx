'use client'

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Trash2, Search, Calendar, Grid, List, Edit, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useNavigate } from 'react-router-dom';

interface GeneratedDocument {
  id: number;
  document_name: string;
  document_type: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export default function DocumentHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
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
      } else {
        console.error('Unexpected data format:', data);
        throw new Error('Unexpected data format from server');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (doc: GeneratedDocument) => {
    try {
      // 使用路由导航到预览页面，并传递文档信息
      navigate(`/document-preview?url=${encodeURIComponent(doc.url)}&name=${encodeURIComponent(doc.document_name)}&type=${encodeURIComponent(doc.document_type)}`);
    } catch (error) {
      console.error('Error navigating to preview:', error);
    }
  };

  const handleDownload = async (url: string) => {
    try {
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedType === 'all' || doc.document_type === selectedType)
  );

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-100 via-amber-200 to-amber-300">
      <div className="w-full p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-orange-800">历史文档</h1>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-100"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-orange-200">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400" />
                <Input
                  type="text"
                  placeholder="搜索文档..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-orange-200 focus:border-orange-300 focus:ring-orange-300"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px] border-orange-200">
                  <SelectValue placeholder="文档类型" />
                </SelectTrigger>
                <SelectContent>
                  {['全部', 'PPT', 'Word', 'PDF', 'Excel'].map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs defaultValue="all" className="mb-6">
              <TabsList className="bg-orange-100">
                <TabsTrigger value="all" className="data-[state=active]:bg-white">全部文档</TabsTrigger>
                <TabsTrigger value="recent" className="data-[state=active]:bg-white">最近编辑</TabsTrigger>
                <TabsTrigger value="shared" className="data-[state=active]:bg-white">已共享</TabsTrigger>
                <TabsTrigger value="starred" className="data-[state=active]:bg-white">已收藏</TabsTrigger>
              </TabsList>
            </Tabs>

            {loading ? (
              <div className="flex justify-center items-center h-full">
                <p className="text-orange-600">加载中...</p>
              </div>
            ) : (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white border border-orange-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <h3 className="font-medium text-orange-800 mb-2 truncate">{doc.document_name}</h3>
                        <div className="flex items-center justify-between text-sm text-orange-600">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {doc.document_type}
                          </span>
                        </div>
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => handlePreview(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownload(doc.url)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDocuments.map((doc) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-white p-4 rounded-lg border border-orange-200 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <FileText className="h-6 w-6 text-orange-500" />
                        <div>
                          <h3 className="font-medium text-orange-800">{doc.document_name}</h3>
                          <p className="text-sm text-orange-600">
                            {new Date(doc.created_at).toLocaleDateString()} · {doc.document_type}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handlePreview(doc)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          预览
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDownload(doc.url)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          下载
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}