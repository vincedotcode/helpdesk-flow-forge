
-- Create knowledge base articles table
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  pdf_url TEXT,
  pdf_filename VARCHAR(255),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create knowledge base chat sessions table
CREATE TABLE public.knowledge_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create knowledge base chat messages table
CREATE TABLE public.knowledge_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES knowledge_chat_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  message_type VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'ai', 'system'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for knowledge_articles
CREATE POLICY "Everyone can view active knowledge articles" 
  ON public.knowledge_articles 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Super admins can manage knowledge articles" 
  ON public.knowledge_articles 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- Create policies for knowledge_chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- Create policies for knowledge_chat_messages
CREATE POLICY "Users can view messages in their sessions" 
  ON public.knowledge_chat_messages 
  FOR SELECT 
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM knowledge_chat_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their sessions" 
  ON public.knowledge_chat_messages 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM knowledge_chat_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  ));

-- Create storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge-pdfs', 'knowledge-pdfs', false);

-- Create storage policies
CREATE POLICY "Super admins can upload PDFs" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (
    bucket_id = 'knowledge-pdfs' AND 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "Everyone can view PDFs" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'knowledge-pdfs');

-- Create indexes for better performance
CREATE INDEX idx_knowledge_articles_active ON knowledge_articles(is_active, created_at);
CREATE INDEX idx_knowledge_chat_sessions_user_id ON knowledge_chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_knowledge_chat_messages_session_id ON knowledge_chat_messages(session_id, created_at);
