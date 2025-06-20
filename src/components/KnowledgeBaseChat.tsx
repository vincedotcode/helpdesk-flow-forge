
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ChatMessage from './ChatMessage';
import SessionSidebar from './SessionSidebar';
import MessageInput from './MessageInput';

interface ChatMessage {
  id: string;
  message: string;
  response?: string;
  message_type: string;
  created_at: string;
  ticketCreated?: boolean;
  ticketId?: string;
  showResolutionCheck?: boolean;
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
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
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

    const tempMessage: ChatMessage = {
      id: 'temp-' + Date.now(),
      message: userMessage,
      message_type: 'user',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      // Debug: Check what tokens are available in localStorage
      const authToken = localStorage.getItem('cookie_auth_token');
      const fallbackToken = localStorage.getItem('cookie_auth_token');
      
      console.log('Available tokens:', {
        cookie_auth_token: authToken,
        fallback: fallbackToken,
        allLocalStorage: Object.keys(localStorage).filter(key => key.includes('auth') || key.includes('token'))
      });

      // Get the custom session token from localStorage - try both possible keys
      let token = localStorage.getItem('cookie_auth_token');
      if (!token) {
        // Fallback to check if it's stored differently
        token = localStorage.getItem('cookie_auth_token');
      }
      
      console.log('Token being sent:', token ? 'present' : 'missing');
      
      if (!token) {
        throw new Error('No valid session token found. Please try logging in again.');
      }

      const { data, error } = await supabase.functions.invoke('ai-knowledge-assistant', {
        body: {
          message: userMessage,
          sessionId: activeSessionId,
          userId: user.id
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      setMessages(prev => prev.slice(0, -1));
      
      const responseMessage: ChatMessage = {
        id: Date.now().toString(),
        message: userMessage,
        response: data.response,
        message_type: 'user',
        created_at: new Date().toISOString(),
        ticketCreated: data.ticketCreated,
        ticketId: data.ticketId,
        showResolutionCheck: !data.ticketCreated
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
        description: error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });
      
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const createTicketFromChat = async (messageId: string) => {
    if (!user || !activeSessionId) return;

    setIsCreatingTicket(true);
    
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const { data: userInfo, error: userError } = await supabase
        .from('users')
        .select('department_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          title: `Knowledge Base Query: ${message.message.substring(0, 50)}...`,
          description: `This ticket was created from a knowledge base interaction.

User Question: ${message.message}

AI Response: ${message.response}

The user indicated that their problem was not resolved and requested further assistance.`,
          status: 'open',
          priority: 'medium',
          created_by: user.id,
          department_id: userInfo.department_id,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, ticketCreated: true, ticketId: ticket.id, showResolutionCheck: false }
          : m
      ));

      toast({
        title: "Support Ticket Created",
        description: `Ticket #${ticket.id} has been created. Our team will review it soon.`,
      });

    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create support ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const markAsResolved = (messageId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, showResolutionCheck: false }
        : m
    ));
    
    toast({
      title: "Great!",
      description: "I'm glad I could help resolve your question.",
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Please log in to access the knowledge base.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-7xl mx-auto p-4 gap-4">
      
      {/* Sessions Sidebar */}
      <div className="w-80 flex-shrink-0">
        <SessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onCreateNewSession={createNewSession}
        />
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-w-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-4 border-b flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold">AI Knowledge Assistant</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask me anything about the organization. I'm here to help!
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6 min-h-full">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-foreground mb-2">Welcome to AI Assistant</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      I can help you find information about policies, procedures, or answer any questions you have about the organization.
                    </p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isCreatingTicket={isCreatingTicket}
                    onCreateTicket={createTicketFromChat}
                    onMarkAsResolved={markAsResolved}
                  />
                ))}
                
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 max-w-[85%] sm:max-w-[70%]">
                      <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>
            
            <MessageInput
              currentMessage={currentMessage}
              isLoading={isLoading}
              activeSessionId={activeSessionId}
              onMessageChange={setCurrentMessage}
              onSendMessage={sendMessage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeBaseChat;
