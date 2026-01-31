-- Create notifications for ticket chat messages so users are alerted in-app.
CREATE OR REPLACE FUNCTION public.notify_on_ticket_chat_insert()
RETURNS TRIGGER AS $$
DECLARE
  ticket_owner uuid;
  ticket_assignee uuid;
BEGIN
  SELECT created_by, assigned_to
  INTO ticket_owner, ticket_assignee
  FROM public.tickets
  WHERE id = NEW.ticket_id;

  IF ticket_owner IS NOT NULL AND ticket_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      ticket_owner,
      NEW.ticket_id,
      'ticket_chat_message',
      'New Chat Message',
      'A new message was sent on your ticket.'
    );
  END IF;

  IF ticket_assignee IS NOT NULL AND ticket_assignee <> NEW.user_id AND ticket_assignee <> ticket_owner THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      ticket_assignee,
      NEW.ticket_id,
      'ticket_chat_message',
      'New Chat Message',
      'A client or teammate replied on a ticket you are working on.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_ticket_chat_on_insert ON public.ticket_chat_messages;
CREATE TRIGGER notify_ticket_chat_on_insert
  AFTER INSERT ON public.ticket_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_chat_insert();
