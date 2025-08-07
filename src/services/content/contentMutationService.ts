
import { supabase } from '@/integrations/supabase/client';
import { saveContentEmbeddings } from './contentEmbeddingService';
import { ContentEntry, SaveContentParams } from './types';

/**
 * Creates a new content entry or updates an existing one in the database
 */
export async function saveContentEntry({
  id,
  title,
  content,
  type,
  visible = true,
  image_url,
  file_url,
  isNew = false
}: SaveContentParams): Promise<ContentEntry | null> {
  try {
    // Enhanced input validation
    const { validateProjectTitle, validateAndSanitizeHTML, validateURL, RateLimiter } = await import('@/utils/inputValidation');

    // Rate limiting
    const rateLimitKey = `content_save_${Date.now().toString().slice(0, -3)}`; // Per minute
    if (!RateLimiter.isAllowed(rateLimitKey, 5, 60000)) {
      throw new Error('Too many content save requests. Please wait a moment.');
    }

    // Validate title
    const titleValidation = validateProjectTitle(title);
    if (!titleValidation.isValid) {
      throw new Error(`Title error: ${titleValidation.error}`);
    }

    // Validate and sanitize content
    const contentValidation = validateAndSanitizeHTML(content);
    if (!contentValidation.isValid) {
      throw new Error(`Content error: ${contentValidation.error}`);
    }

    // Validate URLs if provided
    if (image_url) {
      const imageUrlValidation = validateURL(image_url);
      if (!imageUrlValidation.isValid) {
        throw new Error(`Image URL error: ${imageUrlValidation.error}`);
      }
    }

    if (file_url) {
      const fileUrlValidation = validateURL(file_url);
      if (!fileUrlValidation.isValid) {
        throw new Error(`File URL error: ${fileUrlValidation.error}`);
      }
    }

    // Use sanitized values
    const sanitizedTitle = titleValidation.sanitizedValue!;
    const sanitizedContent = contentValidation.sanitizedValue!;

    let contentId = id;
    let result: ContentEntry | null = null;

    if (isNew) {
      // Create new content entry
      const { data, error } = await supabase
        .from('content_entries')
        .insert({
          title: sanitizedTitle,
          content: sanitizedContent,
          type,
          visible,
          image_url,
          file_url
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating content:', error);
        throw error;
      }

      contentId = data.id;
      result = data as ContentEntry;
      
      console.log('Created new content entry:', contentId);
    } else {
      // Update existing content entry
      const { data, error } = await supabase
        .from('content_entries')
        .update({
          title: sanitizedTitle,
          content: sanitizedContent,
          type,
          visible,
          image_url,
          file_url
        })
        .eq('id', contentId)
        .select()
        .single();

      if (error) {
        console.error('Error updating content:', error);
        throw error;
      }

      result = data;
      console.log('Updated content entry:', contentId);
    }

    // Generate embeddings for the content with sanitized data
    if (contentId) {
      await saveContentEmbeddings(contentId, sanitizedTitle, sanitizedContent, type);
    }

    return result;
  } catch (error) {
    console.error('Error saving content entry:', error);
    throw error;
  }
}

/**
 * Deletes a content entry from the database
 */
export async function deleteContent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteContent:', error);
    return false;
  }
}
