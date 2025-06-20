
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DetailedTicketForm from './DetailedTicketForm';
import TicketTable from './TicketTable';
import TicketAssignmentDialog from './TicketAssignmentDialog';
import LoadingSpinner from './LoadingSpinner';
import { useTicketManagement } from '@/hooks/useTicketManagement';
import { showErrorToast, showSuccessToast, commonToasts } from '@/utils/toast';
import { Ticket, TicketStatus } from '@/types/ticket';

const TicketManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    tickets,
    departments,
    departmentTechnicians,
    loading,
    setLoading,
    fetchTickets,
    fetchDepartmentTechnicians,
    findDepartmentAdmin,
    handleStatusUpdate
  } = useTicketManagement();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);

  const [assignmentData, setAssignmentData] = useState({
    assigned_to: '',
    status: 'in_progress' as TicketStatus
  });

  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignmentData.assigned_to) {
      showErrorToast('Validation Error', 'Please select a technician to assign');
      return;
    }

    setAssignmentLoading(true);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          assigned_to: assignmentData.assigned_to,
          status: assignmentData.status
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      commonToasts.success.updated('Ticket assignment');
      setIsAssignDialogOpen(false);
      setSelectedTicket(null);
      setAssignmentData({ assigned_to: '', status: 'in_progress' });
      await fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      showErrorToast('Assignment Failed', 'Failed to assign ticket. Please try again.');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const openAssignDialog = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setAssignmentData({ assigned_to: '', status: 'in_progress' });
    setIsAssignDialogOpen(true);
  };

  const openViewDialog = (ticket: Ticket) => {
    navigate(`/dashboard/ticket/${ticket.id}`);
  };

  const handleRetry = () => {
    fetchTickets();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <LoadingSpinner size="lg" text="Loading tickets..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Ticket Management</CardTitle>
          <CardDescription>
            {user?.role === 'end_user' 
              ? 'View and create your support tickets'
              : user?.role === 'department_admin'
              ? 'Manage department tickets and assign to technicians'
              : user?.role === 'department_technician'
              ? 'Manage your assigned tickets and update status'
              : 'Manage all tickets'
            }
          </CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Create New Ticket</DialogTitle>
              <DialogDescription>Submit a detailed support request</DialogDescription>
            </DialogHeader>
            <DetailedTicketForm
              departments={departments}
              onSuccess={() => {
                setIsAddDialogOpen(false);
                fetchTickets();
                commonToasts.success.created('Support ticket');
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {tickets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No tickets found</p>
            <Button onClick={() => setIsAddDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create your first ticket
            </Button>
          </div>
        ) : (
          <TicketTable
            tickets={tickets}
            onViewDetails={openViewDialog}
            onAssign={openAssignDialog}
            onStatusUpdate={handleStatusUpdate}
          />
        )}
      </CardContent>

      <TicketAssignmentDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedTicket={selectedTicket}
        departmentTechnicians={departmentTechnicians}
        assignmentData={assignmentData}
        onAssignmentDataChange={setAssignmentData}
        onAssign={handleAssignTicket}
        loading={assignmentLoading}
      />
    </Card>
  );
};

export default TicketManagement;
