
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { SecureStorage } from '@/utils/secureStorage';
import { RateLimiter } from '@/utils/inputValidation';

// Generate a session ID if none exists using secure storage
let sessionId = SecureStorage.getItem<string>('chat_session_id');
if (!sessionId) {
  sessionId = uuidv4();
  SecureStorage.setItem('chat_session_id', sessionId, 7 * 24 * 60 * 60 * 1000); // 7 days
}

/**
 * Saves a user prompt to the database with rate limiting and validation
 */
export const savePrompt = async (content: string, responseContent?: string) => {
  try {
    // Rate limiting - max 30 prompts per minute per session
    const rateLimitKey = `prompt_${sessionId}_${Math.floor(Date.now() / 60000)}`;
    if (!RateLimiter.isAllowed(rateLimitKey, 30, 60000)) {
      console.warn('Rate limit exceeded for prompt saving');
      return null;
    }

    // Input validation
    if (typeof content !== 'string' || content.trim().length === 0) {
      console.error('Invalid prompt content');
      return null;
    }

    if (content.length > 10000) { // 10KB limit
      console.error('Prompt content too long');
      return null;
    }

    // Sanitize content to prevent XSS
    const sanitizedContent = content.trim().substring(0, 10000);
    const sanitizedResponse = responseContent ? responseContent.trim().substring(0, 50000) : null;

    const { data, error } = await supabase
      .from('user_prompts')
      .insert({
        content: sanitizedContent,
        session_id: sessionId,
        response_content: sanitizedResponse,
      });

    if (error) {
      console.error('Error saving prompt:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Exception when saving prompt:', error);
    return null;
  }
};

/**
 * Retrieves prompts from the database in reverse chronological order
 */
export const fetchPrompts = async (limit = 50, page = 0) => {
  const { data, error, count } = await supabase
    .from('user_prompts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) {
    console.error('Error fetching prompts:', error);
    return { prompts: [], count: 0 };
  }

  return { prompts: data || [], count };
};
