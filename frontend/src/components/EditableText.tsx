import React, { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'

interface EditableTextProps {
  text?: string;
  value?: string;
  onChange?: (value: string) => void;
  setText?: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}

export const EditableText: React.FC<EditableTextProps> = ({
  text,
  value,
  onChange,
  setText,
  className = "",
  placeholder = "",
  multiline = false
}) => {
  const actualValue = value ?? text ?? "";
  const handleChange = (newValue: string) => {
    onChange?.(newValue);
    setText?.(newValue);
  };

  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(actualValue)

  const handleSave = () => {
    handleChange(tempValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempValue(actualValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex gap-2 items-start">
        {multiline ? (
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className={className}
            rows={3}
          />
        ) : (
          <Input
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className={className}
          />
        )}
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className={className}>{actualValue}</div>
      <Button
        size="sm"
        variant="ghost"
        className="absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
} 