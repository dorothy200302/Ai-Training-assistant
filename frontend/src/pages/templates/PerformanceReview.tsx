import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, User, FileDown } from 'lucide-react'
import { EditableText } from '@/components/EditableText'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { toast } from "@/hooks/use-toast"
import { API_BASE_URL } from "../../config/constants"

const saveToBackend = async (fileBlob: Blob, fileType: 'docx', filename: string) => {
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

    const content = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Content = base64String.split(',')[1] || base64String;
        resolve(base64Content);
      };
      reader.readAsDataURL(fileBlob);
    });

    const response = await fetch(`${API_BASE_URL}/api/storage/download_document`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content,
        format: fileType,
        filename: filename,
        isBase64: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.detail === 'Token not found or expired') {
        localStorage.removeItem('token');
        toast({
          title: "认证过期",
          description: "请重新登录",
          variant: "destructive",
        });
        throw new Error('认证过期');
      }
      throw new Error(errorData?.detail || '保存到后端失败');
    }
  } catch (error) {
    console.error('Save to backend error:', error);
    toast({
      title: "保存失败",
      description: error instanceof Error ? error.message : "文档保存失败，请重试",
      variant: "destructive",
    });
  }
};

const handleDownloadWord = async (pageTexts: PageTexts, overallRating: number) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: pageTexts.title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "员工信息",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun(`姓名：${pageTexts.employeeName}`)]
          }),
          new Paragraph({
            children: [new TextRun(`职位：${pageTexts.position}`)]
          }),
          new Paragraph({
            children: [new TextRun(`部门：${pageTexts.department}`)]
          }),
          new Paragraph({
            children: [new TextRun(`入职日期：${pageTexts.joinDate}`)],
            spacing: { after: 200 }
          }),
          new Paragraph({
            text: "目标完成情况",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),
          ...pageTexts.goals.flatMap(goal => [
            new Paragraph({
              children: [new TextRun(goal.title)]
            }),
            new Paragraph({
              children: [new TextRun(`完成度：${goal.progress}%`)],
              spacing: { after: 200 }
            })
          ]),
          new Paragraph({
            text: "总体评分",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 }
          }),
          new Paragraph({
            children: [new TextRun(`${overallRating}/5`)]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    
    // 下载文档
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '员工绩效评估.docx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    // 保存到后端
    await saveToBackend(blob, 'docx', '员工绩效评估');
    
    toast({
      title: "下载成功",
      description: "文档已下载为Word格式",
    });
  } catch (error) {
    console.error('Word generation error:', error);
    toast({
      title: "生成Word文档失败",
      description: error instanceof Error ? error.message : "Word文档生成失败，请重试",
      variant: "destructive",
    });
  }
};

interface PageTexts {
  title: string;
  subtitle: string;
  employeeName: string;
  position: string;
  department: string;
  joinDate: string;
  goals: {
    title: string;
    progress: number;
  }[];
}

const PerformanceReview: React.FC = () => {
  const [completedSections] = useState<string[]>([])
  const [overallRating, setOverallRating] = useState<number>(3)
  const [pageTexts, setPageTexts] = useState<PageTexts>({
    title: '员工绩效评估',
    subtitle: '年度绩效回顾与发展规划',
    employeeName: '张三',
    position: '高级软件工程师',
    department: '研发部',
    joinDate: '2023-01-01',
    goals: [
      {
        title: '目标1：提高代码质量',
        progress: 80
      },
      {
        title: '目标2：参与新产品开发',
        progress: 100
      },
      {
        title: '目标3：提升团队协作能力',
        progress: 90
      }
    ]
  })

  const sections = [
    { id: 'goals', title: '目标完成情况' },
    { id: 'skills', title: '技能评估' },
    { id: 'feedback', title: '反馈与建议' },
    { id: 'development', title: '发展计划' },
  ]

  const calculateProgress = () => {
    return (completedSections.length / sections.length) * 100
  }

  const updateText = (key: keyof PageTexts, value: string) => {
    setPageTexts(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-screen bg-white shadow-lg">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            <EditableText
              value={pageTexts.title}
              onChange={(value) => updateText('title', value)}
              className="text-white"
            />
          </h1>
          <p className="text-amber-100">
            <EditableText
              value={pageTexts.subtitle}
              onChange={(value) => updateText('subtitle', value)}
              className="text-amber-100"
            />
          </p>
        </div>
        
        <div className="p-6">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">员工信息</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6 flex items-center space-x-4">
                <div className="bg-amber-100 rounded-full p-3">
                  <User className="w-12 h-12 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-800">
                    <EditableText
                      value={pageTexts.employeeName}
                      onChange={(value) => updateText('employeeName', value)}
                    />
                  </h3>
                  <p className="text-amber-600">职位：
                    <EditableText
                      value={pageTexts.position}
                      onChange={(value) => updateText('position', value)}
                    />
                  </p>
                  <p className="text-amber-600">部门：
                    <EditableText
                      value={pageTexts.department}
                      onChange={(value) => updateText('department', value)}
                    />
                  </p>
                  <p className="text-amber-600">入职时间：
                    <EditableText
                      value={pageTexts.joinDate}
                      onChange={(value) => updateText('joinDate', value)}
                    />
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">评估内容</h2>
            <Tabs defaultValue="goals" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-amber-100">
                {sections.map((section) => (
                  <TabsTrigger key={section.id} value={section.id} className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value="goals">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">目标完成情况</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {pageTexts.goals.map((goal, index) => (
                        <div key={index}>
                          <Label className="text-amber-700">
                            <EditableText
                              value={goal.title}
                              onChange={(value) => {
                                const newGoals = [...pageTexts.goals];
                                newGoals[index] = { ...goal, title: value };
                                setPageTexts(prev => ({ ...prev, goals: newGoals }));
                              }}
                            />
                          </Label>
                          <Progress value={goal.progress} className="w-full bg-amber-200 mt-2" indicatorClassName="bg-amber-500" />
                          <div className="flex items-center mt-1">
                            <p className="text-sm text-amber-600 mr-2">完成度：{goal.progress}%</p>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={goal.progress}
                              onChange={(e) => {
                                const newGoals = [...pageTexts.goals];
                                newGoals[index] = { ...goal, progress: Number(e.target.value) };
                                setPageTexts(prev => ({ ...prev, goals: newGoals }));
                              }}
                              className="w-16 px-2 py-1 text-sm border rounded border-amber-300 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="skills">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">技能评估</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-amber-700">技术能力</Label>
                        <Slider
                          defaultValue={[4]}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-amber-600 mt-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-700">沟通能力</Label>
                        <Slider
                          defaultValue={[3]}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-amber-600 mt-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      </div>
                      <div>
                        <Label className="text-amber-700">团队协作</Label>
                        <Slider
                          defaultValue={[5]}
                          max={5}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-amber-600 mt-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                          <span>5</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="feedback">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">反馈与建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="strengths" className="text-amber-700">优点</Label>
                        <Textarea
                          id="strengths"
                          placeholder="请输入员工的点..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="improvements" className="text-amber-700">需要改进的地方</Label>
                        <Textarea
                          id="improvements"
                          placeholder="请输入需要改进的地方..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="suggestions" className="text-amber-700">建议</Label>
                        <Textarea
                          id="suggestions"
                          placeholder="请输入对员工的建议..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="development">
                <Card className="bg-amber-50 border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-800">发展计划</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="shortTerm" className="text-amber-700">短期目标（6个月内）</Label>
                        <Textarea
                          id="shortTerm"
                          placeholder="请输入短期发展目标..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="longTerm" className="text-amber-700">长期目标（1-2年）</Label>
                        <Textarea
                          id="longTerm"
                          placeholder="请输入长期发展目标..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="actionPlan" className="text-amber-700">行动计划</Label>
                        <Textarea
                          id="actionPlan"
                          placeholder="请输入实现目标的具体行动计划..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">总体评价</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-amber-700">整体表现评分</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Slider
                        value={[overallRating]}
                        onValueChange={(value: number[]) => setOverallRating(value[0])}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <span className="text-2xl font-bold text-amber-600">{overallRating}</span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-600 mt-1">
                      <span>需要改进</span>
                      <span>达到期望</span>
                      <span>超出期望</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-amber-700">评估结果</Label>
                    <RadioGroup defaultValue="meets" className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="exceeds" id="exceeds" className="text-amber-600" />
                        <Label htmlFor="exceeds" className="text-amber-700">超出期望</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="meets" id="meets" className="text-amber-600" />
                        <Label htmlFor="meets" className="text-amber-700">达到期望</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="needs-improvement" id="needs-improvement" className="text-amber-600" />
                        <Label htmlFor="needs-improvement" className="text-amber-700">需要改进</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div>
                    <Label htmlFor="summary" className="text-amber-700">总结评语</Label>
                    <Textarea
                      id="summary"
                      placeholder="请输入总结评语..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-amber-800 mb-4">评估进度</h2>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-amber-700 font-semibold">总体完成度</span>
                      <span className="text-amber-700 font-semibold">{calculateProgress().toFixed(0)}%</span>
                    </div>
                    <Progress value={calculateProgress()} className="w-full bg-amber-200" indicatorClassName="bg-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800 mb-2">已完成模块</h3>
                    <ul className="space-y-1 text-amber-700">
                      {completedSections.map(sectionId => {
                        const section = sections.find(s => s.id === sectionId)
                        return section ? (
                          <li key={sectionId} className="flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                            {section.title}
                          </li>
                        ) : null
                      })}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="flex justify-end space-x-4 mt-8">
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => handleDownloadWord(pageTexts, overallRating)}
            >
              <FileDown className="mr-2 h-4 w-4" />
              导出Word
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceReview