
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

interface SessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onCreateNewSession: () => void;
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onCreateNewSession,
}) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">Chat History</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onCreateNewSession}
            className="h-8 w-8 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors text-sm border ${
                  activeSessionId === session.id 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'hover:bg-muted/50 border-transparent'
                }`}
                onClick={() => onSessionSelect(session.id)}
              >
                <div className="font-medium text-foreground truncate">{session.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(session.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SessionSidebar;
