
-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Department admins can manage broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "All authenticated users can view active broadcasts" ON public.broadcasts;

-- Create a security definer function to create broadcasts with proper permissions
CREATE OR REPLACE FUNCTION public.create_broadcast_with_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_target_audience text,
  p_target_department_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, broadcast_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  new_broadcast_id uuid;
BEGIN
  -- Get user record to check permissions
  SELECT * INTO user_record
  FROM users
  WHERE id = p_user_id AND is_active = true;
  
  -- Check if user exists and is active
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'User not found or inactive'::text;
    RETURN;
  END IF;
  
  -- Check if user has permission to create broadcasts
  IF user_record.role NOT IN ('super_admin', 'department_admin') THEN
    RETURN QUERY SELECT false, NULL::uuid, 'Insufficient permissions to create broadcasts'::text;
    RETURN;
  END IF;
  
  -- For department admins, ensure they can only create department_specific broadcasts for their own department
  IF user_record.role = 'department_admin' THEN
    IF p_target_audience != 'department_specific' OR p_target_department_id != user_record.department_id THEN
      RETURN QUERY SELECT false, NULL::uuid, 'Department admins can only create broadcasts for their own department'::text;
      RETURN;
    END IF;
  END IF;
  
  -- Insert the broadcast
  INSERT INTO broadcasts (
    title,
    message,
    created_by,
    target_audience,
    target_department_id,
    is_active
  ) VALUES (
    p_title,
    p_message,
    p_user_id,
    p_target_audience,
    p_target_department_id,
    true
  ) RETURNING id INTO new_broadcast_id;
  
  RETURN QUERY SELECT true, new_broadcast_id, 'Broadcast created successfully'::text;
END;
$$;

-- Create simplified RLS policies for viewing broadcasts
CREATE POLICY "Authenticated users can view active broadcasts" 
  ON public.broadcasts 
  FOR SELECT 
  USING (is_active = true);

-- Create policy for deleting broadcasts (super admins and creators)
CREATE POLICY "Users can delete their own broadcasts or super admins can delete any" 
  ON public.broadcasts 
  FOR DELETE 
  USING (
    created_by = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
      AND role = 'super_admin' 
      AND is_active = true
    )
  );
