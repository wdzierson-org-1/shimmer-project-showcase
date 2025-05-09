import { supabase } from '@/integrations/supabase/client';

// Define the structure of a content entry
export interface ContentEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  updated_at: string;
  visible: boolean;
  image_url?: string | null;
  file_url?: string | null;
}

export async function fetchAllContent() {
  try {
    const { data, error } = await supabase
      .from('content_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchAllContent:', error);
    return [];
  }
}

export async function fetchContentById(id: string) {
  try {
    const { data, error } = await supabase
      .from('content_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching content by ID:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in fetchContentById:', error);
    throw error;
  }
}

export async function saveContentEntry({
  id,
  title,
  content,
  type,
  visible = true,
  image_url,
  file_url,
  isNew = false
}: ContentEntry & { isNew?: boolean }) {
  try {
    let contentId = id;
    let result;

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
      result = data;
      
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

export async function deleteContent(id: string) {
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

export async function saveContentEmbeddings(
  contentId: string, 
  title: string, 
  content: string,
  type: string
): Promise<boolean> {
  try {
    console.log('Generating embeddings for content...');
    
    // Generate content for embeddings
    const contentData = `${title} ${content} ${type}`;
    
    if (contentData) {
      console.log('Content generated for embeddings');
      
      // Generate embeddings using OpenAI
      const embeddings = await createEmbeddings(contentData);
      
      if (embeddings) {
        console.log('Embeddings generated successfully');
        
        // First check if there's an existing embedding
        const { data: existingEmbedding } = await supabase
          .from('content_embeddings')
          .select('id')
          .eq('content_id', contentId)
          .limit(1);
          
        // Store embeddings - ensure embedding is a JSON string
        if (existingEmbedding && existingEmbedding.length > 0) {
          // Update existing embedding
          const { error: embeddingError } = await supabase
            .from('content_embeddings')
            .update({
              content: contentData,
              embedding: embeddings
            })
            .eq('id', existingEmbedding[0].id);
            
          if (embeddingError) {
            console.error('Error updating embeddings:', embeddingError);
            return false;
          }
        } else {
          // Insert new embedding
          const { error: embeddingError } = await supabase
            .from('content_embeddings')
            .insert({
              content_id: contentId,
              content: contentData,
              embedding: embeddings
            });
            
          if (embeddingError) {
            console.error('Error saving embeddings:', embeddingError);
            return false;
          }
        }
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error with content embeddings process:', error);
    return false;
  }
}
