import React, { useState } from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Save } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const EditableText: React.FC<EditableTextProps> = ({ value, onChange, className }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState(value)

  const handleSave = () => {
    onChange(tempValue)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex gap-2 items-start">
        <Textarea
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          className={className}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="group relative">
      <span>{value}</span>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 absolute -right-8 top-0"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  )
} 