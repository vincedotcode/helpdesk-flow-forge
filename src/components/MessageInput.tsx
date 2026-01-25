
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface MessageInputProps {
  currentMessage: string;
  isLoading: boolean;
  activeSessionId: string | null;
  attachments: File[];
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onAttachFiles: (files: FileList | null) => void;
  onClearAttachments: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  currentMessage,
  isLoading,
  activeSessionId,
  attachments,
  onMessageChange,
  onSendMessage,
  onAttachFiles,
  onClearAttachments,
}) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="border-t p-4 flex-shrink-0">
      {attachments.length > 0 && (
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>{attachments.length} attachment(s) selected</span>
          <button
            type="button"
            onClick={onClearAttachments}
            className="text-xs text-primary hover:underline"
          >
            Clear
          </button>
        </div>
      )}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            value={currentMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the issue you want to report..."
            disabled={isLoading || !activeSessionId}
            className="min-h-[44px] rounded-xl border-input focus:border-ring resize-none"
          />
        </div>
        <div>
          <input
            type="file"
            multiple
            id="kb-attachment-input"
            className="hidden"
            onChange={(e) => onAttachFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-11 rounded-xl p-0 flex-shrink-0"
            disabled={isLoading || !activeSessionId}
            aria-label="Attach files"
            onClick={() => {
              const input = document.getElementById('kb-attachment-input') as HTMLInputElement | null;
              input?.click();
            }}
          >
            +
          </Button>
        </div>
        <Button 
          onClick={onSendMessage} 
          disabled={(!currentMessage.trim() && attachments.length === 0) || isLoading || !activeSessionId}
          size="lg"
          className="h-11 w-11 rounded-xl p-0 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageInput;
