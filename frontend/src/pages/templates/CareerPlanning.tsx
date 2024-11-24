import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { BookOpen, Briefcase, GraduationCap, LineChart, Target, Users, FileUp, Loader2, FileDown } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import DocumentUpload from '@/components/DocumentUpload'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const CareerPlanning: React.FC = () => {
  interface CareerPath {
    id: string;
    name: string;
  }

  interface EditableContent {
    title: string;
    subtitle: string;
    careerPaths: CareerPath[];
    skillsTitle: string;
    skillsDescription: string;
    trainingTitle: string;
    trainingDescription: string;
    internalTrainingTitle: string;
    externalCoursesTitle: string;
    mentorshipTitle: string;
    technicalSkills: string[];
    managementSkills: string[];
    projectSkills: string[];
    internalTraining: string[];
    externalCourses: string[];
    mentorship: string;
    nextStepsTitle: string;
    discussionTitle: string;
    discussionDescription: string;
  }

  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [documentContent, setDocumentContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [isEditable, setIsEditable] = useState(false)
  const [editableContent, setEditableContent] = useState<EditableContent>({
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
  })
  const { toast } = useToast()

  const handleContentEdit = (section: keyof EditableContent, index: number | null, newValue: string) => {
    setEditableContent(prev => {
      const newContent = { ...prev };
      
      // Handle array of objects (careerPaths)
      if (section === 'careerPaths' && index !== null) {
        const careerPaths = [...newContent.careerPaths];
        careerPaths[index] = { ...careerPaths[index], name: newValue };
        return { ...newContent, careerPaths };
      }
      
      // Handle arrays of strings
      const stringArrayKeys: (keyof EditableContent)[] = [
        'technicalSkills',
        'managementSkills',
        'projectSkills',
        'internalTraining',
        'externalCourses'
      ];
      
      if (stringArrayKeys.includes(section) && index !== null) {
        const array = [...(newContent[section] as string[])];
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
    { id: 'technical', name: '技术专家', icon: <BookOpen className="w-6 h-6" /> },
    { id: 'management', name: '管理路线', icon: <Users className="w-6 h-6" /> },
    { id: 'project', name: '项目管理', icon: <Target className="w-6 h-6" /> },
  ]

  const handleUploadConfirm = async (files: File[], description?: string) => {
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
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "生成失败",
        description: error instanceof Error ? error.message : "文档生成失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setShowUpload(false);
    }
  };

  const handleUploadCancel = () => {
    setShowUpload(false);
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <div className="flex justify-between items-center mb-8">
            {isEditable ? (
              <input
                type="text"
                value={editableContent.title}
                onChange={(e) => handleContentEdit('title', null, e.target.value)}
                className="text-3xl font-semibold text-amber-800 bg-transparent border-b border-white focus:outline-none w-full"
              />
            ) : (
              <h1 className="text-3xl font-semibold text-amber-800">{editableContent.title}</h1>
            )}
            <div className="flex gap-4">
              <Button
                onClick={toggleEditable}
                variant={isEditable ? "destructive" : "default"}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isEditable ? "完成编辑" : "开启编辑"}
              </Button>
            </div>
          </div>
          {isEditable ? (
            <input
              type="text"
              value={editableContent.subtitle}
              onChange={(e) => handleContentEdit('subtitle', null, e.target.value)}
              className="text-amber-100 bg-transparent border-b border-white focus:outline-none w-full"
            />
          ) : (
            <p className="text-amber-100">{editableContent.subtitle}</p>
          )}
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">您的职业发展之旅</h2>
            {isEditable ? (
              <input
                type="text"
                value={editableContent.skillsDescription}
                onChange={(e) => handleContentEdit('skillsDescription', null, e.target.value)}
                className="text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-4"
              />
            ) : (
              <p className="text-amber-700 mb-4">{editableContent.skillsDescription}</p>
            )}
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
                      onClick={() => saveToBackend(new Blob([documentContent], { type: 'text/plain' }), 'pdf')}
                      disabled={isDownloading}
                      variant="outline"
                      className="border-amber-500 text-amber-500 hover:bg-amber-50"
                    >
                      <FileDown className="mr-2 h-4 w-4" />
                      下载 PDF
                    </Button>
                    <Button
                      onClick={() => saveToBackend(new Blob([documentContent], { type: 'text/plain' }), 'docx')}
                      disabled={isDownloading}
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
                  onCancel={handleUploadCancel}
                  onConfirm={handleUploadConfirm}
                  isLoading={isGenerating}
                />
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
                    {isEditable ? (
                      <input
                        type="text"
                        value={path.name}
                        onChange={(e) => {
                          const newPath = careerPaths.map(p => p.id === path.id ? { ...p, name: e.target.value } : p);
                          setEditableContent(prev => ({ ...prev, careerPaths: newPath }));
                        }}
                        className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    ) : (
                      <h3 className="font-semibold text-amber-800">{path.name}</h3>
                    )}
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
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={editableContent.skillsTitle}
                            onChange={(e) => handleContentEdit('skillsTitle', null, e.target.value)}
                            className="text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value={editableContent.skillsDescription}
                            onChange={(e) => handleContentEdit('skillsDescription', null, e.target.value)}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-amber-800">{editableContent.skillsTitle}</CardTitle>
                          <CardDescription className="text-amber-600">{editableContent.skillsDescription}</CardDescription>
                        </>
                      )}
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
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={editableContent.skillsTitle}
                            onChange={(e) => handleContentEdit('skillsTitle', null, e.target.value)}
                            className="text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value={editableContent.skillsDescription}
                            onChange={(e) => handleContentEdit('skillsDescription', null, e.target.value)}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-amber-800">{editableContent.skillsTitle}</CardTitle>
                          <CardDescription className="text-amber-600">{editableContent.skillsDescription}</CardDescription>
                        </>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-amber-700">
                        {selectedPath === 'technical' && (
                          <>
                            {editableContent.technicalSkills.map((skill, index) => (
                              <li key={index}>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleContentEdit('technicalSkills', index, e.target.value)}
                                    className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                ) : skill}
                              </li>
                            ))}
                          </>
                        )}
                        {selectedPath === 'management' && (
                          <>
                            {editableContent.managementSkills.map((skill, index) => (
                              <li key={index}>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleContentEdit('managementSkills', index, e.target.value)}
                                    className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                ) : skill}
                              </li>
                            ))}
                          </>
                        )}
                        {selectedPath === 'project' && (
                          <>
                            {editableContent.projectSkills.map((skill, index) => (
                              <li key={index}>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={skill}
                                    onChange={(e) => handleContentEdit('projectSkills', index, e.target.value)}
                                    className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                  />
                                ) : skill}
                              </li>
                            ))}
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="training">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardHeader>
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={editableContent.trainingTitle}
                            onChange={(e) => handleContentEdit('trainingTitle', null, e.target.value)}
                            className="text-xl font-semibold text-amber-800 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value={editableContent.trainingDescription}
                            onChange={(e) => handleContentEdit('trainingDescription', null, e.target.value)}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <CardTitle className="text-amber-800">{editableContent.trainingTitle}</CardTitle>
                          <CardDescription className="text-amber-600">{editableContent.trainingDescription}</CardDescription>
                        </>
                      )}
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="internal-training">
                          {isEditable ? (
                            <input
                              type="text"
                              value={editableContent.internalTrainingTitle}
                              onChange={(e) => handleContentEdit('internalTrainingTitle', null, e.target.value)}
                              className="w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none"
                            />
                          ) : (
                            <AccordionTrigger className="text-amber-700 hover:text-amber-800">
                              {editableContent.internalTrainingTitle}
                            </AccordionTrigger>
                          )}
                          <AccordionContent className="text-amber-600">
                            <ul className="list-disc list-inside space-y-1">
                              {editableContent.internalTraining.map((item, index) => (
                                <li key={index}>
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={item}
                                      onChange={(e) => handleContentEdit('internalTraining', index, e.target.value)}
                                      className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                  ) : item}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="external-courses">
                          {isEditable ? (
                            <input
                              type="text"
                              value={editableContent.externalCoursesTitle}
                              onChange={(e) => handleContentEdit('externalCoursesTitle', null, e.target.value)}
                              className="w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none"
                            />
                          ) : (
                            <AccordionTrigger className="text-amber-700 hover:text-amber-800">
                              {editableContent.externalCoursesTitle}
                            </AccordionTrigger>
                          )}
                          <AccordionContent className="text-amber-600">
                            <ul className="list-disc list-inside space-y-1">
                              {editableContent.externalCourses.map((item, index) => (
                                <li key={index}>
                                  {isEditable ? (
                                    <input
                                      type="text"
                                      value={item}
                                      onChange={(e) => handleContentEdit('externalCourses', index, e.target.value)}
                                      className="w-full p-1 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                  ) : item}
                                </li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="mentorship">
                          {isEditable ? (
                            <input
                              type="text"
                              value={editableContent.mentorshipTitle}
                              onChange={(e) => handleContentEdit('mentorshipTitle', null, e.target.value)}
                              className="w-full p-2 text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none"
                            />
                          ) : (
                            <AccordionTrigger className="text-amber-700 hover:text-amber-800">
                              {editableContent.mentorshipTitle}
                            </AccordionTrigger>
                          )}
                          <AccordionContent className="text-amber-600">
                            {isEditable ? (
                              <textarea
                                value={editableContent.mentorship}
                                onChange={(e) => handleContentEdit('mentorship', null, e.target.value)}
                                className="w-full p-2 border rounded bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                rows={3}
                              />
                            ) : (
                              <p>{editableContent.mentorship}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>
          )}

          <section className="mb-8">
            {isEditable ? (
              <input
                type="text"
                value={editableContent.nextStepsTitle}
                onChange={(e) => handleContentEdit('nextStepsTitle', null, e.target.value)}
                className="text-2xl font-semibold text-amber-800 mb-4 bg-transparent border-b border-amber-200 focus:outline-none w-full"
              />
            ) : (
              <h2 className="text-2xl font-semibold text-amber-800 mb-4">{editableContent.nextStepsTitle}</h2>
            )}
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center">
                    <Briefcase className="w-8 h-8 text-amber-500 mr-4" />
                    <div>
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value={editableContent.discussionTitle}
                            onChange={(e) => handleContentEdit('discussionTitle', null, e.target.value)}
                            className="text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value={editableContent.discussionDescription}
                            onChange={(e) => handleContentEdit('discussionDescription', null, e.target.value)}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-amber-700">{editableContent.discussionTitle}</h3>
                          <p className="text-amber-600">{editableContent.discussionDescription}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-0.5 h-6 bg-amber-300 ml-4"></div>
                  <div className="flex items-center">
                    <GraduationCap className="w-8 h-8 text-amber-500 mr-4" />
                    <div>
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value="制定学习计划"
                            onChange={(e) => {}}
                            className="text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value="根据您的职业目标，选择相应的培训课程和发展机会"
                            onChange={(e) => {}}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-amber-700">制定学习计划</h3>
                          <p className="text-amber-600">根据您的职业目标，选择相应的培训课程和发展机会</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-0.5 h-6 bg-amber-300 ml-4"></div>
                  <div className="flex items-center">
                    <LineChart className="w-8 h-8 text-amber-500 mr-4" />
                    <div>
                      {isEditable ? (
                        <>
                          <input
                            type="text"
                            value="定期回顾与调整"
                            onChange={(e) => {}}
                            className="text-lg font-semibold text-amber-700 bg-transparent border-b border-amber-200 focus:outline-none w-full mb-2"
                          />
                          <input
                            type="text"
                            value="每季度评估您的进展，并根据需要调整您的发展计划"
                            onChange={(e) => {}}
                            className="text-amber-600 bg-transparent border-b border-amber-200 focus:outline-none w-full"
                          />
                        </>
                      ) : (
                        <>
                          <h3 className="text-lg font-semibold text-amber-700">定期回顾与调整</h3>
                          <p className="text-amber-600">每季度评估您的进展，并根据需要调整您的发展计划</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-end">
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              开始我的职业规划
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CareerPlanning