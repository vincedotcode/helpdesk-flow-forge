import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Ticket, Department, DepartmentUser, TicketPriority, TicketStatus } from '@/types/ticket';

export const useTicketManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentTechnicians, setDepartmentTechnicians] = useState<DepartmentUser[]>([]);
  const [loading, setLoading] = useState(false);

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
          department_id,
          created_at,
          created_by:users!tickets_created_by_fkey(id, first_name, last_name, email),
          assigned_to:users!tickets_assigned_to_fkey(id, first_name, last_name, role),
          departments(name)
        `)
        .order('created_at', { ascending: false });

      // Implement strict ticket visibility based on user role
      if (user?.role === 'end_user') {
        // End users can only see tickets they created
        query = query.eq('created_by', user.id);
      } else if (user?.role === 'department_technician') {
        // Department technicians can see:
        // 1. Tickets assigned specifically to them
        // 2. Tickets in their department that are unassigned or assigned to department admin
        query = query.or(`assigned_to.eq.${user.id},and(department_id.eq.${user.department_id},or(assigned_to.is.null,assigned_to.neq.${user.id}))`);
      } else if (user?.role === 'department_admin' && user.department_id) {
        // Department admins can see tickets in their department that are:
        // 1. Created by someone and assigned to their department
        // 2. Assigned to them specifically
        // 3. Assigned to technicians in their department
        query = query.or(`department_id.eq.${user.department_id},assigned_to.eq.${user.id}`);
      }
      // Super admins can see all tickets (no additional filtering)

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

  useEffect(() => {
    fetchTickets();
    fetchDepartments();
    if (user?.role === 'department_admin' && user.department_id) {
      fetchDepartmentTechnicians(user.department_id);
    }
  }, [user]);

  return {
    tickets,
    departments,
    departmentTechnicians,
    loading,
    setLoading,
    fetchTickets,
    fetchDepartmentTechnicians,
    findDepartmentAdmin,
    handleStatusUpdate
  };
};
