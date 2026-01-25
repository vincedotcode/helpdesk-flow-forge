
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Bot, User, Ticket } from 'lucide-react';

interface ChatMessageProps {
  message: {
    id: string;
    message: string;
    response?: string;
    message_type: string;
    created_at: string;
    ticketCreated?: boolean;
    ticketId?: string;
  };
}

const formatAIResponse = (response: string) => {
  return response
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/- \*\*(.*?)\*\*:/g, '• $1:')
    .replace(/- /g, '• ')
    .replace(/^-\s*/gm, '• ')
    .trim();
};

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
}) => {
  return (
    <div className="space-y-4">
      {/* User Message */}
      <div className="flex gap-3 justify-end">
        <div className="max-w-[85%] sm:max-w-[70%]">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
            <p className="text-sm leading-relaxed">{message.message}</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
      
      {/* AI Response */}
      {message.response && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 max-w-[85%] sm:max-w-[70%]">
            <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                {formatAIResponse(message.response)}
              </p>
              
              {message.ticketCreated && (
                <div className="mt-3 pt-3 border-t">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Ticket className="w-3 h-3 mr-1" />
                    Ticket #{message.ticketId} Created
                  </Badge>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
