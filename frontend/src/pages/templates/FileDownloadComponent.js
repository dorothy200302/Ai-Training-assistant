import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
const FileDownloadComponent = ({ documentContent }) => {
    const [fileFormat, setFileFormat] = useState('txt');
    const { toast } = useToast();
    const handleDownload = () => {
        const blob = new Blob([documentContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `document.${fileFormat}`;
        a.click();
        URL.revokeObjectURL(url);
        toast({
            title: "下载成功",
            description: `文件已下载为 ${fileFormat} 格式`,
        });
    };
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: fileFormat, onChange: (e) => setFileFormat(e.target.value), className: "border p-2", children: [_jsx("option", { value: "txt", children: "TXT" }), _jsx("option", { value: "pdf", children: "PDF" })] }), _jsx(Button, { onClick: handleDownload, className: "bg-green-500 hover:bg-green-600 text-white", children: "\u4E0B\u8F7D\u6587\u4EF6" })] }));
};
export default FileDownloadComponent;
