
import { useAuth } from '@/contexts/AuthContext';
import { Ticket } from '@/types/ticket';

export const useTicketPermissions = () => {
  const { user } = useAuth();

  const canAssignTicket = (ticket: Ticket) => {
    return user?.role === 'department_admin' && 
           (!ticket.assigned_to || ticket.assigned_to.role === 'department_admin');
  };

  const canUpdateStatus = (ticket: Ticket) => {
    return user?.role === 'department_technician' && !!ticket.assigned_to?.first_name;
  };

  const showChatButton = (ticket: Ticket) => {
    return ticket.assigned_to && (
      user?.id === ticket.assigned_to?.id ||
      user?.id === ticket.created_by?.id ||
      user?.role === 'department_admin' ||
      user?.role === 'super_admin'
    );
  };

  return {
    canAssignTicket,
    canUpdateStatus,
    showChatButton
  };
};
