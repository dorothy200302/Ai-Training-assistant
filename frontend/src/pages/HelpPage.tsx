import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle, Book, FileText, Settings, Users, Mail, MessageCircle, Phone,  Video, BookOpen, Lightbulb, FileQuestion } from 'lucide-react'

export default function HelpPage() {
    return (
      <div className="min-h-screen w-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="w-screen bg-white shadow-lg">
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <HelpCircle className="h-12 w-12 text-amber-600" />
          <h1 className="text-3xl font-bold text-amber-900">帮助中心</h1>
          <p className="text-amber-600 max-w-2xl">
            欢迎来到帮助中心。您可以在这里找到关于使用我们平台的详细指南和常见问题解答。
          </p>
         
        </div>

        <Tabs defaultValue="guide" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="guide">使用指南</TabsTrigger>
            <TabsTrigger value="faq">常见问题</TabsTrigger>
            <TabsTrigger value="video">视频教程</TabsTrigger>
            <TabsTrigger value="contact">联系我们</TabsTrigger>
          </TabsList>

          <TabsContent value="guide">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Book className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">新手入门</h2>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>如何开始使用？</AccordionTrigger>
                      <AccordionContent>
                        首先，您需要注册一个账号。注册完成后，您可以浏览我们的模板库，选择适合的模板开始创建您的培训文档。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>如何选择合适的模板？</AccordionTrigger>
                      <AccordionContent>
                        我们提供了多种类型的模板，包括基础培训、专业培训和互动培训模板。您可以根据培训内容和目标选择合适的模板。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>如何保存和导出文档？</AccordionTrigger>
                      <AccordionContent>
                        系统会自动保存您的编辑内容。完成编辑后，点击"导出"按钮，选择导出格式（PPT、PDF等）即可下载文档。
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">文档编辑</h2>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>如何编辑文档内容？</AccordionTrigger>
                      <AccordionContent>
                        在编辑界面中，您可以直接点击需要修改的文本进行编辑。使用工具栏中的功能可以调整文本格式、添加图片等。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>如何插入多媒体内容？</AccordionTrigger>
                      <AccordionContent>
                        点击工具栏中的"插入"按钮，您可以添加图片、视频、音频等多媒体内容。支持直接拖拽文件到编辑区域。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>如何设置页面样式？</AccordionTrigger>
                      <AccordionContent>
                        在右侧的样式面板中，您可以调整字体、颜色、布局等样式设置。系统提供多种预设主题供选择。
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">高级功能</h2>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>如何使用AI辅助功能？</AccordionTrigger>
                      <AccordionContent>
                        在编辑器中输入关键词或描述，AI将自动为您生成相关内容建议。您可以选择采用或修改AI生成的内容。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>如何进行协作编辑？</AccordionTrigger>
                      <AccordionContent>
                        点击文档右上角的"分享"按钮，您可以邀请其他用户协作编辑文档。支持实时多人在线编辑。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>如何管理文档版本？</AccordionTrigger>
                      <AccordionContent>
                        系统自动保存文档的历史版本。在"版本历史"中，您可以查看和恢复之前的版本。
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">账户管理</h2>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>如何管理团队成员？</AccordionTrigger>
                      <AccordionContent>
                        在"团队管理"页面，您可以添加、删除团队成员，并设置不同的权限级别。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>如何升级账户？</AccordionTrigger>
                      <AccordionContent>
                        在"账户设置"中选择"升级账户"，选择适合的套餐并完成支付即可升级。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>如何管理订阅？</AccordionTrigger>
                      <AccordionContent>
                        在"账户设置"的"订阅管理"部分，您可以查看当前订阅状态、更改套餐或取消订阅。
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="faq">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  <div className="flex items-center gap-3">
                    <FileQuestion className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">常见问题解答</h2>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>支持哪些文件格式？</AccordionTrigger>
                      <AccordionContent>
                        我们支持导出为PPT、PDF、Word等多种格式。导入支持PPT、PDF、Word、图片等常见格式。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>如何找回密码？</AccordionTrigger>
                      <AccordionContent>
                        在登录页面点击"忘记密码"，输入您的注册邮箱，按照邮件提示重置密码即可。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>文档有大小限制吗？</AccordionTrigger>
                      <AccordionContent>
                        免费用户单个文档最大支持100MB，高级用户最大支持1GB。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4">
                      <AccordionTrigger>支持离线使用吗？</AccordionTrigger>
                      <AccordionContent>
                        目前需要联网使用。我们计划在未来版本中添加离线编辑功能。
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-5">
                      <AccordionTrigger>如何确保文档安全？</AccordionTrigger>
                      <AccordionContent>
                        我们使用高级加密技术保护您的文档，并提供文档访问权限控制功能。
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Video className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">基础教程</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors">
                      <BookOpen className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">新手入门指南</h3>
                        <p className="text-sm text-amber-600">5分钟 · 平台基础功能介绍</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors">
                      <FileText className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">文档编辑基础</h3>
                        <p className="text-sm text-amber-600">8分钟 · 内容编辑与格式设置</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors">
                      <Lightbulb className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">模板使用技巧</h3>
                        <p className="text-sm text-amber-600">6分钟 · 模板选择与自定义</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Settings className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">进阶教程</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg hover:bg-amber-50 transition-colors">
                      <Settings className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">高级功能教程</h3>
                        <p className="text-sm text-amber-600">10分钟 · AI辅助与协作功能</p>
                      </div>
                    </div>
                    <div className="flex items--50 transition-colors">
                      <Users className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">团队协作指南</h3>
                        <p className="text-sm text-amber-600">7分钟 · 多人协作与权限管理</p>
                      </div>
                    </div>
                    <div className="flex items--50 transition-colors">
                      <FileText className="h-5 w-5 text-amber-600 mt-1" />
                      <div>
                        <h3 className="font-medium">文档导出教程</h3>
                        <p className="text-sm text-amber-600">4分钟 · 多格式导出与分享</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="contact">
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <Mail className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold">电子邮件</h3>
                    <p className="text-sm text-amber-600">support@example.com</p>
                    <Button variant="outline" className="w-full">
                      发送邮件
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <MessageCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold">在线客服</h3>
                    <p className="text-sm text-amber-600">工作时间: 9:00-18:00</p>
                    <Button variant="outline" className="w-full">
                      开始对话
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="p-3 bg-amber-100 rounded-full">
                      <Phone className="h-6 w-6 text-amber-600" />
                    </div>
                    <h3 className="font-semibold">电话支持</h3>
                    <p className="text-sm text-amber-600">400-123-4567</p>
                    <Button variant="outline" className="w-full">
                      拨打电话
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-6 w-6 text-amber-600" />
                    <h2 className="text-xl font-semibold">反馈建议</h2>
                  </div>
                  <p className="text-amber-600">
                    我们非常重视您的意见和建议。如果您在使用过程中遇到任何问题，或有任何改进建议，请随时与我们联系。
                  </p>
                  <div className="grid gap-4">
                    <Input
                      placeholder="您的邮箱"
                      className="border-amber-200 focus:border-amber-400"
                    />
                    <Input
                      placeholder="主题"
                      className="border-amber-200 focus:border-amber-400"
                    />
                    <textarea
                      placeholder="请详细描述您的问题或建议..."
                      className="w-full h-32 px-3 py-2 rounded-md border border-amber-200 focus:border-amber-400 focus:outline-none resize-none"
                    />
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                      提交反馈
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}