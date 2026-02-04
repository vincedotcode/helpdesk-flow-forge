-- Combined migration script for helpdesk-flow-forge.
-- Run sequentially in the Supabase SQL editor to apply every migration the project depends on.
-- Each block below mirrors the existing files under supabase/migrations.

-- ===================================================================
-- Migration: 20250613050449_3c5eeeb5-99cb-43c3-b2db-7dfe17384699.sql
-- ===================================================================

-- Create enum for user roles
CREATE TYPE IF NOT EXISTS user_role AS ENUM ('super_admin', 'department_admin', 'department_technician', 'end_user');

-- Create enum for ticket status
CREATE TYPE IF NOT EXISTS ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Create enum for ticket priority
CREATE TYPE IF NOT EXISTS ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (custom user management, not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'end_user',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    priority ticket_priority DEFAULT 'medium',
    created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for custom auth
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_department ON tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Insert a default super admin user (password: admin123 - should be changed in production)
INSERT INTO users (email, password_hash, first_name, last_name, role) 
VALUES ('admin@helpdesk.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tickets_updated_at ON tickets;
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- Migration: 20250613051912_8046e272-09b1-4b74-a014-c8b8bcec442e.sql
-- ===================================================================

-- Create the authenticate_user function
CREATE OR REPLACE FUNCTION public.authenticate_user(
  user_email TEXT,
  user_password TEXT
)
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role user_role,
  department_id UUID,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  password_valid BOOLEAN;
BEGIN
  -- Get user record
  SELECT * INTO user_record
  FROM users u
  WHERE u.email = user_email AND u.is_active = true;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Verify password using crypt function
  SELECT (user_record.password_hash = crypt(user_password, user_record.password_hash)) INTO password_valid;
  
  -- If password is valid, return user data
  IF password_valid THEN
    RETURN QUERY
    SELECT 
      user_record.id,
      user_record.email,
      user_record.first_name,
      user_record.last_name,
      user_record.role,
      user_record.department_id,
      user_record.is_active;
  END IF;
END;
$$;

-- Create the register_user function  
CREATE OR REPLACE FUNCTION public.register_user(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM users
  WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Hash the password using crypt
  SELECT crypt(user_password, gen_salt('bf')) INTO hashed_password;
  
  -- Insert new user
  INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
  VALUES (user_email, hashed_password, user_first_name, user_last_name, 'end_user', true)
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT true, new_user_id, 'User created successfully'::TEXT;
END;
$$;

-- Create the create_user_by_admin function
CREATE OR REPLACE FUNCTION public.create_user_by_admin(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  user_role user_role DEFAULT 'end_user',
  user_department_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  user_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id UUID;
  new_user_id UUID;
  hashed_password TEXT;
BEGIN
  -- Check if user already exists
  SELECT id INTO existing_user_id
  FROM users
  WHERE email = user_email;
  
  IF existing_user_id IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'User already exists'::TEXT;
    RETURN;
  END IF;
  
  -- Hash the password using crypt
  SELECT crypt(user_password, gen_salt('bf')) INTO hashed_password;
  
  -- Insert new user
  INSERT INTO users (email, password_hash, first_name, last_name, role, department_id, is_active)
  VALUES (user_email, hashed_password, user_first_name, user_last_name, user_role, user_department_id, true)
  RETURNING id INTO new_user_id;
  
  RETURN QUERY SELECT true, new_user_id, 'User created successfully'::TEXT;
END;
$$;

-- Update the existing super admin user with a properly hashed password
UPDATE users 
SET password_hash = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@helpdesk.com';

-- ===================================================================
-- Migration: 20250614054858_4e75a83e-e19e-4793-86d3-31e01beea6a0.sql
-- ===================================================================

-- First, let's modify the tickets table to include more detailed fields
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS affected_systems TEXT,
ADD COLUMN IF NOT EXISTS steps_to_reproduce TEXT,
ADD COLUMN IF NOT EXISTS expected_behavior TEXT,
ADD COLUMN IF NOT EXISTS actual_behavior TEXT,
ADD COLUMN IF NOT EXISTS business_impact TEXT,
ADD COLUMN IF NOT EXISTS additional_info TEXT,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Create a storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for ticket attachments
DROP POLICY IF EXISTS "Anyone can upload ticket attachments" ON storage.objects;
CREATE POLICY "Anyone can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Authenticated users can update ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update ticket attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Authenticated users can delete ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can delete ticket attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments');

-- Create a chat messages table for ticket communication
CREATE TABLE IF NOT EXISTS ticket_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ticket_chat_messages_ticket_id ON ticket_chat_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_chat_messages_created_at ON ticket_chat_messages(created_at);

-- Create trigger to update updated_at timestamp for chat messages
DROP TRIGGER IF EXISTS update_ticket_chat_messages_updated_at ON ticket_chat_messages;
CREATE TRIGGER update_ticket_chat_messages_updated_at 
BEFORE UPDATE ON ticket_chat_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Allow anyone to view all tickets (as requested)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view tickets" ON tickets;
CREATE POLICY "Anyone can view tickets"
ON tickets FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tickets" ON tickets;
CREATE POLICY "Authenticated users can create tickets"
ON tickets FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON tickets;
CREATE POLICY "Assigned users and admins can update tickets"
ON tickets FOR UPDATE
USING (
    assigned_to = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    OR created_by = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND role IN ('super_admin', 'department_admin')
    )
);

-- RLS policies for chat messages
ALTER TABLE ticket_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view chat messages" ON ticket_chat_messages;
CREATE POLICY "Anyone can view chat messages"
ON ticket_chat_messages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create chat messages" ON ticket_chat_messages;
CREATE POLICY "Authenticated users can create chat messages"
ON ticket_chat_messages FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Message authors can update their messages" ON ticket_chat_messages;
CREATE POLICY "Message authors can update their messages"
ON ticket_chat_messages FOR UPDATE
USING (
    user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
);

-- ===================================================================
-- Migration: 20250615053228_b8ddee12-bfa2-46e9-9beb-18633a4d32eb.sql
-- ===================================================================

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create policy that allows users to update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Create function to create notification for department admin when ticket is created
CREATE OR REPLACE FUNCTION create_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Get department admin for the ticket's department
  SELECT id INTO dept_admin_id
  FROM users
  WHERE department_id = NEW.department_id 
    AND role = 'department_admin' 
    AND is_active = true
  LIMIT 1;

  -- Create notification for department admin if found
  IF dept_admin_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      dept_admin_id,
      NEW.id,
      'ticket_created',
      'New Ticket Created',
      'A new ticket "' || NEW.title || '" has been created and needs your attention.'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to notify on ticket updates
CREATE OR REPLACE FUNCTION notify_ticket_update()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Notify ticket creator about status changes
  IF OLD.status != NEW.status THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.created_by,
      NEW.id,
      'ticket_status_updated',
      'Ticket Status Updated',
      'Your ticket "' || NEW.title || '" status has been changed from "' || OLD.status || '" to "' || NEW.status || '".'
    );
  END IF;

  -- Notify technician when assigned
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'ticket_assigned',
      'Ticket Assigned to You',
      'You have been assigned to ticket "' || NEW.title || '".'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_create_ticket_notification ON tickets;
CREATE TRIGGER trigger_create_ticket_notification
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION create_ticket_notification();

DROP TRIGGER IF EXISTS trigger_notify_ticket_update ON tickets;
CREATE TRIGGER trigger_notify_ticket_update
  AFTER UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_update();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ===================================================================
-- Migration: 20250616062404_dc49e877-3a94-416d-a108-82092ddf591c.sql
-- ===================================================================

-- Create knowledge base articles table
CREATE TABLE IF NOT EXISTS public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create knowledge base chat sessions table
CREATE TABLE IF NOT EXISTS public.knowledge_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge base chat messages table
CREATE TABLE IF NOT EXISTS public.knowledge_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES knowledge_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  message_type VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge_articles
DROP POLICY IF EXISTS "Everyone can view active knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Everyone can view active knowledge articles" 
  ON public.knowledge_articles 
  FOR SELECT 
  USING (is_active = true);

DROP POLICY IF EXISTS "Super admins can manage knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Super admins can manage knowledge articles" 
  ON public.knowledge_articles 
  FOR ALL 
  USING (true);

-- Create policies for knowledge_chat_sessions
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.knowledge_chat_sessions;
CREATE POLICY "Users can manage their own chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR ALL 
  USING (true);

-- Create policies for knowledge_chat_messages
DROP POLICY IF EXISTS "Users can manage chat messages" ON public.knowledge_chat_messages;
CREATE POLICY "Users can manage chat messages" 
  ON public.knowledge_chat_messages 
  FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_active ON knowledge_articles(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_chat_sessions_user_id ON knowledge_chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_chat_messages_session_id ON knowledge_chat_messages(session_id, created_at);

-- ===================================================================
-- Migration: 20250616065359_9656bc80-86ac-41d3-a1dc-89845d74b7f9.sql
-- ===================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view active knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Super admins can manage knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.knowledge_chat_sessions;
DROP POLICY IF EXISTS "Users can manage chat messages" ON public.knowledge_chat_messages;

-- Create new policies that work with custom authentication
DROP POLICY IF EXISTS "Allow all operations on knowledge articles" ON public.knowledge_articles;
CREATE POLICY "Allow all operations on knowledge articles" 
  ON public.knowledge_articles 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on chat sessions" ON public.knowledge_chat_sessions;
CREATE POLICY "Allow all operations on chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations on chat messages" ON public.knowledge_chat_messages;
CREATE POLICY "Allow all operations on chat messages" 
  ON public.knowledge_chat_messages 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- ===================================================================
-- Migration: 20250620043617_b58df01e-4f72-4b85-834b-2596c97e1553.sql
-- ===================================================================

-- Create broadcast table
CREATE TABLE IF NOT EXISTS public.broadcasts (
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
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
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
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
CREATE POLICY "Super admins can manage all broadcasts" 
  ON public.broadcasts 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ));

DROP POLICY IF EXISTS "Department admins can manage department broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "Users can view broadcasts meant for them" ON public.broadcasts;
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
DROP POLICY IF EXISTS "Users can manage their own broadcast receipts" ON public.broadcast_recipients;
CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Broadcast creators can view recipients" ON public.broadcast_recipients;
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
DROP TRIGGER IF EXISTS create_broadcast_recipients_trigger ON public.broadcasts;
CREATE TRIGGER create_broadcast_recipients_trigger
  AFTER INSERT ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_broadcast_recipients();

-- Add updated_at trigger for broadcasts
DROP TRIGGER IF EXISTS update_broadcasts_updated_at ON public.broadcasts;
CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- Migration: 20250620051803_82a8575f-9166-4f1f-bf33-bfe4f842c696.sql
-- ===================================================================

-- Drop existing problematic RLS policies
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Department admins can manage broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "All authenticated users can view active broadcasts" ON public.broadcasts;

-- Create security definer function to create broadcasts with proper permissions
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
DROP POLICY IF EXISTS "Authenticated users can view active broadcasts" ON public.broadcasts;
CREATE POLICY "Authenticated users can view active broadcasts" 
  ON public.broadcasts 
  FOR SELECT 
  USING (is_active = true);

-- Create policy for deleting broadcasts (super admins and creators)
DROP POLICY IF EXISTS "Users can delete their own broadcasts or super admins can delete any" ON public.broadcasts;
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

-- ===================================================================
-- Migration: 20250620052602_7b53624b-b47e-452c-a4ec-256774f693bd.sql
-- ===================================================================

-- Add importance level to broadcasts table
ALTER TABLE public.broadcasts 
ADD COLUMN importance VARCHAR(10) CHECK (importance IN ('low', 'medium', 'high')) DEFAULT 'medium';

-- Create broadcast notifications table to track notifications sent to users
CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
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
DROP POLICY IF EXISTS "Users can view their own broadcast notifications" ON public.broadcast_notifications;
CREATE POLICY "Users can view their own broadcast notifications" 
  ON public.broadcast_notifications 
  FOR SELECT 
  USING (user_id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1));

-- Policy for users to update their own broadcast notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own broadcast notifications" ON public.broadcast_notifications;
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

-- ===================================================================
-- Migration: 20250620055848_e70c221a-8d50-4645-8fbd-51be0cc83719.sql
-- ===================================================================

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
DROP POLICY IF EXISTS "Users can view their own broadcast notifications" ON public.broadcast_notifications;
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

DROP POLICY IF EXISTS "Users can update their own broadcast notifications" ON public.broadcast_notifications;
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

-- ===================================================================
-- Migration: 20250620120000_fix-broadcast-policies.sql
-- ===================================================================

-- Fix RLS policies for broadcasts table
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Department admins can manage department broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Users can view broadcasts meant for them" ON public.broadcasts;

-- Create simplified RLS policies that work with our auth system
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "Department admins can manage broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "All authenticated users can view active broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "Users can manage their own broadcast receipts" ON public.broadcast_recipients;
CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (
    user_id = (SELECT user_id FROM public.user_sessions WHERE session_token = current_setting('request.headers', true)::json->>'authorization' AND expires_at > now() LIMIT 1)
  );

DROP POLICY IF EXISTS "Broadcast creators can view recipients" ON public.broadcast_recipients;
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
DROP TRIGGER IF EXISTS create_broadcast_notification_trigger ON public.broadcasts;
CREATE TRIGGER create_broadcast_notification_trigger
  AFTER INSERT ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_broadcast_notification();

-- ===================================================================
-- Migration: 20250620130000_fix-broadcast-rls-with-security-definer.sql
-- ===================================================================

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
DROP POLICY IF EXISTS "Super admins can manage all broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "Department admins can manage broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "All authenticated users can view active broadcasts" ON public.broadcasts;
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

DROP POLICY IF EXISTS "Users can manage their own broadcast receipts" ON public.broadcast_recipients;
CREATE POLICY "Users can manage their own broadcast receipts" 
  ON public.broadcast_recipients 
  FOR ALL 
  USING (
    user_id = public.get_current_user_from_session()
  );

DROP POLICY IF EXISTS "Broadcast creators can view recipients" ON public.broadcast_recipients;
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

-- ===================================================================
-- Migration: 20250621140000_add_external_supplier_fields_to_tickets.sql
-- ===================================================================

-- Add external supplier costing fields to tickets
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS external_supplier_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_supplier_description TEXT,
ADD COLUMN IF NOT EXISTS external_supplier_cost NUMERIC(14,2);

-- ===================================================================
-- Migration: 20260131091000_add_ticket_chat_read_receipts.sql
-- ===================================================================

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

-- ===================================================================
-- Migration: 20260131110000_auto_assign_tickets.sql
-- ===================================================================

-- Automatically assign new tickets to department technicians, falling back to the department admin.
CREATE OR REPLACE FUNCTION public.auto_assign_ticket_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  tech_id uuid;
  dept_admin_id uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL OR NEW.department_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO tech_id
  FROM public.users u
  WHERE u.department_id = NEW.department_id
    AND u.role = 'department_technician'
    AND u.is_active = true
  ORDER BY (
      SELECT COUNT(*) FROM public.tickets t
      WHERE t.assigned_to = u.id
        AND t.status IN ('open', 'in_progress')
    ),
    u.updated_at
  LIMIT 1;

  IF tech_id IS NOT NULL THEN
    NEW.assigned_to = tech_id;
    NEW.status = 'in_progress';
    RETURN NEW;
  END IF;

  SELECT id INTO dept_admin_id
  FROM public.users u
  WHERE u.department_id = NEW.department_id
    AND u.role = 'department_admin'
    AND u.is_active = true
  ORDER BY u.updated_at
  LIMIT 1;

  IF dept_admin_id IS NOT NULL THEN
    NEW.assigned_to = dept_admin_id;
    NEW.status = 'in_progress';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON public.tickets;
DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON public.tickets;
CREATE TRIGGER auto_assign_ticket_trigger
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_ticket_on_insert();

-- ===================================================================
-- Migration: 20260131112000_ticket_chat_notifications.sql
-- ===================================================================

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
DROP TRIGGER IF EXISTS notify_ticket_chat_on_insert ON public.ticket_chat_messages;
CREATE TRIGGER notify_ticket_chat_on_insert
  AFTER INSERT ON public.ticket_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_chat_insert();

-- ===================================================================
-- Migration: 20260131200000_ticket_update_rls.sql
-- ===================================================================

-- Update tickets RLS policy to honor the custom session-based user lookup
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON public.tickets;

DROP POLICY IF EXISTS "Assigned users and admins can update tickets" ON public.tickets;
CREATE POLICY "Assigned users and admins can update tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = public.get_current_user_from_session()
        AND u.is_active = true
        AND (
          u.id = public.tickets.assigned_to
          OR u.id = public.tickets.created_by
          OR u.role IN ('super_admin', 'department_admin')
        )
    )
  );

-- ===================================================================
-- Migration: 20260131203000_notifications_insert_rls.sql
-- ===================================================================

-- Allow authenticated sessions to insert notifications even when they target other users.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    public.get_current_user_from_session() IS NOT NULL
    OR auth.uid() IS NOT NULL
  );

-- ===================================================================
-- Migration: 20260131205000_ticket_chat_delete_policy.sql
-- ===================================================================

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

-- Allow admins to delete an entire ticket chat
CREATE OR REPLACE FUNCTION public.delete_ticket_chat(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_user_id uuid;
  ticket_department_id uuid;
  ticket_creator_id uuid;
  ticket_assignee_id uuid;
  can_delete boolean;
BEGIN
  session_user_id := public.get_current_user_from_session();
  IF session_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT department_id, created_by, assigned_to
  INTO ticket_department_id, ticket_creator_id, ticket_assignee_id
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = session_user_id
      AND u.is_active = true
      AND (
        u.role = 'super_admin'
        OR (u.role = 'department_admin' AND u.department_id = ticket_department_id)
        OR u.id = ticket_creator_id
        OR (ticket_assignee_id IS NOT NULL AND u.id = ticket_assignee_id)
      )
  ) INTO can_delete;

  IF NOT can_delete THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM public.ticket_chat_messages
  WHERE ticket_id = p_ticket_id;
END;
$$;

-- ===================================================================
-- Migration: 20260203130000_fix_notifications_and_chat.sql
-- ===================================================================

-- Update notifications RLS to use custom session lookup
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = public.get_current_user_from_session());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id = public.get_current_user_from_session());

-- Notify assigned users when a ticket is created (covers auto-assignment)
CREATE OR REPLACE FUNCTION public.create_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  dept_admin_id UUID;
BEGIN
  -- Get department admin for the ticket's department
  SELECT id INTO dept_admin_id
  FROM public.users
  WHERE department_id = NEW.department_id 
    AND role = 'department_admin' 
    AND is_active = true
  LIMIT 1;

  -- Create notification for department admin if found
  IF dept_admin_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      dept_admin_id,
      NEW.id,
      'ticket_created',
      'New Ticket Created',
      'A new ticket "' || NEW.title || '" has been created and needs your attention.'
    );
  END IF;

  -- Notify the assignee if the ticket was auto-assigned on insert
  IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to <> NEW.created_by THEN
    INSERT INTO public.notifications (user_id, ticket_id, type, title, message)
    VALUES (
      NEW.assigned_to,
      NEW.id,
      'ticket_assigned',
      'Ticket Assigned to You',
      'You have been assigned to ticket "' || NEW.title || '".'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Allow read receipt updates to bypass RLS while validating session ownership
CREATE OR REPLACE FUNCTION public.mark_ticket_chat_messages_read(p_ticket_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_user_id uuid;
BEGIN
  session_user_id := public.get_current_user_from_session();
  IF session_user_id IS NULL OR session_user_id <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.ticket_chat_messages
  SET read_by = CASE
    WHEN p_user_id = ANY(read_by) THEN read_by
    ELSE array_append(coalesce(read_by, ARRAY[]::uuid[]), p_user_id)
  END
  WHERE ticket_id = p_ticket_id
    AND NOT (p_user_id = ANY(read_by));
END;
$$;

-- Ensure chat message delete policy uses custom session lookup
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
