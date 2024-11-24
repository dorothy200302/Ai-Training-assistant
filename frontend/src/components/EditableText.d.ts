import React from 'react';
interface EditableTextProps {
    text?: string;
    value?: string;
    onChange?: (value: string) => void;
    setText?: (value: string) => void;
    className?: string;
    placeholder?: string;
    multiline?: boolean;
}
export declare const EditableText: React.FC<EditableTextProps>;
export {};
