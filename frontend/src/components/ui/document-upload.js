import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
export function DocumentUpload({ onUploadComplete, onConfirm, maxFileSize = 20 * 1024 * 1024, // 20MB default
acceptedFileTypes = ['.doc', '.docx', '.pdf', '.txt', '.md'], hasCompletedConversation = false, }) {
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [dragActive, setDragActive] = React.useState(false);
    const inputRef = React.useRef(null);
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        }
        else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };
    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(Array.from(e.target.files));
        }
    };
    const handleFiles = (files) => {
        const validFiles = files.filter(file => {
            const isValidType = acceptedFileTypes.some(type => file.name.toLowerCase().endsWith(type.toLowerCase()));
            const isValidSize = file.size <= maxFileSize;
            return isValidType && isValidSize;
        });
        setSelectedFiles(prevFiles => [...prevFiles, ...validFiles]);
        onUploadComplete(validFiles);
    };
    const removeFile = (index) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };
    const handleButtonClick = () => {
        inputRef.current?.click();
    };
    return (_jsx(Dialog, { open: true, children: _jsxs(DialogContent, { className: "sm:max-w-[425px]", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u4E0A\u4F20\u6587\u6863" }), _jsx(DialogDescription, { children: "\u9009\u62E9\u8981\u4E0A\u4F20\u7684\u6587\u6863\u4EE5\u83B7\u5F97\u66F4\u7CBE\u51C6\u7684\u56DE\u7B54" })] }), _jsxs("div", { className: "grid gap-4 py-4", children: [_jsxs("div", { className: cn("flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer", dragActive ? "border-amber-500 bg-amber-50" : "border-gray-300", "hover:bg-gray-50 transition-colors"), onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, onClick: handleButtonClick, children: [_jsx("input", { ref: inputRef, type: "file", multiple: true, onChange: handleChange, accept: acceptedFileTypes.join(","), className: "hidden" }), _jsx(Upload, { className: "w-10 h-10 mb-3 text-gray-400" }), _jsxs("p", { className: "mb-2 text-sm text-gray-500", children: [_jsx("span", { className: "font-semibold", children: "\u70B9\u51FB\u4E0A\u4F20" }), " \u6216\u62D6\u62FD\u6587\u4EF6\u5230\u8FD9\u91CC"] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\u652F\u6301\u7684\u6587\u4EF6\u7C7B\u578B: ", acceptedFileTypes.join(", ")] })] }), selectedFiles.length > 0 && (_jsxs("div", { className: "mt-4", children: [_jsx("h4", { className: "text-sm font-medium mb-2", children: "\u5DF2\u9009\u62E9\u7684\u6587\u4EF6:" }), _jsx("div", { className: "space-y-2", children: selectedFiles.map((file, index) => (_jsxs("div", { className: "flex items-center justify-between p-2 bg-gray-50 rounded", children: [_jsx("span", { className: "text-sm truncate", children: file.name }), _jsx("button", { onClick: () => removeFile(index), className: "p-1 hover:bg-gray-200 rounded", children: _jsx(X, { className: "w-4 h-4" }) })] }, index))) })] })), _jsx("div", { className: "flex justify-end gap-2", children: _jsx(Button, { variant: "outline", onClick: () => onConfirm(selectedFiles), disabled: selectedFiles.length === 0, children: "\u786E\u8BA4\u4E0A\u4F20" }) })] })] }) }));
}
