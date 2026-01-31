
import { useAuth } from '@/contexts/AuthContext';
import { Ticket } from '@/types/ticket';

export const useTicketPermissions = () => {
  const { user } = useAuth();

  const isDepartmentScoped = (ticket: Ticket) => {
    return user?.department_id && ticket.department_id === user.department_id;
  };

  const canAssignTicket = (ticket: Ticket) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.role === 'department_admin') {
      return isDepartmentScoped(ticket);
    }
    return false;
  };

  const canUpdateStatus = (ticket: Ticket) => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    if (user.role === 'department_admin') {
      return isDepartmentScoped(ticket);
    }
    if (user.role === 'department_technician') {
      return ticket.assigned_to?.id === user.id;
    }
    return false;
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
