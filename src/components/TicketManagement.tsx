import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Eye, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DetailedTicketForm from './DetailedTicketForm';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  created_by: {
    id?: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_to?: {
    id?: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  departments?: {
    name: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface DepartmentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

const TicketManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentTechnicians, setDepartmentTechnicians] = useState<DepartmentUser[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as TicketPriority,
    department_id: ''
  });

  const [assignmentData, setAssignmentData] = useState({
    assigned_to: '',
    status: 'in_progress' as TicketStatus
  });

  useEffect(() => {
    fetchTickets();
    fetchDepartments();
    if (user?.role === 'department_admin' && user.department_id) {
      fetchDepartmentTechnicians(user.department_id);
    }
  }, [user]);

  const fetchTickets = async () => {
    try {
      let query = supabase
        .from('tickets')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          created_at,
          created_by:users!tickets_created_by_fkey(id, first_name, last_name, email),
          assigned_to:users!tickets_assigned_to_fkey(id, first_name, last_name, role),
          departments(name)
        `)
        .order('created_at', { ascending: false });

      // Filter tickets based on user role
      if (user?.role === 'end_user') {
        query = query.eq('created_by', user.id);
      } else if (user?.role === 'department_technician' && user.department_id) {
        query = query.or(`assigned_to.eq.${user.id},department_id.eq.${user.department_id}`);
      } else if (user?.role === 'department_admin' && user.department_id) {
        query = query.eq('department_id', user.department_id);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tickets",
        variant: "destructive",
      });
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchDepartmentTechnicians = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, role')
        .eq('department_id', departmentId)
        .eq('role', 'department_technician')
        .eq('is_active', true);
      
      if (error) throw error;
      setDepartmentTechnicians(data || []);
    } catch (error) {
      console.error('Error fetching department technicians:', error);
    }
  };

  const findDepartmentAdmin = async (departmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('department_id', departmentId)
        .eq('role', 'department_admin')
        .eq('is_active', true)
        .single();
      
      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error finding department admin:', error);
      return null;
    }
  };

  const handleCreateTicket = async () => {
    if (!newTicket.title.trim() || !newTicket.description.trim()) {
      toast({
        title: "Error",
        description: "Title and description are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Find department admin if department is selected
      let assignedTo = null;
      if (newTicket.department_id) {
        assignedTo = await findDepartmentAdmin(newTicket.department_id);
      }

      const { error } = await supabase
        .from('tickets')
        .insert({
          title: newTicket.title.trim(),
          description: newTicket.description.trim(),
          priority: newTicket.priority,
          department_id: newTicket.department_id || null,
          created_by: user?.id || '',
          assigned_to: assignedTo,
          status: assignedTo ? 'in_progress' : 'open'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: assignedTo 
          ? "Ticket created and assigned to department admin" 
          : "Ticket created successfully",
      });

      setNewTicket({
        title: '',
        description: '',
        priority: 'medium' as TicketPriority,
        department_id: ''
      });
      setIsAddDialogOpen(false);
      fetchTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast({
        title: "Error",
        description: "Failed to create ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignmentData.assigned_to) {
      toast({
        title: "Error",
        description: "Please select a technician to assign",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('tickets')
        .update({
          assigned_to: assignmentData.assigned_to,
          status: assignmentData.status
        })
        .eq('id', selectedTicket.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket assigned successfully",
      });

      setIsAssignDialogOpen(false);
      setSelectedTicket(null);
      setAssignmentData({ assigned_to: '', status: 'in_progress' });
      fetchTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
      toast({
        title: "Error",
        description: "Failed to assign ticket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ 
          status: newStatus,
          resolved_at: newStatus === 'resolved' ? new Date().toISOString() : null
        })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Ticket status updated",
      });

      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Error",
        description: "Failed to update ticket status",
        variant: "destructive",
      });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canAssignTicket = (ticket: Ticket) => {
    return user?.role === 'department_admin' && 
           (!ticket.assigned_to || ticket.assigned_to.role === 'department_admin');
  };

  const canUpdateStatus = (ticket: Ticket) => {
    return user?.role === 'department_technician' && ticket.assigned_to?.first_name;
  };

  const showChatButton = (ticket: Ticket) => {
    return ticket.assigned_to && (
      user?.id === ticket.assigned_to?.id ||
      user?.id === ticket.created_by?.id ||
      user?.role === 'department_admin' ||
      user?.role === 'super_admin'
    );
  };

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
              : 'Manage assigned tickets and update status'
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
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{ticket.title}</h3>
                    <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={getStatusColor(ticket.status)}>
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </Badge>
                      {ticket.departments && (
                        <Badge variant="outline">
                          {ticket.departments.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>Created by: {ticket.created_by.first_name} {ticket.created_by.last_name}</p>
                      {ticket.assigned_to && (
                        <p>Assigned to: {ticket.assigned_to.first_name} {ticket.assigned_to.last_name} ({ticket.assigned_to.role?.replace('_', ' ')})</p>
                      )}
                      <p>Created: {new Date(ticket.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openViewDialog(ticket)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    
                    {canAssignTicket(ticket) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openAssignDialog(ticket)}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        Assign
                      </Button>
                    )}

                    {canUpdateStatus(ticket) && (
                      <Select 
                        value={ticket.status} 
                        onValueChange={(value: TicketStatus) => handleStatusUpdate(ticket.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {tickets.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No tickets found</p>
          </div>
        )}
      </CardContent>

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Ticket</DialogTitle>
            <DialogDescription>
              Assign "{selectedTicket?.title}" to a department technician
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="technician">Select Technician</Label>
              <Select value={assignmentData.assigned_to} onValueChange={(value) => setAssignmentData({ ...assignmentData, assigned_to: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select technician" />
                </SelectTrigger>
                <SelectContent>
                  {departmentTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name} ({tech.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {departmentTechnicians.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No technicians available in this department.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={assignmentData.status} onValueChange={(value: TicketStatus) => setAssignmentData({ ...assignmentData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignTicket} disabled={loading || departmentTechnicians.length === 0}>
              {loading ? 'Assigning...' : 'Assign Ticket'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TicketManagement;
