
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
    let contentId = id;
    let result: ContentEntry | null = null;

    if (isNew) {
      // Create new content entry
      const { data, error } = await supabase
        .from('content_entries')
        .insert({
          title,
          content,
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
          title,
          content,
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

    // Generate embeddings for the content
    if (contentId) {
      await saveContentEmbeddings(contentId, title, content, type);
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
