import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"
import { CheckCircle2, User, BarChart, Target, ThumbsUp, MessageSquare } from 'lucide-react'

const PerformanceReview: React.FC = () => {
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [overallRating, setOverallRating] = useState<number>(3)

  const sections = [
    { id: 'goals', title: '目标完成情况' },
    { id: 'skills', title: '技能评估' },
    { id: 'feedback', title: '反馈与建议' },
    { id: 'development', title: '发展计划' },
  ]

  const toggleSectionCompletion = (sectionId: string) => {
    setCompletedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const calculateProgress = () => {
    return (completedSections.length / sections.length) * 100
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-amber-400 to-orange-400 p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">员工绩效评估</h1>
          <p className="text-amber-100">年度绩效回顾与发展规划</p>
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
                  <h3 className="text-lg font-semibold text-amber-800">张三</h3>
                  <p className="text-amber-600">职位：高级软件工程师</p>
                  <p className="text-amber-600">部门：研发部</p>
                  <p className="text-amber-600">入职时间：2020年1月1日</p>
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
                      <div>
                        <Label className="text-amber-700">目标1：提高代码质量</Label>
                        <Progress value={80} className="w-full bg-amber-200 mt-2" indicatorClassName="bg-amber-500" />
                        <p className="text-sm text-amber-600 mt-1">完成度：80%</p>
                      </div>
                      <div>
                        <Label className="text-amber-700">目标2：参与新产品开发</Label>
                        <Progress value={100} className="w-full bg-amber-200 mt-2" indicatorClassName="bg-amber-500" />
                        <p className="text-sm text-amber-600 mt-1">完成度：100%</p>
                      </div>
                      <div>
                        <Label className="text-amber-700">目标3：提升团队协作能力</Label>
                        <Progress value={90} className="w-full bg-amber-200 mt-2" indicatorClassName="bg-amber-500" />
                        <p className="text-sm text-amber-600 mt-1">完成度：90%</p>
                      </div>
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
                          placeholder="请输入员工的���点..."
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

          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              className="border-amber-500 text-amber-600 hover:bg-amber-100"
              onClick={() => {
                // Handle save as draft logic
              }}
            >
              保存草稿
            </Button>
            <Button
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              onClick={() => {
                // Handle submit review logic
              }}
            >
              提交评估
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerformanceReview