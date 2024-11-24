import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EditableText } from './EditableText';
import { Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
export const EditableCard = ({ title, description, onTitleChange, onDescriptionChange, onDelete, className = "", children, extraButtons }) => {
    return (_jsxs(Card, { className: `group relative ${className}`, children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { children: _jsx(EditableText, { value: title, onChange: onTitleChange, className: "text-amber-800" }) }), description && onDescriptionChange && (_jsx(CardDescription, { children: _jsx(EditableText, { value: description, onChange: onDescriptionChange, className: "text-amber-600" }) }))] }), _jsx(CardContent, { children: children }), onDelete && (_jsx(Button, { size: "sm", variant: "ghost", className: "absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500", onClick: onDelete, children: _jsx(Trash, { className: "h-4 w-4" }) })), extraButtons] }));
};
