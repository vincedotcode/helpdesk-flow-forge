
-- Add importance level to broadcasts table
ALTER TABLE public.broadcasts 
ADD COLUMN importance VARCHAR(10) CHECK (importance IN ('low', 'medium', 'high')) DEFAULT 'medium';

-- Create broadcast notifications table to track notifications sent to users
CREATE TABLE public.broadcast_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(broadcast_id, user_id)
);

-- Enable RLS on broadcast notifications
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own broadcast notifications
CREATE POLICY "Users can view their own broadcast notifications" 
  ON public.broadcast_notifications 
  FOR SELECT 
  USING (user_id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1));

-- Policy for users to update their own broadcast notifications (mark as read)
CREATE POLICY "Users can update their own broadcast notifications" 
  ON public.broadcast_notifications 
  FOR UPDATE 
  USING (user_id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1));

-- Update the create_broadcast_with_user function to include importance and create notifications
CREATE OR REPLACE FUNCTION public.create_broadcast_with_user(
  p_user_id uuid,
  p_title text,
  p_message text,
  p_target_audience text,
  p_target_department_id uuid DEFAULT NULL,
  p_importance text DEFAULT 'medium'
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
    importance,
    is_active
  ) VALUES (
    p_title,
    p_message,
    p_user_id,
    p_target_audience,
    p_target_department_id,
    p_importance,
    true
  ) RETURNING id INTO new_broadcast_id;
  
  -- Create notifications for all target users
  IF p_target_audience = 'all_users' THEN
    INSERT INTO broadcast_notifications (broadcast_id, user_id)
    SELECT new_broadcast_id, id FROM users WHERE is_active = true;
  ELSIF p_target_audience = 'department_admin' THEN
    INSERT INTO broadcast_notifications (broadcast_id, user_id)
    SELECT new_broadcast_id, id FROM users WHERE role = 'department_admin' AND is_active = true;
  ELSIF p_target_audience = 'department_technician' THEN
    INSERT INTO broadcast_notifications (broadcast_id, user_id)
    SELECT new_broadcast_id, id FROM users WHERE role = 'department_technician' AND is_active = true;
  ELSIF p_target_audience = 'department_specific' AND p_target_department_id IS NOT NULL THEN
    INSERT INTO broadcast_notifications (broadcast_id, user_id)
    SELECT new_broadcast_id, id FROM users WHERE department_id = p_target_department_id AND is_active = true;
  END IF;
  
  RETURN QUERY SELECT true, new_broadcast_id, 'Broadcast created successfully'::text;
END;
$$;

-- Function to get broadcast notifications for a user
CREATE OR REPLACE FUNCTION public.get_user_broadcast_notifications(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  broadcast_id uuid,
  title text,
  message text,
  importance text,
  is_read boolean,
  created_at timestamp with time zone,
  broadcast_created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bn.id,
    bn.broadcast_id,
    b.title,
    b.message,
    b.importance,
    bn.is_read,
    bn.created_at,
    b.created_at as broadcast_created_at
  FROM broadcast_notifications bn
  JOIN broadcasts b ON bn.broadcast_id = b.id
  WHERE bn.user_id = p_user_id AND b.is_active = true
  ORDER BY b.created_at DESC;
END;
$$;
