-- Update notifications RLS to use custom session lookup
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated sessions can insert notifications (including trigger-based inserts)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.get_current_user_from_session() IS NOT NULL
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = public.get_current_user_from_session());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id = public.get_current_user_from_session());

-- Notify assigned users when a ticket is created (covers auto-assignment)
CREATE OR REPLACE FUNCTION public.create_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Get department admin for the ticket's department
  SELECT id INTO dept_admin_id
  FROM public.users
  WHERE department_id = NEW.department_id 
    AND role = 'department_admin' 
    AND is_active = true
  LIMIT 1;

  -- Create notification for department admin if found
  IF dept_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      dept_admin_id,
      NEW.id,
      'ticket_created',
      'New Ticket Created',
      'A new ticket "' || NEW.title || '" has been created and needs your attention.'
    );
  END IF;

  -- Notify the assignee if the ticket was auto-assigned on insert
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.created_by THEN
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Allow read receipt updates to bypass RLS while validating session ownership
CREATE OR REPLACE FUNCTION public.mark_ticket_chat_messages_read(p_ticket_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_user_id uuid;
BEGIN
  session_user_id := public.get_current_user_from_session();
  IF session_user_id IS NULL OR session_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ticket_chat_messages
  SET read_by = CASE
    WHEN p_user_id = ANY(read_by) THEN read_by
    ELSE array_append(coalesce(read_by, ARRAY[]::uuid[]), p_user_id)
  END
  WHERE ticket_id = p_ticket_id
    AND NOT (p_user_id = ANY(read_by));
END;
$$;

-- Ensure chat message delete policy uses custom session lookup
ALTER TABLE public.ticket_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Message authors can delete their messages" ON public.ticket_chat_messages;
CREATE POLICY "Message authors can delete their messages"
  ON public.ticket_chat_messages
  FOR DELETE
  USING (
    ticket_chat_messages.user_id = public.get_current_user_from_session()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = public.get_current_user_from_session()
        AND u.is_active = true
        AND u.role IN ('super_admin', 'department_admin')
    )
  );

-- Allow authorized users to delete an entire ticket chat
CREATE OR REPLACE FUNCTION public.delete_ticket_chat(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_user_id uuid;
  ticket_department_id uuid;
  ticket_creator_id uuid;
  ticket_assignee_id uuid;
  can_delete boolean;
BEGIN
  session_user_id := public.get_current_user_from_session();
  IF session_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT department_id, created_by, assigned_to
  INTO ticket_department_id, ticket_creator_id, ticket_assignee_id
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = session_user_id
      AND u.is_active = true
      AND (
        u.role = 'super_admin'
        OR (u.role = 'department_admin' AND u.department_id = ticket_department_id)
        OR u.id = ticket_creator_id
        OR (ticket_assignee_id IS NOT NULL AND u.id = ticket_assignee_id)
      )
  ) INTO can_delete;

  IF NOT can_delete THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.ticket_chat_messages
  WHERE ticket_id = p_ticket_id;
END;
$$;
