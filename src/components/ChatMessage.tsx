
import React from 'react';
import { Button } from '@/components/ui/button';
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
    showResolutionCheck?: boolean;
  };
  isCreatingTicket: boolean;
  onCreateTicket: (messageId: string) => void;
  onMarkAsResolved: (messageId: string) => void;
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
  isCreatingTicket,
  onCreateTicket,
  onMarkAsResolved,
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
              
              {message.showResolutionCheck && !message.ticketCreated && (
                <div className="mt-4 pt-3 border-t space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    Did this help resolve your question?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkAsResolved(message.id)}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      Yes, resolved
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onCreateTicket(message.id)}
                      disabled={isCreatingTicket}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Ticket className="w-3 h-3 mr-1" />
                      Create Ticket
                    </Button>
                  </div>
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
