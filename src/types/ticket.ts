
export interface Ticket {
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

export interface Department {
  id: string;
  name: string;
}

export interface DepartmentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

export interface Notification {
  id: string;
  user_id: string;
  ticket_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type NotificationType = 'ticket_created' | 'ticket_status_updated' | 'ticket_assigned';
