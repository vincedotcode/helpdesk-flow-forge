-- Track which users have read each chat message
ALTER TABLE public.ticket_chat_messages
  ADD COLUMN IF NOT EXISTS read_by uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE OR REPLACE FUNCTION public.ticket_chat_message_initialize_read_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND NOT (NEW.user_id = ANY(NEW.read_by)) THEN
    NEW.read_by := array_append(coalesce(NEW.read_by, ARRAY[]::uuid[]), NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
DROP TRIGGER IF EXISTS ticket_chat_message_initialize_read_by_trigger ON public.ticket_chat_messages;
CREATE TRIGGER ticket_chat_message_initialize_read_by_trigger
  BEFORE INSERT ON public.ticket_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.ticket_chat_message_initialize_read_by();

-- Utility to mark every message for a ticket as read by a specific user
CREATE OR REPLACE FUNCTION public.mark_ticket_chat_messages_read(p_ticket_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.ticket_chat_messages
  SET read_by = CASE
    WHEN p_user_id = ANY(read_by) THEN read_by
    ELSE array_append(coalesce(read_by, ARRAY[]::uuid[]), p_user_id)
  END
  WHERE ticket_id = p_ticket_id;
END;
$$ LANGUAGE plpgsql;
