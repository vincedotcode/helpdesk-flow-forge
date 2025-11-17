
-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their own notifications
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create policy that allows users to update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Create function to create notification for department admin when ticket is created
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Get department admin for the ticket's department
  SELECT id INTO dept_admin_id
  FROM users
  WHERE department_id = NEW.department_id 
    AND role = 'department_admin' 
    AND is_active = true
  LIMIT 1;

  -- Create notification for department admin if found
  IF dept_admin_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      dept_admin_id,
      NEW.id,
      'ticket_created',
      'New Ticket Created',
      'A new ticket "' || NEW.title || '" has been created and needs your attention.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify on ticket updates
CREATE OR REPLACE FUNCTION notify_ticket_update()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Notify ticket creator about status changes
  IF OLD.status != NEW.status THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'ticket_status_updated',
      'Ticket Status Updated',
      'Your ticket "' || NEW.title || '" status has been changed from "' || OLD.status || '" to "' || NEW.status || '".'
    );
  END IF;

  -- Notify technician when assigned
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'ticket_assigned',
      'Ticket Assigned to You',
      'You have been assigned to ticket "' || NEW.title || '".'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_create_ticket_notification
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_notification();

CREATE TRIGGER trigger_notify_ticket_update
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_update();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
