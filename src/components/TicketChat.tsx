
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Send, Check } from 'lucide-react';
import { playNotificationTone } from '@/utils/notificationSound';

interface ChatMessage {
  id: string;
  message: string;
  message_type: string;
  attachment_url?: string;
  created_at: string;
  user_id: string;
  users: {
    first_name: string;
    last_name: string;
    role: string;
  };
  read_by: string[];
}

interface TicketChatProps {
  ticketId: string;
  ticketTitle: string;
}

const TicketChat: React.FC<TicketChatProps> = ({ ticketId, ticketTitle }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const notifiedMessagesRef = useRef<Set<string>>(new Set());
  const skipInitialNotificationRef = useRef(true);

  useEffect(() => {
    fetchMessages();
    
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel(`ticket-chat-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_chat_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          fetchMessages(); // Refetch to get user details
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const currentUserId = user?.id;
    if (!messages.length || !currentUserId) return;

    const newMessages = messages.filter(
      (message) => !notifiedMessagesRef.current.has(message.id)
    );

    newMessages.forEach((message) => {
      notifiedMessagesRef.current.add(message.id);
    });

    if (skipInitialNotificationRef.current) {
      skipInitialNotificationRef.current = false;
      return;
    }

    const incomingFromOthers = newMessages.find((message) => message.user_id !== currentUserId);
    if (incomingFromOthers) {
      playNotificationTone();
      toast({
        title: "New chat message",
        description: `${incomingFromOthers.users.first_name} ${incomingFromOthers.users.last_name} replied to ${ticketTitle}`,
      });
    }
  }, [messages, ticketTitle, toast, user?.id]);

  useEffect(() => {
    if (!ticketId || !user?.id || !messages.length) return;

    const markRead = async () => {
      const { error } = await supabase.rpc('mark_ticket_chat_messages_read', {
        p_ticket_id: ticketId,
        p_user_id: user.id
      });
      if (error) {
        console.error('Failed to mark chat messages as read:', error);
      }
    };

    markRead();
  }, [messages, ticketId, user?.id]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ticket_chat_messages')
        .select(`
          id,
          message,
          message_type,
          attachment_url,
          created_at,
          user_id,
          read_by,
          users:user_id(first_name, last_name, role)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load chat messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('ticket_chat_messages')
        .insert({
          ticket_id: ticketId,
          user_id: user?.id || '',
          message: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'text-purple-600';
      case 'department_admin': return 'text-blue-600';
      case 'department_technician': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chat - {ticketTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea
          className="flex-1 px-4 max-h-[26rem]"
          ref={scrollAreaRef}
          style={{ minHeight: 0 }}
        >
          {loading ? (
            <div className="flex justify-center py-4">
              <span className="text-sm text-gray-500">Loading messages...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center py-4">
              <span className="text-sm text-gray-500">No messages yet. Start the conversation!</span>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages.map((message) => {
                const otherReaders = message.read_by.filter((id) => id !== message.user_id);
                const hasReadByCurrentUser = user?.id ? message.read_by.includes(user.id) : false;

                return (
                  <div
                    key={message.id}
                    className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.user_id === user?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${
                          message.user_id === user?.id 
                            ? 'text-blue-100' 
                            : getRoleColor(message.users.role)
                        }`}>
                          {message.users.first_name} {message.users.last_name}
                        </span>
                        <span className={`text-xs ${
                          message.user_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                      {message.attachment_url && (
                        <div className="mt-2">
                          <a
                            href={message.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline"
                          >
                            View Attachment
                          </a>
                        </div>
                      )}
                      {message.read_by && (
                        <>
                          {message.user_id === user?.id && otherReaders.length > 0 && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Check className="w-3 h-3" />
                              <span>
                                Seen by {otherReaders.length} teammate{otherReaders.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                          {message.user_id !== user?.id && hasReadByCurrentUser && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Check className="w-3 h-3" />
                              <span>Read</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              size="sm"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketChat;
