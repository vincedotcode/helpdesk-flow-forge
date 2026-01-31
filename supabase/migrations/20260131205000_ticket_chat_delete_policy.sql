-- Allow chat authors and admins to delete messages
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
