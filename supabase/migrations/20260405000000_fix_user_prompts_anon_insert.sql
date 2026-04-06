-- Restore anonymous insert access to user_prompts
-- Chatbot visitors are unauthenticated; the previous policy blocked them.

DROP POLICY IF EXISTS "Authenticated users can insert prompts" ON public.user_prompts;

CREATE POLICY "Allow anonymous prompt insertions"
ON public.user_prompts
FOR INSERT
WITH CHECK (true);
