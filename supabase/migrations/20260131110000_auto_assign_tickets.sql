-- Automatically assign new tickets to department technicians, falling back to the department admin.
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  tech_id uuid;
  dept_admin_id uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL OR NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

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

  IF tech_id IS NOT NULL THEN
    NEW.assigned_to = tech_id;
    NEW.status = 'in_progress';
    RETURN NEW;
  END IF;

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON public.tickets;
CREATE TRIGGER auto_assign_ticket_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket_on_insert();
