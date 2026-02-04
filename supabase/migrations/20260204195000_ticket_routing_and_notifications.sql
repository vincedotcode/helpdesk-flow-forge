-- Improve ticket routing fallback and notification delivery

-- Auto-assign to department technician when possible, otherwise fall back to any active technician.
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  tech_id uuid;
  dept_admin_id uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT id INTO tech_id
    FROM public.users u
    WHERE u.department_id = NEW.department_id
      AND u.role = 'department_technician'
      AND u.is_active = true
    ORDER BY (
        SELECT COUNT(*) FROM public.tickets t
        WHERE t.assigned_to = u.id
          AND t.status IN ('open', 'in_progress')
      ),
      u.updated_at
    LIMIT 1;
  END IF;

  IF tech_id IS NULL THEN
    SELECT id INTO tech_id
    FROM public.users u
    WHERE u.role = 'department_technician'
      AND u.is_active = true
    ORDER BY (
        SELECT COUNT(*) FROM public.tickets t
        WHERE t.assigned_to = u.id
          AND t.status IN ('open', 'in_progress')
      ),
      u.updated_at
    LIMIT 1;
  END IF;

  IF tech_id IS NOT NULL THEN
    NEW.assigned_to = tech_id;
    NEW.status = 'in_progress';
    RETURN NEW;
  END IF;

  IF NEW.department_id IS NOT NULL THEN
    SELECT id INTO dept_admin_id
    FROM public.users u
    WHERE u.department_id = NEW.department_id
      AND u.role = 'department_admin'
      AND u.is_active = true
    ORDER BY u.updated_at
    LIMIT 1;

    IF dept_admin_id IS NOT NULL THEN
      NEW.assigned_to = dept_admin_id;
      NEW.status = 'in_progress';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON public.tickets;
CREATE TRIGGER auto_assign_ticket_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket_on_insert();

-- Ensure ticket creation notifications are inserted reliably under custom auth.
CREATE OR REPLACE FUNCTION public.create_ticket_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  SELECT id INTO dept_admin_id
  FROM public.users
  WHERE department_id = NEW.department_id
    AND role = 'department_admin'
    AND is_active = true
  LIMIT 1;

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
$$;

DROP TRIGGER IF EXISTS trigger_create_ticket_notification ON public.tickets;
CREATE TRIGGER trigger_create_ticket_notification
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ticket_notification();

-- Ensure status updates always notify the ticket creator.
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
