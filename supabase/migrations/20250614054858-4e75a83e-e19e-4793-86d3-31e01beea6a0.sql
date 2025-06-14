
-- First, let's modify the tickets table to include more detailed fields
ALTER TABLE tickets 
ADD COLUMN category VARCHAR(100),
ADD COLUMN urgency_level VARCHAR(50),
ADD COLUMN affected_systems TEXT,
ADD COLUMN steps_to_reproduce TEXT,
ADD COLUMN expected_behavior TEXT,
ADD COLUMN actual_behavior TEXT,
ADD COLUMN business_impact TEXT,
ADD COLUMN additional_info TEXT,
ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Create a storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ticket-attachments', 'ticket-attachments', true);

-- Create storage policies for ticket attachments
CREATE POLICY "Anyone can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can update ticket attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can delete ticket attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'ticket-attachments');

-- Create a chat messages table for ticket communication
CREATE TABLE ticket_chat_messages (
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
CREATE INDEX idx_ticket_chat_messages_ticket_id ON ticket_chat_messages(ticket_id);
CREATE INDEX idx_ticket_chat_messages_created_at ON ticket_chat_messages(created_at);

-- Create trigger to update updated_at timestamp for chat messages
CREATE TRIGGER update_ticket_chat_messages_updated_at 
BEFORE UPDATE ON ticket_chat_messages 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Allow anyone to view all tickets (as requested)
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tickets"
ON tickets FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create tickets"
ON tickets FOR INSERT
WITH CHECK (true);

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

CREATE POLICY "Anyone can view chat messages"
ON ticket_chat_messages FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create chat messages"
ON ticket_chat_messages FOR INSERT
WITH CHECK (true);

CREATE POLICY "Message authors can update their messages"
ON ticket_chat_messages FOR UPDATE
USING (
    user_id = (SELECT id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
);
