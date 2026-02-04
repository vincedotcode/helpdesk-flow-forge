-- Ensure ticket status notifications are reliably created and visible to the ticket creator.

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Keep notification RLS aligned with custom session auth (and auth.uid fallback).
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    user_id = public.get_current_user_from_session()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    user_id = public.get_current_user_from_session()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.get_current_user_from_session() IS NOT NULL
    OR auth.uid() IS NOT NULL
  );

-- Ensure status changes always create a notification for the ticket creator.
CREATE OR REPLACE FUNCTION public.notify_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'ticket_status_updated',
      'Ticket Status Updated',
      'Your ticket "' || NEW.title || '" status changed from "' || OLD.status || '" to "' || NEW.status || '".'
    );
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
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
$$;

DROP TRIGGER IF EXISTS trigger_notify_ticket_update ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_update
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_ticket_update();
