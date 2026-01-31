
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, UserCheck } from 'lucide-react';
import { Ticket, TicketStatus } from '@/types/ticket';
import { useTicketPermissions } from '@/hooks/useTicketPermissions';
import { ticketStatusOptions, getTicketStatusBadgeClass, formatTicketStatus } from '@/utils/ticketStatus';

interface TicketCardProps {
  ticket: Ticket;
  onViewDetails: (ticket: Ticket) => void;
  onAssign: (ticket: Ticket) => void;
  onStatusUpdate: (ticketId: string, status: TicketStatus) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onViewDetails,
  onAssign,
  onStatusUpdate
}) => {
  const { canAssignTicket, canUpdateStatus } = useTicketPermissions();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{ticket.title}</h3>
            <p className="text-gray-600 mb-3 line-clamp-2">{ticket.description}</p>
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getTicketStatusBadgeClass(ticket.status as TicketStatus)}>
                {formatTicketStatus(ticket.status)}
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
              onClick={() => onViewDetails(ticket)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </Button>
            
            {canAssignTicket(ticket) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAssign(ticket)}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Assign
              </Button>
            )}

            {canUpdateStatus(ticket) && (
              <Select 
                value={ticket.status} 
                onValueChange={(value: TicketStatus) => onStatusUpdate(ticket.id, value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ticketStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;
