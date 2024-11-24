import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
export const EditableText = ({ text, value, onChange, setText, className = "", placeholder = "", multiline = false }) => {
    const actualValue = value ?? text ?? "";
    const handleChange = (newValue) => {
        onChange?.(newValue);
        setText?.(newValue);
    };
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(actualValue);
    const handleSave = () => {
        handleChange(tempValue);
        setIsEditing(false);
    };
    const handleCancel = () => {
        setTempValue(actualValue);
        setIsEditing(false);
    };
    if (isEditing) {
        return (_jsxs("div", { className: "flex gap-2 items-start", children: [multiline ? (_jsx(Textarea, { value: tempValue, onChange: (e) => setTempValue(e.target.value), className: className, rows: 3 })) : (_jsx(Input, { value: tempValue, onChange: (e) => setTempValue(e.target.value), className: className })), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleSave, children: _jsx(Check, { className: "h-4 w-4" }) }), _jsx(Button, { size: "sm", variant: "ghost", onClick: handleCancel, children: _jsx(X, { className: "h-4 w-4" }) })] }));
    }
    return (_jsxs("div", { className: "group relative", children: [_jsx("div", { className: className, children: actualValue }), _jsx(Button, { size: "sm", variant: "ghost", className: "absolute -right-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity", onClick: () => setIsEditing(true), children: _jsx(Pencil, { className: "h-4 w-4" }) })] }));
};
