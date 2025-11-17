
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_user_broadcast_notifications(uuid);

-- Recreate the function with proper types
CREATE OR REPLACE FUNCTION public.get_user_broadcast_notifications(p_user_id uuid)
 RETURNS TABLE(
   id uuid, 
   broadcast_id uuid, 
   title character varying, 
   message text, 
   importance character varying, 
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

-- Fix RLS policies for broadcast_notifications table
DROP POLICY IF EXISTS "Users can view their own broadcast notifications" ON public.broadcast_notifications;
DROP POLICY IF EXISTS "Users can update their own broadcast notifications" ON public.broadcast_notifications;

-- Enable RLS on broadcast_notifications if not already enabled
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies that work with our custom session system
CREATE POLICY "Users can view their own broadcast notifications" 
  ON public.broadcast_notifications 
  FOR SELECT 
  USING (
    user_id = (
      SELECT us.user_id 
      FROM public.user_sessions us 
      WHERE us.session_token = current_setting('request.headers', true)::json->>'authorization'
      AND us.expires_at > now() 
      LIMIT 1
    )
  );

CREATE POLICY "Users can update their own broadcast notifications" 
  ON public.broadcast_notifications 
  FOR UPDATE 
  USING (
    user_id = (
      SELECT us.user_id 
      FROM public.user_sessions us 
      WHERE us.session_token = current_setting('request.headers', true)::json->>'authorization'
      AND us.expires_at > now() 
      LIMIT 1
    )
  );

-- Create a function to get all active broadcasts for dashboard display
CREATE OR REPLACE FUNCTION public.get_active_broadcasts_for_dashboard()
 RETURNS TABLE(
   id uuid,
   title character varying,
   message text,
   importance character varying,
   created_at timestamp with time zone,
   target_audience character varying,
   creator_name text,
   department_name character varying
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.message,
    b.importance,
    b.created_at,
    b.target_audience,
    (u.first_name || ' ' || u.last_name) as creator_name,
    d.name as department_name
  FROM broadcasts b
  LEFT JOIN users u ON b.created_by = u.id
  LEFT JOIN departments d ON b.target_department_id = d.id
  WHERE b.is_active = true
  ORDER BY b.created_at DESC;
END;
$$;
