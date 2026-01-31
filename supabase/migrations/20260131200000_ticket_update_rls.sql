-- Update tickets RLS policy to honor the custom session-based user lookup
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON public.tickets;

CREATE POLICY "Assigned users and admins can update tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = public.get_current_user_from_session()
        AND u.is_active = true
        AND (
          u.id = public.tickets.assigned_to
          OR u.id = public.tickets.created_by
          OR u.role IN ('super_admin', 'department_admin')
        )
    )
  );
