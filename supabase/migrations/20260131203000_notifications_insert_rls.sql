-- Allow authenticated sessions to insert notifications even when they target other users.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.get_current_user_from_session() IS NOT NULL
    OR auth.uid() IS NOT NULL
  );
