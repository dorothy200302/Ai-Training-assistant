import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog"
import { Button } from "./button"
import { Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DocumentUploadProps {
  onUploadComplete?: (files: File[]) => void
  onConfirm?: (files: File[]) => void
  onUpload?: (uploadSuccess: boolean, files?: File[]) => Promise<void>
  onCancel?: () => void
  disabled?: boolean
  maxFileSize?: number
  acceptedFileTypes?: string[]
  hasCompletedConversation?: boolean
}

export function DocumentUpload({
  onUploadComplete,
  onConfirm,
  onUpload,
  onCancel,
  disabled,
  maxFileSize = 20 * 1024 * 1024, // 20MB default
  acceptedFileTypes = ['.doc', '.docx', '.pdf', '.txt', '.md'],
}: DocumentUploadProps) {
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([])
  const [dragActive, setDragActive] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files))
    }
  }

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const isValidType = acceptedFileTypes.some(type => 
        file.name.toLowerCase().endsWith(type.toLowerCase())
      )
      const isValidSize = file.size <= maxFileSize

      return isValidType && isValidSize
    })

    setSelectedFiles(prevFiles => [...prevFiles, ...validFiles])
    onUploadComplete?.(validFiles)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
  }

  const handleButtonClick = () => {
    inputRef.current?.click()
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
          <DialogDescription>
            选择要上传的文档以获得更精准的回答
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div
            className={cn(
              "flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer",
              dragActive ? "border-amber-500 bg-amber-50" : "border-gray-300",
              "hover:bg-gray-50 transition-colors"
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={handleButtonClick}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={handleChange}
              accept={acceptedFileTypes.join(",")}
              className="hidden"
            />
            <Upload className="w-10 h-10 mb-3 text-gray-400" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">点击上传</span> 或拖拽文件到这里
            </p>
            <p className="text-xs text-gray-500">
              支持的文件类型: {acceptedFileTypes.join(", ")}
            </p>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">已选择的文件:</h4>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button
                variant="ghost"
                onClick={onCancel}
                disabled={disabled}
              >
                取消
              </Button>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                if (onUpload) {
                  await onUpload(true, selectedFiles);
                } else if (onConfirm) {
                  onConfirm(selectedFiles);
                }
              }}
              disabled={selectedFiles.length === 0 || disabled}
            >
              确认上传
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
