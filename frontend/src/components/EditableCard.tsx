import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EditableText } from './EditableText';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableCardProps {
  title: string
  description?: string
  onTitleChange: (value: string) => void
  onDescriptionChange?: (value: string) => void
  onDelete?: () => void
  className?: string
  children?: React.ReactNode
  isEditing?: boolean
  onEdit: (newValue: string) => void
  extraButtons?: React.ReactNode
}

export const EditableCard: React.FC<EditableCardProps> = ({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  onDelete,
  className = "",
  children,
  extraButtons
}) => {
  return (
    <Card className={`group relative ${className}`}>
      <CardHeader>
        <CardTitle>
          <EditableText
            value={title}
            onChange={onTitleChange}
            className="text-amber-800"
          />
        </CardTitle>
        {description && onDescriptionChange && (
          <CardDescription>
            <EditableText
              value={description}
              onChange={onDescriptionChange}
              className="text-amber-600"
            />
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {onDelete && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
          onClick={onDelete}
        >
          <Trash className="h-4 w-4" />
        </Button>
      )}
      {extraButtons}
    </Card>
  )
}