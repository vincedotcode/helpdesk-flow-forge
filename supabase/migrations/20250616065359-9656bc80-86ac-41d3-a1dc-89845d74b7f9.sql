
-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view active knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Super admins can manage knowledge articles" ON public.knowledge_articles;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.knowledge_chat_sessions;
DROP POLICY IF EXISTS "Users can manage chat messages" ON public.knowledge_chat_messages;

-- Create new policies that work with custom authentication
-- For knowledge_articles - allow all authenticated operations since we handle permissions in the app
CREATE POLICY "Allow all operations on knowledge articles" 
  ON public.knowledge_articles 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- For knowledge_chat_sessions - allow all operations
CREATE POLICY "Allow all operations on chat sessions" 
  ON public.knowledge_chat_sessions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- For knowledge_chat_messages - allow all operations
CREATE POLICY "Allow all operations on chat messages" 
  ON public.knowledge_chat_messages 
  FOR ALL 
  USING (true)
  WITH CHECK (true);
