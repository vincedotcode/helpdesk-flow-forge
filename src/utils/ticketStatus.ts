import { TicketStatus } from '@/types/ticket';

export const ticketStatusBadgeClass: Record<TicketStatus, string> = {
  open: 'bg-blue-700 text-white border border-blue-900',
  in_progress: 'bg-amber-500 text-amber-900 border border-amber-700',
  resolved: 'bg-green-600 text-white border border-green-800',
  closed: 'bg-gray-700 text-white border border-gray-900',
};

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const ticketStatusOptions: Array<{ value: TicketStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const getTicketStatusBadgeClass = (status: TicketStatus) => {
  return ticketStatusBadgeClass[status] ?? 'bg-gray-100 text-gray-800';
};

export const formatTicketStatus = (status: TicketStatus | string) => {
  if (status in ticketStatusLabel) {
    return ticketStatusLabel[status as TicketStatus];
  }
  return status.replace('_', ' ');
};
