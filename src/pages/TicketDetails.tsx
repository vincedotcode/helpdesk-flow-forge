
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft } from 'lucide-react';
import EnhancedTicketView from '@/components/EnhancedTicketView';
import TicketAIAssistant from '@/components/TicketAIAssistant';
import TicketAssignmentDialog from '@/components/TicketAssignmentDialog';
import { exportCostingReport } from '@/utils/costingReport';
import { DepartmentUser, TicketStatus } from '@/types/ticket';

interface EnhancedTicket {
  id: string;
  title: string;
  description: string;
  category?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
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
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_to?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  departments?: {
    name: string;
  };
  department_id?: string;
  external_supplier_required?: boolean;
  external_supplier_description?: string | null;
  external_supplier_cost?: number | null;
}

const TicketDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [ticket, setTicket] = useState<EnhancedTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [externalSupplierDescription, setExternalSupplierDescription] = useState('');
  const [externalSupplierCost, setExternalSupplierCost] = useState('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [departmentTechnicians, setDepartmentTechnicians] = useState<DepartmentUser[]>([]);
  const [assignmentData, setAssignmentData] = useState({
    assigned_to: '',
    status: 'in_progress' as TicketStatus
  });

  useEffect(() => {
    if (id) {
      fetchTicket();
    }
  }, [id]);

  const checkTicketAccess = (ticketData: any): boolean => {
    if (!user) return false;

    // Super admin can access all tickets
    if (user.role === 'super_admin') return true;

    // Creator can access their own tickets
    if (ticketData.created_by.id === user.id) return true;

    // Assigned user can access tickets assigned to them
    if (ticketData.assigned_to?.id === user.id) return true;

    // Department admin can access tickets in their department
    if (user.role === 'department_admin' && 
        user.department_id && 
        ticketData.department_id === user.department_id) {
      return true;
    }

    return false;
  };

  const fetchTicket = async () => {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          created_by:users!tickets_created_by_fkey(id, first_name, last_name, email),
          assigned_to:users!tickets_assigned_to_fkey(id, first_name, last_name, role),
          departments(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Check if user has access to this ticket
      if (!checkTicketAccess(data)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      
      // Transform the data to match our interface
      const rawTicket: any = data;
      const transformedTicket: EnhancedTicket = {
        ...rawTicket,
        attachments: Array.isArray(rawTicket.attachments) ? rawTicket.attachments : [],
        status: rawTicket.status as 'open' | 'in_progress' | 'resolved' | 'closed',
        external_supplier_required: rawTicket.external_supplier_required ?? false,
        external_supplier_description: rawTicket.external_supplier_description ?? null,
        external_supplier_cost: rawTicket.external_supplier_cost ?? null,
      };
      
      setTicket(transformedTicket);
      setExternalSupplierDescription(
        transformedTicket.external_supplier_description || ''
      );
      setExternalSupplierCost(
        typeof transformedTicket.external_supplier_cost === 'number'
          ? transformedTicket.external_supplier_cost.toString()
          : transformedTicket.external_supplier_cost || ''
      );
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

  const handleStatusUpdate = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
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

  const handleSaveCosting = async () => {
    if (!ticket) return;

    try {
      const costValue =
        externalSupplierCost.trim().length > 0
          ? parseFloat(externalSupplierCost)
          : null;

      const updatePayload: Record<string, unknown> = {
        external_supplier_required: true,
        external_supplier_description:
          externalSupplierDescription.trim().length > 0
            ? externalSupplierDescription.trim()
            : null,
        external_supplier_cost: costValue,
      };

      const { error } = await supabase
        .from('tickets')
        .update(updatePayload)
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Costing details saved",
      });

      fetchTicket();
    } catch (error) {
      console.error('Error saving costing details:', error);
      toast({
        title: "Error",
        description: "Failed to save costing details",
        variant: "destructive",
      });
    }
  };

  const fetchDepartmentTechnicians = async (departmentId: string, includeAdmins = false) => {
    try {
      let query = supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('department_id', departmentId)
        .eq('is_active', true);

      if (includeAdmins) {
        query = query.in('role', ['department_admin', 'department_technician']);
      } else {
        query = query.eq('role', 'department_technician');
      }

      const { data, error } = await query;

      if (error) throw error;
      setDepartmentTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching department technicians:', error);
      toast({
        title: "Error",
        description: "Failed to load department technicians",
        variant: "destructive",
      });
    }
  };

  const openAssignDialog = async () => {
    if (!ticket || !user) return;

    setAssignmentData({ assigned_to: '', status: 'in_progress' });

    const departmentId =
      user.role === 'super_admin' ? ticket.department_id : user.department_id;

    if (!departmentId) {
      toast({
        title: "Missing Department",
        description: "This ticket is not linked to a department yet.",
        variant: "destructive",
      });
      return;
    }

    await fetchDepartmentTechnicians(departmentId, user.role === 'super_admin');
    setIsAssignDialogOpen(true);
  };

  const handleAssignTicket = async () => {
    if (!ticket || !assignmentData.assigned_to) {
      toast({
        title: "Validation Error",
        description: "Please select a technician to assign",
        variant: "destructive",
      });
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
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket assignment updated",
      });

      setIsAssignDialogOpen(false);
      setAssignmentData({ assigned_to: '', status: 'in_progress' });
      fetchTicket();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "Error",
        description: "Failed to assign ticket. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssignmentLoading(false);
    }
  };

  const canAssignTicket = (ticket: EnhancedTicket) => {
    if (user?.role === 'super_admin') return true;
    return (
      user?.role === 'department_admin' &&
      !!user.department_id &&
      ticket.department_id === user.department_id
    );
  };

  const canUpdateStatus = (ticket: EnhancedTicket) => {
    if (user?.role === 'super_admin' || user?.role === 'department_admin') return true;
    return user?.role === 'department_technician' && ticket.assigned_to?.id === user.id;
  };

  const showChatButton = (ticket: EnhancedTicket) => {
    if (!user) return false;
    const isCreator = user.id === ticket.created_by.id;
    const isAssignee = user.id === ticket.assigned_to?.id;

    if (user.role === 'super_admin') return true;
    if (user.role === 'department_admin') {
      return isCreator || isAssignee || ticket.department_id === user.department_id;
    }
    if (user.role === 'department_technician') {
      return isAssignee;
    }
    return isCreator;
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

  if (accessDenied) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You don't have permission to view this ticket.</p>
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

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
              <p className="text-gray-600 mb-4">The ticket you're looking for doesn't exist.</p>
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
            onAssign={openAssignDialog}
          />
          {ticket.status === 'in_progress' && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>External Supplier Costing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use this section when a ticket cannot be solved internally and requires external suppliers. 
                  The costing details can be shared with finance as a report.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Cost (MUR)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={externalSupplierCost}
                      onChange={(e) => setExternalSupplierCost(e.target.value)}
                      placeholder="Enter external supplier cost"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Costing Description (e.g. requesting external suppliers, quotation details)
                    </label>
                    <Textarea
                      value={externalSupplierDescription}
                      onChange={(e) => setExternalSupplierDescription(e.target.value)}
                      placeholder="Describe why external suppliers are required and any costing breakdown."
                      rows={4}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() =>
                      exportCostingReport(
                        ticket,
                        externalSupplierDescription,
                        externalSupplierCost,
                        {
                          onFailure: () => toast({
                            title: "Export Failed",
                            description: "Popup blocked. Please allow popups to export the report.",
                            variant: "destructive",
                          })
                        }
                      )
                    }
                  >
                    Export Costing Report
                  </Button>
                  <Button onClick={handleSaveCosting}>
                    Save Costing
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Assistant sidebar - only for department admins and technicians */}
        {showAIAssistant() && (
          <div className="lg:col-span-1">
            <TicketAIAssistant ticket={ticket} />
          </div>
        )}
      </div>

      <TicketAssignmentDialog
        isOpen={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        selectedTicket={ticket}
        departmentTechnicians={departmentTechnicians}
        assignmentData={assignmentData}
        onAssignmentDataChange={setAssignmentData}
        onAssign={handleAssignTicket}
        loading={assignmentLoading}
      />
    </div>
  );
};

export default TicketDetails;
