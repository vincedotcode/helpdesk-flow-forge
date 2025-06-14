
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Bot, Send, Loader, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TicketAIAssistantProps {
  ticket: {
    id: string;
    title: string;
    description: string;
    category?: string;
    priority: string;
    urgency_level?: string;
    affected_systems?: string;
    steps_to_reproduce?: string;
    expected_behavior?: string;
    actual_behavior?: string;
    business_impact?: string;
    additional_info?: string;
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TicketAIAssistant: React.FC<TicketAIAssistantProps> = ({ ticket }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userMessage, setUserMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasGeneratedSummary, setHasGeneratedSummary] = useState(false);

  useEffect(() => {
    // Generate initial summary when component mounts
    if (!hasGeneratedSummary) {
      generateTicketSummary();
    }
  }, [ticket.id, hasGeneratedSummary]);

  const generateTicketSummary = async () => {
    setIsLoading(true);
    try {
      const ticketContext = `
        Ticket: ${ticket.title}
        Description: ${ticket.description}
        Priority: ${ticket.priority}
        Category: ${ticket.category || 'Not specified'}
        Urgency: ${ticket.urgency_level || 'Not specified'}
        Affected Systems: ${ticket.affected_systems || 'Not specified'}
        Steps to Reproduce: ${ticket.steps_to_reproduce || 'Not specified'}
        Expected Behavior: ${ticket.expected_behavior || 'Not specified'}
        Actual Behavior: ${ticket.actual_behavior || 'Not specified'}
        Business Impact: ${ticket.business_impact || 'Not specified'}
        Additional Info: ${ticket.additional_info || 'Not specified'}
      `;

      const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
        body: {
          action: 'summarize',
          ticketContext,
        },
      });

      if (error) throw error;

      const summaryMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages([summaryMessage]);
      setHasGeneratedSummary(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate ticket summary. Please check if OpenAI API key is configured.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || isLoading) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setUserMessage('');
    setIsLoading(true);

    try {
      const ticketContext = `
        Ticket: ${ticket.title}
        Description: ${ticket.description}
        Priority: ${ticket.priority}
        Category: ${ticket.category || 'Not specified'}
        Urgency: ${ticket.urgency_level || 'Not specified'}
        Affected Systems: ${ticket.affected_systems || 'Not specified'}
        Steps to Reproduce: ${ticket.steps_to_reproduce || 'Not specified'}
        Expected Behavior: ${ticket.expected_behavior || 'Not specified'}
        Actual Behavior: ${ticket.actual_behavior || 'Not specified'}
        Business Impact: ${ticket.business_impact || 'Not specified'}
        Additional Info: ${ticket.additional_info || 'Not specified'}
      `;

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-ticket-assistant', {
        body: {
          action: 'chat',
          ticketContext,
          userMessage: userMessage,
          conversationHistory,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
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

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <span>AI Assistant</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateTicketSummary}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-4 py-4">
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 py-8">
                <Bot className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>AI assistant will analyze your ticket and provide insights.</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Textarea
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask the AI for help with this ticket..."
              disabled={isLoading}
              className="flex-1 min-h-[40px] max-h-[100px]"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !userMessage.trim()}
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

export default TicketAIAssistant;
