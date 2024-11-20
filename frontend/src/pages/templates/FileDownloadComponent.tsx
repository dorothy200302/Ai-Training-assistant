import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';

interface FileDownloadComponentProps {
  documentContent: string;
}

const FileDownloadComponent: React.FC<FileDownloadComponentProps> = ({ documentContent }) => {
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

  return (
    <div className="flex items-center gap-2">
      <select value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} className="border p-2">
        <option value="txt">TXT</option>
        <option value="pdf">PDF</option>
        {/* Add more formats as needed */}
      </select>
      <Button onClick={handleDownload} className="bg-green-500 hover:bg-green-600 text-white">
        下载文件
      </Button>
    </div>
  );
};

export default FileDownloadComponent; 