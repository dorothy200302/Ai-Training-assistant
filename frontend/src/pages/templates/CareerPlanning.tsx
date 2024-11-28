import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen,  Target, Users, FileDown, FileUp, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import DocumentUpload from '@/components/DocumentUpload';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../../config/constants';
import {EditableText} from '@/components/EditableText';  // Changed from { EditableText }
const BASE_URL = API_BASE_URL

const CareerPlanning: React.FC = () => {
  interface CareerPath {
    id: string
    name: string
    icon: React.ReactNode
    description: string
    skills: string[]
    training: string[]
  }

  interface PageContent {
    title: string
    subtitle: string
    overview: string
    skillsTitle: string
    skillsDescription: string
    discussionTitle: string
    discussionDescription: string
    learningTitle: string
    learningDescription: string
    reviewTitle: string
    reviewDescription: string
  }

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)

  const [pageContent, setPageContent] = useState<PageContent>({
    title: '职业发展规划',
    subtitle: '规划您的职业未来',
    overview: '探索适合您的职业发展道路，制定清晰的成长计划。',
    skillsTitle: '技能发展路径',
    skillsDescription: '根据您的职业目标，规划必要的技能提升路径。',
    discussionTitle: '职业发展讨论',
    discussionDescription: '与您的主管讨论职业发展方向和目标',
    learningTitle: '制定学习计划',
    learningDescription: '根据您的职业目标，选择相应的培训课程和发展机会',
    reviewTitle: '定期回顾与调整',
    reviewDescription: '每季度评估您的进展，并根据需要调整您的发展计划'
  })

  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([
    { 
      id: 'technical', 
      name: '技术专家', 
      icon: <BookOpen className="w-6 h-6" />,
      description: '技术路线',
      skills: ['深入的技术专业知识', '问题分析与解决能力', '技术创新思维', '技术文档编写'],
      training: ['新技术研讨会', '技术认证课程']
    },
    { 
      id: 'management', 
      name: '管理路线', 
      icon: <Users className="w-6 h-6" />,
      description: '管理路线',
      skills: ['团队领导与激励', '战略规划与执行', '沟通与协调能力', '决策制定能力'],
      training: ['领导力培训营', '管理技能工作坊']
    },
    { 
      id: 'project', 
      name: '项目管理', 
      icon: <Target className="w-6 h-6" />,
      description: '项目管理路线',
      skills: ['项目规划与管理', '风险评估与控制', '团队协作与沟通', '资源优化配置'],
      training: ['项目管理实践工作坊', 'PMP认证课程']
    }
  ])

  const { toast } = useToast()

  const updateContent = (key: keyof PageContent, value: string) => {
    setPageContent(prev => ({ ...prev, [key]: value }))
  }

  const handleUpload = (files: File[]) => {
    if (!files || files.length === 0) {
      setShowUpload(false);
      return;
    }
    setUploadedFiles(files);
    setShowConfirmation(true);
    setShowUpload(false);
  };

  const handleConfirmGenerate = async () => {
    try {
      setIsGenerating(true);
      const formData = new FormData();
      const token = localStorage.getItem('token');
      
      uploadedFiles.forEach(file => {
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
        files: uploadedFiles.map(f => f.name),
        template: 'career_planning',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch(`${BASE_URL}/api/storage/generate_full_doc_with_template/`, {
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
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowConfirmation(false);
      setUploadedFiles([]);
    }
  };

  const handleCancelGenerate = () => {
    setShowConfirmation(false);
    setUploadedFiles([]);
  };

  const saveToBackend = async (fileBlob: Blob, fileType: 'pdf' | 'docx') => {
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
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result as string;
          // 移除base64前缀（例如："data:application/pdf;base64,"）
          const base64Content = base64String.split(',')[1] || base64String;
          resolve(base64Content);
        };
        reader.readAsDataURL(fileBlob);
      });

      // 使用现有的download_document接口
      const response = await fetch('${BASE_URL}/api/storage/download_document', {
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
    } catch (error) {
      console.error('Save to backend error:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "文档保存失败，请重试",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <div className="flex justify-between items-center mb-8">
            <EditableText
              value={pageContent.title}
              onChange={(value) => updateContent('title', value)}
              className="text-3xl font-semibold text-white"
            />
          </div>
          <EditableText
            value={pageContent.subtitle}
            onChange={(value) => updateContent('subtitle', value)}
            className="text-amber-100"
          />
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">您的职业发展之旅</h2>
            <EditableText
              value={pageContent.overview}
              onChange={(value) => updateContent('overview', value)}
              className="text-amber-700 mb-4"
              
            />
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Button
                  onClick={() => setShowUpload(true)}
                  disabled={isGenerating}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <FileUp className="mr-2 h-4 w-4" />
                      上传文档
                    </>
                  )}
                </Button>

                {documentContent && (
                  <div className="space-x-2">
                   
                    <Button
                      onClick={() => saveToBackend(new Blob([documentContent], { type: 'text/plain' }), 'docx')}
                      disabled={isUploading}
                      variant="outline"
                      className="border-amber-500 text-amber-500 hover:bg-amber-50"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      下载 Word
                    </Button>
                  </div>
                )}
              </div>

              {showUpload && (
                <DocumentUpload
                  endpoint="/api/documents/upload"
                  isUploading={isGenerating}
                  setIsUploading={setIsGenerating}
                  onConfirm={handleUpload}
                  onCancel={() => setShowUpload(false)}
                  isLoading={isGenerating}
                />
              )}

              {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-lg w-2/3 max-w-2xl">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">确认生成文档</h2>
                    <p className="text-gray-700 mb-4">您已上传以下文件：</p>
                    <ul className="space-y-2 text-gray-600 mb-6">
                      {uploadedFiles.map((file, index) => (
                        <li key={index} className="flex items-center">
                          <FileUp className="mr-2 h-4 w-4" />
                          {file.name}
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-end space-x-4 mt-6">
                      <Button
                        onClick={handleCancelGenerate}
                        variant="outline"
                        className="border-gray-300"
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleConfirmGenerate}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <FileDown className="mr-2 h-4 w-4" />
                            确认生成
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {documentContent && (
                <Card className="mt-6">
                  <CardContent className="prose max-w-none pt-6">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {documentContent}
                    </ReactMarkdown>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">选择您的职业发展方向</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {careerPaths.map((path) => (
                <Card 
                  key={path.id} 
                  className={`bg-amber-50 border-amber-200 cursor-pointer transition-all ${
                    selectedPath === path.id ? 'ring-2 ring-amber-500' : ''
                  }`}
                  onClick={() => setSelectedPath(path.id)}
                >
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                      {path.icon}
                    </div>
                    <EditableText
                      value={path.name}
                      onChange={(value) => {
                        const newPaths = careerPaths.map(p => 
                          p.id === path.id ? { ...p, name: value } : p
                        );
                        setCareerPaths(newPaths);
                      }}
                      className="font-semibold text-amber-800"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {selectedPath && (
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-amber-800 mb-4">发展路径详情</h2>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-amber-100">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">概览</TabsTrigger>
                  <TabsTrigger value="skills" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">所需技能</TabsTrigger>
                  <TabsTrigger value="training" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">培训计划</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                      <EditableText
                        value={pageContent.skillsTitle}
                        onChange={(value) => updateContent('skillsTitle', value)}
                        className="text-amber-800 text-xl font-semibold"
                      />
                      <EditableText
                        value={pageContent.skillsDescription}
                        onChange={(value) => updateContent('skillsDescription', value)}
                        className="text-amber-600"
                      />
                    </CardHeader>
                    <CardContent>
                      <p className="text-amber-700 mb-4">
                        {selectedPath === 'technical' && '技术专家路线专注于深化专业技能，成为行业内的技术权威。'}
                        {selectedPath === 'management' && '管理路线致力于培养您的领导能力，带领团队实现卓越成果。'}
                        {selectedPath === 'project' && '项目管理路线旨在提升您的项目规划和执行能力，确保项目成功交付。'}
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700">初级</span>
                          <span className="text-amber-700">高级</span>
                        </div>
                        <Progress value={33} className="w-full bg-amber-200" indicatorClassName="bg-amber-500" />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="skills">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                      <EditableText
                        value={pageContent.skillsTitle}
                        onChange={(value) => updateContent('skillsTitle', value)}
                        className="text-amber-800 text-xl font-semibold"
                      />
                      <EditableText
                        value={pageContent.skillsDescription}
                        onChange={(value) => updateContent('skillsDescription', value)}
                        className="text-amber-600"
                      />
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-amber-700">
                        {selectedPath && careerPaths.find(p => p.id === selectedPath)?.skills.map((skill, index) => (
                          <li key={index}>
                            <EditableText
                              value={skill}
                              onChange={(value) => {
                                const newPaths = careerPaths.map(p => {
                                  if (p.id === selectedPath) {
                                    const newSkills = [...p.skills];
                                    newSkills[index] = value;
                                    return { ...p, skills: newSkills };
                                  }
                                  return p;
                                });
                                setCareerPaths(newPaths);
                              }}
                              className="text-amber-700"
                            />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="training">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                      <EditableText
                        value={pageContent.learningTitle}
                        onChange={(value) => updateContent('learningTitle', value)}
                        className="text-amber-800 text-xl font-semibold"
                      />
                      <EditableText
                        value={pageContent.learningDescription}
                        onChange={(value) => updateContent('learningDescription', value)}
                        className="text-amber-600"
                      />
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-amber-700">
                        {selectedPath && careerPaths.find(p => p.id === selectedPath)?.training.map((item, index) => (
                          <li key={index}>
                            <EditableText
                              value={item}
                              onChange={(value) => {
                                const newPaths = careerPaths.map(p => {
                                  if (p.id === selectedPath) {
                                    const newTraining = [...p.training];
                                    newTraining[index] = value;
                                    return { ...p, training: newTraining };
                                  }
                                  return p;
                                });
                                setCareerPaths(newPaths);
                              }}
                              className="text-amber-700"
                            />
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          )}

        
        </div>
      </div>
    </div>
  )
}

export default CareerPlanning