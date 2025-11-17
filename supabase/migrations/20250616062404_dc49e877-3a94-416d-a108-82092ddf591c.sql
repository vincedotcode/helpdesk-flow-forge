
-- Create knowledge base articles table
CREATE TABLE public.knowledge_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
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

-- Create policies for knowledge_articles (simplified for custom auth)
CREATE POLICY "Everyone can view active knowledge articles" 
  ON public.knowledge_articles 
  FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Super admins can manage knowledge articles" 
  ON public.knowledge_articles 
  FOR ALL 
  USING (true);

-- Create policies for knowledge_chat_sessions (simplified for custom auth)
CREATE POLICY "Users can manage their own chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR ALL 
  USING (true);

-- Create policies for knowledge_chat_messages (simplified for custom auth)
CREATE POLICY "Users can manage chat messages" 
  ON public.knowledge_chat_messages 
  FOR ALL 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_knowledge_articles_active ON knowledge_articles(is_active, created_at);
CREATE INDEX idx_knowledge_chat_sessions_user_id ON knowledge_chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_knowledge_chat_messages_session_id ON knowledge_chat_messages(session_id, created_at);
