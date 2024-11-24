import React from 'react';
interface ChatInterfaceProps {
    onSendMessage: (message: string) => Promise<void>;
    isLoading: boolean;
}
declare const ChatInterface: React.FC<ChatInterfaceProps>;
export default ChatInterface;
