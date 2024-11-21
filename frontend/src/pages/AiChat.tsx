"use client"

import * as React from "react"
import { Bot, FileText, HelpCircle, MessageSquare, Send, Upload, Loader2 } from "lucide-react"
import DocumentUpload from "./DocumentUpload"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { API_BASE_URL } from "@/config/constants"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatResponse {
  response: string
}

interface UploadResponse {
  urls: string[]
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  originalFile?: File;
}

const models = [
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "最强大的GPT-4模型，支持高级推理和创作",
    category: "OpenAI"
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4 Mini",
    description: "GPT-4的轻量版本，响应更快",
    category: "OpenAI"
  },
  {
    id: "qwen-77b",
    name: "Qwen 7B Chat",
    description: "通义千问-7B聊天模型，中英双语优化",
    category: "Siliconflow"
  },
  {
    id: "grok-beta",
    name: "Grok Beta",
    description: "具有实时互联网访问能力的新型对话模型",
    category: "Other"
  }
]

const convertUploadedFilesToFiles = (uploadedFiles: UploadedFile[]): File[] => {
  return uploadedFiles.map(uploadedFile => {
    if (uploadedFile.originalFile) {
      return uploadedFile.originalFile;
    }
    // Fallback in case originalFile is not available
    return new File(
      [new ArrayBuffer(0)],
      uploadedFile.name,
      {
        type: uploadedFile.type || 'application/octet-stream',
        lastModified: Date.now(),
      }
    );
  });
};

export default function Component() {
  const [messages, setMessages] = React.useState<Message[]>([])
  const [input, setInput] = React.useState("")
  const [mode, setMode] = React.useState("chat")
  const [selectedModel, setSelectedModel] = React.useState<string>(models[0].id)
  const [loading, setLoading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [showUploadDialog, setShowUploadDialog] = React.useState(false)
  const [uploadedUrls, setUploadedUrls] = React.useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = React.useState<FileList | null>(null)
  const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([])
  const [documentUrls, setDocumentUrls] = React.useState<string[]>([])
  const [showUpload, setShowUpload] = React.useState(false)
  const [hasCompletedConversation, setHasCompletedConversation] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files)
  }
  const token=localStorage.getItem('token')
  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return

    if (!token) {
      toast({
        title: "认证错误",
        description: "请先登录后再上传文件",
        variant: "destructive",
      })
      return;
    }

    setUploadProgress(0)
    const formData = new FormData()
    
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('files', selectedFiles[i])
    }

    try {
      const response = await fetch(`http://localhost:8001/api/chatbot/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Upload failed');
      }

      const data = await response.json()
      setUploadedUrls(prev => [...prev, ...data.urls]);
      
      // Add system message about the uploaded document
      setMessages(prev => [...prev, 
        { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
      ]);
      
      toast({
        title: "上传成功",
        description: "文档已成功上传，您可以开始提问了",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "文档上传失败，请重试",
        variant: "destructive",
      })
    } finally {
      setUploadProgress(100)
      setShowUploadDialog(false)
      setSelectedFiles(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setLoading(true);

    try {
      const { response } = await fetch(`http://localhost:8001/api/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ query: input, model_name: selectedModel, document_urls: uploadedUrls }),
      }).then(res => res.ok ? res.json() : Promise.reject(`Error: ${res.status}`));
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error(error);
      toast({ title: "发送失败", description: "请重试", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadConfirm = async (files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`http://localhost:8001/api/chatbot/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`上传失败: ${errorText}`);
      }

      const data = await response.json();
      setUploadedUrls(prev => [...prev, ...data.urls]);
      setMessages(prev => [...prev, 
        { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
      ]);
      toast({
        title: "上传成功",
        description: "文档已上传并处理完成",
      });
      setShowUpload(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "文档上传失败，请重试",
        variant: "destructive",
      });
    }
  };

  const handleUploadComplete = (uploadedFiles: UploadedFile[]) => {
    const files = uploadedFiles.map(f => f.originalFile).filter((f): f is File => f !== undefined);
    if (files.length > 0) {
      setMessages(prev => [...prev, 
        { role: 'assistant', content: '文档上传成功！我已经阅读了文档内容，您可以开始提问了。' }
      ]);
      toast({
        title: "上传成功",
        description: "文档已上传并处理完成",
      });
      setShowUpload(false);
    }
  };

  return (
    <div className="flex min-h-screen w-screen flex-col bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="w-full p-6">
        <div className="flex w-full gap-6">
          <div className="w-[300px] flex flex-col bg-white rounded-xl shadow-lg">
            <div className="w-full">
              <h2 className="mb-2 text-lg font-semibold">选择模型</h2>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="grid gap-2 p-2">
                    {Object.entries(
                      models.reduce((acc, model) => {
                        if (!acc[model.category]) {
                          acc[model.category] = [] as typeof models
                        }
                        acc[model.category].push(model)
                        return acc
                      }, {} as Record<string, typeof models>)
                    ).map(([category, categoryModels]) => (
                      <div key={category}>
                        <div className="mb-2 text-sm font-semibold text-muted-foreground">{category}</div>
                        {categoryModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex flex-col gap-1">
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-muted-foreground">{model.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            </div>
            <div className="p-4">
              <Label className="mb-2 block text-lg font-semibold">模式选择</Label>
              <RadioGroup defaultValue="chat" onValueChange={setMode}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="chat" id="chat" />
                  <Label htmlFor="chat">问答模式</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="quiz" id="quiz" />
                  <Label htmlFor="quiz">答题模式</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex-1">
              <Tabs defaultValue="chat" className="h-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chat">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    聊天
                  </TabsTrigger>
                  <TabsTrigger value="docs">
                    <FileText className="mr-2 h-4 w-4" />
                    文档
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="h-[calc(100%-40px)]">
                  <Card className="h-full">
                    <CardHeader>
                      <CardTitle>聊天记录</CardTitle>
                      <CardDescription>与AI助手的对话历史</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        {messages.map((message, index) => (
                          <div
                            key={index}
                            className={`mb-4 flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                          >
                            <div
                              className={`rounded-lg px-4 py-2 ${
                                message.role === "assistant"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-orange-500 text-white"
                              }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="docs">
                  <Card>
                    <CardHeader>
                      <CardTitle>文档管理</CardTitle>
                      <CardDescription>上传并管理参考文档</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200">
                            <Upload className="mr-2 h-4 w-4" />
                            上传文档
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200">
                          <DialogHeader>
                            <DialogTitle className="text-amber-800">上传文档</DialogTitle>
                            <DialogDescription className="text-amber-700">
                              选择要上传的文档文件。支持PDF、Word、PPT、TXT等格式。
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4">
                            <div className="grid gap-2">
                              <Input
                                ref={fileInputRef}
                                id="files"
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                                onChange={handleFileChange}
                                className="bg-white border-2 border-dashed border-amber-200 hover:border-amber-300 cursor-pointer"
                              />
                            </div>
                            {uploadProgress > 0 && (
                              <Progress value={uploadProgress} className="bg-amber-100" />
                            )}
                            <Button onClick={handleFileUpload} className="mt-4 bg-amber-500 text-white hover:bg-amber-600">
                              确认上传
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="flex-1">
            <Card className="h-[calc(100vh-6rem)]">
              <CardHeader className="pb-4">
                <CardTitle>AI 智能助手</CardTitle>
                <CardDescription>
                  直接开始对话，或上传文档以获得更精准的回答
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col h-[calc(100vh-12rem)]">
                <ScrollArea className="flex-1 pr-4">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                      <Bot className="h-12 w-12 mb-4 text-amber-500" />
                      <p className="text-center mb-2">您可以：</p>
                      <ul className="text-sm space-y-2">
                        <li className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-2 text-amber-500" />
                          直接输入问题开始对话
                        </li>
                        <li>
                          <Dialog open={showUpload} onOpenChange={setShowUpload}>
                            <DialogTrigger asChild>
                              <div className="flex items-center cursor-pointer hover:text-amber-600">
                                <Upload className="h-4 w-4 mr-2 text-amber-500" />
                                上传文档获得更精准的回答
                              </div>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>上传文档</DialogTitle>
                                <DialogDescription>
                                  上传文档后，AI 将根据文档内容为您提供更精准的回答。
                                </DialogDescription>
                              </DialogHeader>
                              <DocumentUpload 
                                onUploadComplete={(uploadedFiles) => {
                                  const files = uploadedFiles.map(f => f.originalFile).filter((f): f is File => !!f);
                                  if (files.length > 0) {
                                    handleUploadConfirm(files);
                                  }
                                  setShowUpload(false);
                                }}
                                maxFileSize={20 * 1024 * 1024}
                                acceptedFileTypes={['.doc', '.docx', '.pdf', '.txt', '.md']}
                                hasCompletedConversation={hasCompletedConversation}
                              />
                            </DialogContent>
                          </Dialog>
                        </li>
                      </ul>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`mb-4 flex ${
                            message.role === "assistant" ? "justify-start" : "justify-end"
                          }`}
                        >
                          <div
                            className={`rounded-lg px-4 py-2 max-w-[80%] ${
                              message.role === "assistant"
                                ? "bg-muted text-muted-foreground"
                                : "bg-amber-500 text-white"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                            <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>
                <div className="mt-4">
                  {/* Upload button */}
                  <Dialog open={showUpload} onOpenChange={setShowUpload}>
                    
                    <DialogContent>
                      
                      <DocumentUpload 
                        onUploadComplete={handleUploadComplete}
                        maxFileSize={20 * 1024 * 1024}
                        acceptedFileTypes={['.doc', '.docx', '.pdf', '.txt', '.md']}
                        onCancel={() => setShowUpload(false)}
                      />
                    </DialogContent>
                  </Dialog>
                  
                  {/* Chat input */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="输入您的问题..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      disabled={loading}
                    />
                    <Button onClick={handleSend} disabled={loading || !input.trim()}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            {uploadedUrls.length > 0 && (
              <div className="p-4 border-t">
                <h2 className="mb-2 text-lg font-semibold">已上传文件</h2>
                <div className="space-y-2">
                  {uploadedUrls.map((url, index) => {
                    const fileName = decodeURIComponent(url.split('/').pop() || '');
                    return (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span className="text-sm truncate flex-1" title={fileName}>
                          {fileName}
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          查看
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}