
-- Fix RLS policies for broadcasts table
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Department admins can manage department broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Users can view broadcasts meant for them" ON public.broadcasts;

-- Create simplified RLS policies that work with our auth system
CREATE POLICY "Super admins can manage all broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
      AND role = 'super_admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Department admins can manage broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.user_sessions us ON u.id = us.user_id
      WHERE us.session_token = current_setting('request.headers', true)::json->>'authorization'
      AND u.role = 'department_admin' 
      AND u.is_active = true
      AND us.expires_at > now()
      AND (
        broadcasts.created_by = u.id 
        OR broadcasts.target_department_id = u.department_id
      )
    )
  );

CREATE POLICY "All authenticated users can view active broadcasts" 
  ON public.broadcasts 
  FOR SELECT 
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM public.user_sessions 
      WHERE session_token = current_setting('request.headers', true)::json->>'authorization'
      AND expires_at > now()
    )
  );

-- Fix RLS policies for broadcast_recipients table
DROP POLICY IF EXISTS "Users can manage their own broadcast receipts" ON public.broadcast_recipients;
DROP POLICY IF EXISTS "Broadcast creators can view recipients" ON public.broadcast_recipients;

CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (
    user_id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
  );

CREATE POLICY "Broadcast creators can view recipients" 
  ON public.broadcast_recipients 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id 
      AND b.created_by = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
    )
  );

-- Create function to create notifications when broadcast is created
CREATE OR REPLACE FUNCTION public.create_broadcast_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create notifications for all recipients of the broadcast
  INSERT INTO notifications (user_id, type, title, message)
  SELECT 
    br.user_id,
    'broadcast_created',
    'New Broadcast: ' || NEW.title,
    NEW.message
  FROM broadcast_recipients br
  WHERE br.broadcast_id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create notifications when broadcast is created
DROP TRIGGER IF EXISTS create_broadcast_notification_trigger ON public.broadcasts;
CREATE TRIGGER create_broadcast_notification_trigger
  AFTER INSERT ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_broadcast_notification();
