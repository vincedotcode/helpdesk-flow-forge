import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Ticket, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

  const formatAIResponse = (response: string) => {
    // Remove markdown formatting and clean up the response
    return response
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italics
      .replace(/- \*\*(.*?)\*\*:/g, '• $1:') // Convert bullet points
      .replace(/- /g, '• ') // Convert dashes to bullets
      .replace(/^-\s*/gm, '• ') // Convert leading dashes to bullets
      .trim();
  };

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
      const { data, error } = await supabase.functions.invoke('ai-knowledge-assistant', {
        body: {
          message: userMessage,
          sessionId: activeSessionId,
          userId: user.id
        }
      });

      if (error) throw error;

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
        description: "Failed to send message. Please try again.",
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

      // Update the message to show ticket was created
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
    <div className="container mx-auto max-w-7xl p-4 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-8rem)]">
        
        {/* Sessions Sidebar */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium">Chat History</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={createNewSession}
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
                      onClick={() => setActiveSessionId(session.id)}
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
        </div>

        {/* Chat Interface */}
        <div className="lg:col-span-3 order-1 lg:order-2">
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
                    <div key={msg.id} className="space-y-4">
                      {/* User Message */}
                      <div className="flex gap-3 justify-end">
                        <div className="max-w-[85%] sm:max-w-[70%]">
                          <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-3">
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                      
                      {/* AI Response */}
                      {msg.response && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 max-w-[85%] sm:max-w-[70%]">
                            <div className="bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                              <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
                                {formatAIResponse(msg.response)}
                              </p>
                              
                              {msg.ticketCreated && (
                                <div className="mt-3 pt-3 border-t">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <Ticket className="w-3 h-3 mr-1" />
                                    Ticket #{msg.ticketId} Created
                                  </Badge>
                                </div>
                              )}
                              
                              {msg.showResolutionCheck && !msg.ticketCreated && (
                                <div className="mt-4 pt-3 border-t space-y-3">
                                  <p className="text-sm font-medium text-foreground">
                                    Did this help resolve your question?
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => markAsResolved(msg.id)}
                                      className="text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                      Yes, resolved
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => createTicketFromChat(msg.id)}
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
              
              {/* Message Input */}
              <div className="border-t p-4 flex-shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Input
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything..."
                      disabled={isLoading || !activeSessionId}
                      className="min-h-[44px] rounded-xl border-input focus:border-ring resize-none"
                    />
                  </div>
                  <Button 
                    onClick={sendMessage} 
                    disabled={!currentMessage.trim() || isLoading || !activeSessionId}
                    size="lg"
                    className="h-11 w-11 rounded-xl p-0 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseChat;
