
import { supabase } from '@/integrations/supabase/client';
import { createEmbeddings } from '@/services/openai';

/**
 * Generates and saves embeddings for content entries in the database
 */
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
