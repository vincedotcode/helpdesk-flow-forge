
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  message: string;
  response?: string;
  message_type: string;
  created_at: string;
  ticketCreated?: boolean;
  ticketId?: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
}

const KnowledgeBaseChat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId);
    }
  }, [activeSessionId]);

  const loadSessions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('knowledge_chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }

    setSessions(data || []);
    
    // Auto-select the first session or create a new one
    if (data && data.length > 0) {
      setActiveSessionId(data[0].id);
    } else {
      createNewSession();
    }
  };

  const loadMessages = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('knowledge_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const createNewSession = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('knowledge_chat_sessions')
      .insert({
        user_id: user.id,
        title: 'New Knowledge Base Chat'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return;
    }

    setActiveSessionId(data.id);
    setSessions(prev => [data, ...prev]);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !activeSessionId || !user) return;

    setIsLoading(true);
    const userMessage = currentMessage.trim();
    setCurrentMessage('');

    // Add user message to UI immediately
    const tempMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      message: userMessage,
      message_type: 'user',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-knowledge-assistant', {
        body: {
          message: userMessage,
          sessionId: activeSessionId,
          userId: user.id
        }
      });

      if (error) throw error;

      // Replace temp message with actual response
      setMessages(prev => prev.slice(0, -1));
      
      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        message: userMessage,
        response: data.response,
        message_type: 'user',
        created_at: new Date().toISOString(),
        ticketCreated: data.ticketCreated,
        ticketId: data.ticketId
      };

      setMessages(prev => [...prev, responseMessage]);

      if (data.ticketCreated) {
        toast({
          title: "Support Ticket Created",
          description: `Ticket #${data.ticketId} has been created for your issue.`,
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      // Remove the temp message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6 text-center">
          <p>Please log in to access the knowledge base.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sessions Sidebar */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Chat Sessions</CardTitle>
              <Button size="sm" onClick={createNewSession}>
                New Chat
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-2 mb-2 rounded cursor-pointer text-sm ${
                    activeSessionId === session.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <div className="font-medium truncate">{session.title}</div>
                  <div className="text-xs opacity-70">
                    {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Interface */}
      <div className="lg:col-span-3">
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              AI Knowledge Assistant
            </CardTitle>
            <p className="text-sm text-gray-600">
              Ask me anything about the organization. I can help you find information or create support tickets when needed.
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 mb-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Welcome! I'm here to help you with any questions about the organization.</p>
                    <p className="text-sm mt-2">Try asking me about policies, procedures, or technical issues.</p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    {/* User Message */}
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="bg-blue-50 rounded-lg p-3">
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    {msg.response && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-sm whitespace-pre-wrap">{msg.response}</p>
                            {msg.ticketCreated && (
                              <div className="mt-3">
                                <Badge variant="outline" className="bg-blue-50">
                                  <Ticket className="w-3 h-3 mr-1" />
                                  Ticket #{msg.ticketId} Created
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            {/* Message Input */}
            <div className="flex gap-2">
              <Input
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your question here..."
                disabled={isLoading || !activeSessionId}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!currentMessage.trim() || isLoading || !activeSessionId}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeBaseChat;
