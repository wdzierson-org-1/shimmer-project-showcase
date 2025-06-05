
import { supabase } from '@/integrations/supabase/client';
import { findRelevantContentEntriesEnhanced } from './enhancedContentSearch';

/**
 * Finds content entries that are semantically relevant to the user's message
 * Now uses the enhanced search by default
 */
export const findRelevantContentEntries = async (userMessage: string) => {
  console.log('Using enhanced content search pipeline...');
  
  // Use enhanced search with moderate settings as default
  return await findRelevantContentEntriesEnhanced(userMessage, {
    threshold: 0.35,
    limit: 3,
    prioritizeTypes: ['thoughts', 'project', 'research'],
    requireMinScore: false // Less strict for general use
  });
};

/**
 * Legacy function - kept for backward compatibility but now uses enhanced search
 */
export const findRelevantContentEntriesLegacy = async (userMessage: string) => {
  try {
    console.log('Searching for relevant content entries (legacy)...');
    
    // Generate embedding for the query
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
      body: { text: userMessage }
    });
    
    if (embeddingError || !embeddingData || !embeddingData.embedding) {
      console.error('Failed to generate embedding for content search:', embeddingError);
      return [];
    }
    
    console.log('Embedding generated successfully, searching for similar content...');
    
    // Use embedding to search for similar content
    const { data: searchData, error: searchError } = await supabase.functions.invoke('search-content', {
      body: { 
        embedding: embeddingData.embedding, 
        threshold: 0.3, 
        limit: 5 
      }
    });
    
    if (searchError) {
      console.error('Error searching for content entries:', searchError);
      return [];
    }
    
    if (!searchData || !searchData.entries || searchData.entries.length === 0) {
      console.log('No relevant content entries found');
      return [];
    }
    
    console.log(`Found ${searchData.entries.length} relevant content entries with IDs:`, 
      searchData.entries.map((entry: any) => entry.content_id));
    
    // Fetch the complete content entries
    const contentIds = searchData.entries.map((entry: any) => entry.content_id);
    
    if (contentIds.length === 0) return [];
    
    const { data: contentEntries, error: contentError } = await supabase
      .from('content_entries')
      .select('*')
      .in('id', contentIds)
      .eq('visible', true);
      
    if (contentError) {
      console.error('Error fetching content entries:', contentError);
      return [];
    }
    
    console.log(`Retrieved ${contentEntries?.length || 0} full content entries`);
    return contentEntries || [];
  } catch (error) {
    console.error('Error searching for content entries:', error);
    return [];
  }
};
