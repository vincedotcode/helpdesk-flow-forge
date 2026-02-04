
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DepartmentUser, TicketStatus } from '@/types/ticket';

interface TicketAssignmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTicket: { id: string; title: string } | null;
  departmentTechnicians: DepartmentUser[];
  assignmentData: {
    assigned_to: string;
    status: TicketStatus;
  };
  onAssignmentDataChange: (data: { assigned_to: string; status: TicketStatus }) => void;
  onAssign: () => void;
  loading: boolean;
}

const TicketAssignmentDialog: React.FC<TicketAssignmentDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedTicket,
  departmentTechnicians,
  assignmentData,
  onAssignmentDataChange,
  onAssign,
  loading
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Ticket</DialogTitle>
          <DialogDescription>
            Assign "{selectedTicket?.title}" to a department team member
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="technician">Select Assignee</Label>
            <Select 
              value={assignmentData.assigned_to} 
              onValueChange={(value) => onAssignmentDataChange({ ...assignmentData, assigned_to: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {departmentTechnicians.map((tech) => (
                  <SelectItem key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name} ({tech.email}) • {tech.role.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {departmentTechnicians.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No eligible assignees available for this department.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={assignmentData.status} 
              onValueChange={(value: TicketStatus) => onAssignmentDataChange({ ...assignmentData, status: value })}
            >
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onAssign} disabled={loading || departmentTechnicians.length === 0}>
            {loading ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TicketAssignmentDialog;
