import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from '@/config/constants';

interface LearningProgress {
  current_section: string;
  progress_percentage: number;
  completed: boolean;
  quiz_scores: Record<string, number>;
}

interface DocumentStatistics {
  access_statistics: {
    total_views: number;
    total_edits: number;
    total_downloads: number;
    unique_users: number;
    action_breakdown: Record<string, number>;
  };
  quiz_statistics: {
    total_attempts: number;
    average_score: number;
    highest_score: number;
    passing_rate: number;
  };
}

export default function DocumentLearning() {
  const { documentId } = useParams();
  const [progress, setProgress] = useState<LearningProgress | null>(null);
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    if (documentId) {
      fetchDocumentContent();
      fetchDocumentProgress();
      fetchDocumentStatistics();
    }
  }, [documentId]);

  const fetchDocumentContent = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`);
      if (response.ok) {
        const data = await response.json();
        setDocumentContent(data.content);
      }
    } catch (error) {
      toast({
        title: "获取文档失败",
        description: "无法加载文档内容",
        variant: "destructive",
      });
    }
  };

  const fetchDocumentProgress = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/progress`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      toast({
        title: "获取进度失败",
        description: "无法加载学习进度信息",
        variant: "destructive",
      });
    }
  };

  const fetchDocumentStatistics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/statistics`);
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      toast({
        title: "获取统计数据失败",
        description: "无法加载文档统计信息",
        variant: "destructive",
      });
    }
  };

  const updateProgress = async (sectionId: string, percentage: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_section: sectionId,
          progress_percentage: percentage,
          completed: percentage === 100,
        }),
      });

      if (response.ok) {
        await fetchDocumentProgress();
        toast({
          title: "进度已更新",
          description: "学习进度已成功保存",
        });
      }
    } catch (error) {
      toast({
        title: "更新进度失败",
        description: "无法更新学习进度",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs defaultValue="content" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">文档内容</TabsTrigger>
          <TabsTrigger value="progress">学习进度</TabsTrigger>
          <TabsTrigger value="statistics">统计数据</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardContent className="p-6">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: documentContent }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">学习进度</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">总体进度</p>
                  <Progress value={progress?.progress_percentage || 0} className="mt-2" />
                  <p className="text-sm text-gray-500 mt-1">
                    {progress?.progress_percentage.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">当前章节</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {progress?.current_section || '未开始学习'}
                  </p>
                </div>
                {progress?.quiz_scores && (
                  <div>
                    <p className="text-sm font-medium">测验成绩</p>
                    <ScrollArea className="h-[200px] mt-2">
                      {Object.entries(progress.quiz_scores).map(([quiz, score]) => (
                        <div key={quiz} className="flex justify-between items-center py-2">
                          <span className="text-sm">{quiz}</span>
                          <span className="text-sm font-medium">{score}分</span>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="statistics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">访问统计</h3>
              </CardHeader>
              <CardContent>
                {statistics?.access_statistics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">总浏览次数</p>
                        <p className="text-2xl font-bold">
                          {statistics.access_statistics.total_views}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">独立访问用户</p>
                        <p className="text-2xl font-bold">
                          {statistics.access_statistics.unique_users}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">编辑次数</p>
                        <p className="text-2xl font-bold">
                          {statistics.access_statistics.total_edits}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">下载次数</p>
                        <p className="text-2xl font-bold">
                          {statistics.access_statistics.total_downloads}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">测验统计</h3>
              </CardHeader>
              <CardContent>
                {statistics?.quiz_statistics && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">参与人数</p>
                        <p className="text-2xl font-bold">
                          {statistics.quiz_statistics.total_attempts}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">平均分数</p>
                        <p className="text-2xl font-bold">
                          {statistics.quiz_statistics.average_score.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">最高分数</p>
                        <p className="text-2xl font-bold">
                          {statistics.quiz_statistics.highest_score}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">通过率</p>
                        <p className="text-2xl font-bold">
                          {statistics.quiz_statistics.passing_rate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 