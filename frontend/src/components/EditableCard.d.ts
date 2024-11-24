import React from 'react';
interface EditableCardProps {
    title: string;
    description?: string;
    onTitleChange: (value: string) => void;
    onDescriptionChange?: (value: string) => void;
    onDelete?: () => void;
    className?: string;
    children?: React.ReactNode;
    isEditing?: boolean;
    onEdit: (newValue: string) => void;
    extraButtons?: React.ReactNode;
}
export declare const EditableCard: React.FC<EditableCardProps>;
export {};
