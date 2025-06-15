import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import TicketChat from './TicketChat';
import { MessageSquare, Paperclip, Calendar, User, Building, Download, FileImage, FileText } from 'lucide-react';

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

interface EnhancedTicketViewProps {
  ticket: EnhancedTicket;
  onAssign?: () => void;
  onUpdateStatus?: (status: string) => void;
  canAssign: boolean;
  canUpdateStatus: boolean;
  showChatButton: boolean;
}

const EnhancedTicketView: React.FC<EnhancedTicketViewProps> = ({
  ticket,
  onAssign,
  onUpdateStatus,
  canAssign,
  canUpdateStatus,
  showChatButton
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  const getFileIcon = (fileName: string) => {
    const extension = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return <FileImage className="w-4 h-4 text-blue-500" />;
    } else if (extension === 'pdf') {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <Paperclip className="w-4 h-4 text-gray-400" />;
  };

  const downloadAttachment = async (attachment: any) => {
    try {
      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .download(attachment.path);
      
      if (error) {
        console.error('Error downloading file:', error);
        return;
      }
      
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{ticket.title}</CardTitle>
            <div className="flex items-center space-x-2 mb-3">
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
              <Badge className={getPriorityColor(ticket.priority)}>
                {ticket.priority}
              </Badge>
              {ticket.category && (
                <Badge variant="outline">
                  {ticket.category}
                </Badge>
              )}
              {ticket.urgency_level && (
                <Badge variant="outline" className="bg-orange-50 text-orange-700">
                  {ticket.urgency_level.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            {showChatButton && (
              <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ticket Communication</DialogTitle>
                  </DialogHeader>
                  <TicketChat ticketId={ticket.id} ticketTitle={ticket.title} />
                </DialogContent>
              </Dialog>
            )}
            {canAssign && onAssign && (
              <Button variant="outline" size="sm" onClick={onAssign}>
                <User className="w-4 h-4 mr-2" />
                Assign
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="font-semibold mb-3">Description</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* Technical Details */}
        {(ticket.affected_systems || ticket.steps_to_reproduce || ticket.expected_behavior || ticket.actual_behavior) && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Technical Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.affected_systems && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Affected Systems</label>
                    <p className="text-gray-700">{ticket.affected_systems}</p>
                  </div>
                )}
                {ticket.steps_to_reproduce && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Steps to Reproduce</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.steps_to_reproduce}</p>
                  </div>
                )}
                {ticket.expected_behavior && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expected Behavior</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.expected_behavior}</p>
                  </div>
                )}
                {ticket.actual_behavior && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Actual Behavior</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.actual_behavior}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Business Impact */}
        {(ticket.business_impact || ticket.additional_info) && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Business Impact & Additional Info</h3>
              <div className="space-y-3">
                {ticket.business_impact && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Business Impact</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.business_impact}</p>
                  </div>
                )}
                {ticket.additional_info && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Additional Information</label>
                    <p className="text-gray-700 whitespace-pre-wrap">{ticket.additional_info}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Attachments */}
        {ticket.attachments && ticket.attachments.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-3">Attachments</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ticket.attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        {getFileIcon(attachment.name)}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium truncate block">{attachment.name}</span>
                          <p className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAttachment(attachment)}
                        className="flex-shrink-0 ml-2"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Ticket Information */}
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="text-gray-500 flex items-center space-x-1">
              <User className="w-4 h-4" />
              <span>Created by</span>
            </label>
            <p className="font-medium">
              {ticket.created_by.first_name} {ticket.created_by.last_name}
            </p>
            <p className="text-gray-500">{ticket.created_by.email}</p>
          </div>
          
          {ticket.assigned_to && (
            <div>
              <label className="text-gray-500 flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>Assigned to</span>
              </label>
              <p className="font-medium">
                {ticket.assigned_to.first_name} {ticket.assigned_to.last_name}
              </p>
              <p className="text-gray-500">{ticket.assigned_to.role?.replace('_', ' ')}</p>
            </div>
          )}
          
          <div>
            <label className="text-gray-500 flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created</span>
            </label>
            <p className="font-medium">{new Date(ticket.created_at).toLocaleDateString()}</p>
            <p className="text-gray-500">{new Date(ticket.created_at).toLocaleTimeString()}</p>
          </div>
          
          {ticket.departments && (
            <div>
              <label className="text-gray-500 flex items-center space-x-1">
                <Building className="w-4 h-4" />
                <span>Department</span>
              </label>
              <p className="font-medium">{ticket.departments.name}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTicketView;
