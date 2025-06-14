
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import EnhancedTicketView from '@/components/EnhancedTicketView';
import TicketAIAssistant from '@/components/TicketAIAssistant';

interface EnhancedTicket {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: string;
  priority: string;
  urgency_level?: string;
  affected_systems?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  business_impact?: string;
  additional_info?: string;
  attachments?: any[];
  created_at: string;
  created_by: {
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_to?: {
    first_name: string;
    last_name: string;
    role: string;
  };
  departments?: {
    name: string;
  };
}

const TicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<EnhancedTicket | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ticketId) {
      fetchTicket();
    }
  }, [ticketId]);

  const fetchTicket = async () => {
    if (!ticketId) return;

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          created_by:users!tickets_created_by_fkey(first_name, last_name, email),
          assigned_to:users!tickets_assigned_to_fkey(first_name, last_name, role),
          departments(name)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      setTicket(data);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast({
        title: "Error",
        description: "Failed to fetch ticket details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!ticket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: status,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated",
      });

      // Refresh ticket data
      fetchTicket();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
    }
  };

  const canAssignTicket = (ticket: EnhancedTicket) => {
    return user?.role === 'department_admin' && 
           (!ticket.assigned_to || ticket.assigned_to.role === 'department_admin');
  };

  const canUpdateStatus = (ticket: EnhancedTicket) => {
    return user?.role === 'department_technician' && ticket.assigned_to?.first_name;
  };

  const showChatButton = (ticket: EnhancedTicket) => {
    return ticket.assigned_to && (
      user?.role === 'department_technician' ||
      user?.role === 'department_admin' ||
      user?.role === 'super_admin'
    );
  };

  const showAIAssistant = () => {
    return user?.role === 'department_technician' || user?.role === 'department_admin';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading ticket details...</div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
              <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist or you don't have permission to view it.</p>
              <Button onClick={() => navigate('/dashboard')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main ticket details */}
        <div className="lg:col-span-2">
          <EnhancedTicketView
            ticket={ticket}
            onUpdateStatus={handleStatusUpdate}
            canAssign={canAssignTicket(ticket)}
            canUpdateStatus={canUpdateStatus(ticket)}
            showChatButton={showChatButton(ticket)}
          />
        </div>

        {/* AI Assistant sidebar */}
        {showAIAssistant() && (
          <div className="lg:col-span-1">
            <TicketAIAssistant ticket={ticket} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketDetails;
