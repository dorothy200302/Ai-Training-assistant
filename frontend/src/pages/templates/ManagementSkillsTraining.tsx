import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TemplateFileHandler from '@/components/TemplateFileHandler'

const ManagementSkillsTraining: React.FC = () => {
  const [title, setTitle] = useState("管理能力培训课程")
  const [subtitle, setSubtitle] = useState("提升您的领导力，成为卓越的管理者")
  const [overview, setOverview] = useState(
    "欢迎参加我们的管理能力培训课程！本课程旨在提升您的领导技能，帮助您成为一名更加高效、有影响力的管理者。通过一系列精心设计的模块，您将学习到现代管理所需的核心技能。"
  )

  const [modules, setModules] = useState<SkillModule[]>([
    {
      id: nanoid(),
      title: '有效沟通技巧',
      description: '掌握清晰、有效的沟通方法，提高团队协作效率',
      objectives: [
        "了解沟通的基本原理和重要性",
        "学习积极倾听技巧",
        "掌握非语言沟通的艺术",
        "提高书面沟通能力",
        "处理困难对话的策略"
      ],
      content: "本模块将帮助您掌握现代管理者必备的沟通技能...",
      completed: false
    },
    // ... 其他模块
  ])

  const [resources, setResources] = useState<ResourceType[]>([
    {
      id: nanoid(),
      title: '管理技能手册',
      type: 'pdf',
      link: '#',
      description: '请添加资源描述'
    },
    {
      id: nanoid(),
      title: '领导力视频课程',
      type: 'video',
      link: '#',
      description: '请添加资源描述'
    },
    {
      id: nanoid(),
      title: '案例研究集锦',
      type: 'case-study',
      link: '#',
      description: '请添加资源描述'
    }
  ])

  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({})
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const [showUpload, setShowUpload] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [documentContent, setDocumentContent] = useState<string>('');

  const managementSkills = [
    { id: 'leadership', name: '领导力', icon: <Users className="w-6 h-6" /> },
    { id: 'strategic', name: '战略思维', icon: <Target className="w-6 h-6" /> },
    { id: 'communication', name: '沟通技巧', icon: <MessageSquare className="w-6 h-6" /> },
  ]

  const handleAddModule = () => {
    setModules([...modules, {
      id: nanoid(),
      title: '新管理技能模块',
      description: '请编辑模块描述',
      objectives: ['新学习目标'],
      content: '请编辑模块内容',
      completed: false
    }])
  }

  const handleAddResourceType = (type: 'pdf' | 'video' | 'case-study') => {
    setResources([...resources, {
      id: nanoid(),
      title: '新学习资源',
      type,
      link: '#',
      description: '请添加资源描述'
    }])
  }

  const handleTitleEdit = (id: string, newValue: string) => {
    setModules(modules.map(module =>
      module.id === id ? { ...module, title: newValue } : module
    ))
  }

  const toggleEdit = (id: string) => {
    setIsEditing(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const handleUploadConfirm = async (uploadSuccess: boolean, files?: File[]) => {
    if (!uploadSuccess || !files || files.length === 0) {
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

      formData.append('template', 'management_skills');
      formData.append('description', JSON.stringify({
        title: '管理技能培训',
        subtitle: '提升您的管理能力',
        overview: '本文档将帮助您掌握卓越的管理技能。'
      }));

      console.log('Sending request to generate template...');
      console.log('FormData contents:', {
        files: files.map(f => f.name),
        template: 'management_skills',
        token: token ? 'present' : 'missing'
      });

      const response = await fetch('http://localhost:8001/storage/generate_full_doc_with_template/', {
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
      setDocumentContent(data.document || data.content || '');
      
      useToast({
        title: "生成成功",
        description: "管理技能培训文档已生成",
      });
    } catch (error) {
      console.error('Generation error:', error);
      useToast({
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

  const handleConfirm = () => {
    useToast({
      title: "确认成功",
      description: "您已确认阅读完成",
    });
  };

  const templateDescription = {
    title: title,
    subtitle: subtitle,
    overview: overview,
    content: documentContent
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <EditableText
            value={title}
            onChange={setTitle}
            className="text-3xl font-bold mb-2"
          />
          <EditableText
            value={subtitle}
            onChange={setSubtitle}
            className="text-amber-100"
          />
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">课程概述</h2>
            <EditableText
              value={overview}
              onChange={setOverview}
              multiline
              className="text-amber-700"
            />
          </section>

          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-amber-800">培训模块</h2>
              <Button
                onClick={handleAddModule}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Plus className="mr-2 h-4 w-4" /> 添加模块
              </Button>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {modules.map(module => (
                <AccordionItem key={module.id} value={module.id}>
                  <AccordionTrigger className="text-amber-700 hover:text-amber-800">
                    <div className="flex items-center gap-3">
                      {isEditing[module.id] ? (
                        <Input
                          value={module.title}
                          onChange={(e) => handleTitleEdit(module.id, e.target.value)}
                          onBlur={() => toggleEdit(module.id)}
                          autoFocus
                          className="max-w-[200px]"
                        />
                      ) : (
                        <span onClick={(e) => {
                          e.stopPropagation()
                          toggleEdit(module.id)
                        }}>
                          {module.title}
                        </span>
                      )}
                      <Button
                        variant="outline"
                        size="icon"
                        className={`rounded-full ${
                          module.completed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setModules(modules.map(m =>
                            m.id === module.id ? {...m, completed: !m.completed} : m
                          ))
                        }}
                      >
                        {module.completed ? <CheckCircle className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEdit(module.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const newId = nanoid();
                          setModules(
                            modules.map(m =>
                              m.id === module.id ? { ...m, id: newId } : m
                            )
                          );
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <EditableCard
                      title="模块详情"
                      description={module.description}
                      onEdit={() => {}}
                      onTitleChange={() => {}}
                      onDescriptionChange={(newDesc) => {
                        setModules(modules.map(m =>
                          m.id === module.id ? {...m, description: newDesc} : m
                        ))
                      }}
                      onDelete={() => setModules(modules.filter(m => m.id !== module.id))}
                      className="bg-amber-50 border-amber-200"
                    >
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-2">学习目标</h4>
                          {module.objectives.map((objective, index) => (
                            <EditableText
                              key={index}
                              value={objective}
                              onChange={(newObjective) => {
                                setModules(modules.map(m =>
                                  m.id === module.id
                                    ? {
                                        ...m,
                                        objectives: m.objectives.map((obj, i) =>
                                          i === index ? newObjective : obj
                                        )
                                      }
                                    : m
                                ))
                              }}
                              className="text-amber-700 mb-2"
                            />
                          ))}
                          <Button
                            onClick={() => {
                              setModules(modules.map(m =>
                                m.id === module.id
                                  ? {...m, objectives: [...m.objectives, '新学习目标']}
                                  : m
                              ))
                            }}
                            variant="outline"
                            size="sm"
                          >
                            <Plus className="h-4 w-4 mr-2" /> 添加目标
                          </Button>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-amber-800 mb-2">模块内容</h4>
                          <EditableText
                            value={module.content}
                            onChange={(newContent) => {
                              setModules(modules.map(m =>
                                m.id === module.id ? {...m, content: newContent} : m
                              ))
                            }}
                            multiline
                            className="text-amber-700"
                          />
                        </div>
                      </div>
                    </EditableCard>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-amber-800">学习资源</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAddResourceType('pdf')}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Book className="mr-2 h-4 w-4" /> 添加文档
                </Button>
                <Button
                  onClick={() => handleAddResourceType('video')}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <Video className="mr-2 h-4 w-4" /> 添加视频
                </Button>
                <Button
                  onClick={() => handleAddResourceType('case-study')}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <FileText className="mr-2 h-4 w-4" /> 添加案例
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {resources.map(resource => (
                <EditableCard
                  key={resource.id}
                  title={resource.title}
                  description={resource.description}
                  onTitleChange={(newTitle) => {
                    setResources(resources.map(r =>
                      r.id === resource.id ? {...r, title: newTitle} : r
                    ))
                  }}
                  onDescriptionChange={(newDesc) => {
                    setResources(resources.map(r =>
                      r.id === resource.id ? {...r, description: newDesc} : r
                    ))
                  }}
                  onDelete={() => setResources(resources.filter(r => r.id !== resource.id))}
                  onEdit={() => {}}
                  className="bg-orange-50 border-orange-200"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {resource.type === 'pdf' && <Book className="text-orange-500" />}
                      {resource.type === 'video' && <Video className="text-orange-500" />}
                      {resource.type === 'case-study' && <FileText className="text-orange-500" />}
                      <EditableText
                        value={resource.link}
                        onChange={(newLink) => {
                          setResources(resources.map(r =>
                            r.id === resource.id ? {...r, link: newLink} : r
                          ))
                        }}
                        className="text-orange-600 hover:text-orange-700"
                      />
                    </div>
                  </div>
                </EditableCard>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
            >
              <Save className="mr-2 h-4 w-4" /> 保存模板
            </Button>
            <Button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600"
            >
              <FileUp className="mr-2 h-4 w-4" /> 上传培训资料
            </Button>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <DocumentUpload 
              onConfirm={handleUploadConfirm}
              onCancel={handleUploadCancel}
              isLoading={isGenerating}
            />
          </div>
        </div>
      )}

      {/* Document Content Section */}
      {documentContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
            <div className="prose prose-amber max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {documentContent}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {documentContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <Button
              onClick={handleConfirm}
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              确认已阅读
            </Button>
          </div>
        </div>
      )}

      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <h1 className="text-2xl font-bold mb-4">{templateDescription.title}</h1>
            <p className="text-gray-600 mb-6">{templateDescription.overview}</p>

            <TemplateFileHandler
              templateId="management_skills"
              templateDescription={templateDescription}
              onContentGenerated={setDocumentContent}
            />

            {documentContent && (
              <div className="mt-6 p-4 border rounded-lg bg-white">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {documentContent}
                </ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManagementSkillsTraining;