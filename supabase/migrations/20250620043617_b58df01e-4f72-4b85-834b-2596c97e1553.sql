
-- Create broadcast table
CREATE TABLE public.broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL,
  target_audience VARCHAR NOT NULL CHECK (target_audience IN ('all_users', 'department_admin', 'department_technician', 'department_specific')),
  target_department_id UUID REFERENCES departments(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create broadcast recipients table to track who should receive the broadcast
CREATE TABLE public.broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for broadcasts table
CREATE POLICY "Super admins can manage all broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ));

CREATE POLICY "Department admins can manage department broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'department_admin' 
    AND is_active = true
    AND (
      broadcasts.created_by = auth.uid() 
      OR broadcasts.target_department_id = users.department_id
    )
  ));

CREATE POLICY "Users can view broadcasts meant for them" 
  ON public.broadcasts 
  FOR SELECT 
  USING (
    broadcasts.is_active = true 
    AND (
      broadcasts.target_audience = 'all_users'
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND (
          (broadcasts.target_audience = 'department_admin' AND users.role = 'department_admin')
          OR (broadcasts.target_audience = 'department_technician' AND users.role = 'department_technician')
          OR (broadcasts.target_audience = 'department_specific' AND users.department_id = broadcasts.target_department_id)
        )
      )
    )
  );

-- Policies for broadcast_recipients table
CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Broadcast creators can view recipients" 
  ON public.broadcast_recipients 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM broadcasts 
    WHERE broadcasts.id = broadcast_recipients.broadcast_id 
    AND broadcasts.created_by = auth.uid()
  ));

-- Function to automatically create broadcast recipients when a broadcast is created
CREATE OR REPLACE FUNCTION public.create_broadcast_recipients()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert recipients based on target audience
  IF NEW.target_audience = 'all_users' THEN
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT NEW.id, id FROM users WHERE is_active = true;
  ELSIF NEW.target_audience = 'department_admin' THEN
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT NEW.id, id FROM users WHERE role = 'department_admin' AND is_active = true;
  ELSIF NEW.target_audience = 'department_technician' THEN
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT NEW.id, id FROM users WHERE role = 'department_technician' AND is_active = true;
  ELSIF NEW.target_audience = 'department_specific' AND NEW.target_department_id IS NOT NULL THEN
    INSERT INTO broadcast_recipients (broadcast_id, user_id)
    SELECT NEW.id, id FROM users WHERE department_id = NEW.target_department_id AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-populate recipients
CREATE TRIGGER create_broadcast_recipients_trigger
  AFTER INSERT ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_broadcast_recipients();

-- Add updated_at trigger for broadcasts
CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
