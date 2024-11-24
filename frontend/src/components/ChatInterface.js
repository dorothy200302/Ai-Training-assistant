import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
const ChatInterface = ({ onSendMessage, isLoading }) => {
    const [message, setMessage] = useState('');
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim())
            return;
        try {
            await onSendMessage(message);
            setMessage('');
        }
        catch (error) {
            toast({
                title: "发送失败",
                description: "消息发送失败，请重试",
                variant: "destructive",
            });
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "flex gap-2", children: [_jsx(Input, { value: message, onChange: (e) => setMessage(e.target.value), placeholder: "\u8F93\u5165\u60A8\u7684\u95EE\u9898...", disabled: isLoading, className: "flex-1" }), _jsx(Button, { type: "submit", disabled: isLoading || !message.trim(), children: isLoading ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(Send, { className: "h-4 w-4" })) })] }));
};
export default ChatInterface;
