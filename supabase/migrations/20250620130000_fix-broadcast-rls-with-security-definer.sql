
-- Create security definer function to get current user from session
CREATE OR REPLACE FUNCTION public.get_current_user_from_session()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_id uuid;
  auth_header text;
BEGIN
  -- Try to get authorization header
  BEGIN
    auth_header := current_setting('request.headers', true)::json->>'authorization';
  EXCEPTION WHEN OTHERS THEN
    auth_header := NULL;
  END;
  
  -- If we have an auth header, try to get user from session
  IF auth_header IS NOT NULL AND auth_header != '' THEN
    SELECT us.user_id INTO user_id
    FROM public.user_sessions us
    WHERE us.session_token = auth_header
      AND us.expires_at > now()
    LIMIT 1;
  END IF;
  
  RETURN user_id;
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Department admins can manage broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "All authenticated users can view active broadcasts" ON public.broadcasts;

-- Create new simplified RLS policies using security definer function
CREATE POLICY "Super admins can manage all broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = public.get_current_user_from_session()
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
      WHERE u.id = public.get_current_user_from_session()
      AND u.role = 'department_admin' 
      AND u.is_active = true
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
    AND public.get_current_user_from_session() IS NOT NULL
  );

-- Update broadcast_recipients policies as well
DROP POLICY IF EXISTS "Users can manage their own broadcast receipts" ON public.broadcast_recipients;
DROP POLICY IF EXISTS "Broadcast creators can view recipients" ON public.broadcast_recipients;

CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (
    user_id = public.get_current_user_from_session()
  );

CREATE POLICY "Broadcast creators can view recipients" 
  ON public.broadcast_recipients 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.broadcasts b
      WHERE b.id = broadcast_recipients.broadcast_id 
      AND b.created_by = public.get_current_user_from_session()
    )
  );
