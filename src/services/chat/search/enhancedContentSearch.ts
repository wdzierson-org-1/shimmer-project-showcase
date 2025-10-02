
import { supabase } from '@/integrations/supabase/client';
import { ContentEntry } from '@/services/content/contentService';

/**
 * Enhanced content search with better filtering and relevance scoring
 */
export const findRelevantContentEntriesEnhanced = async (
  userMessage: string,
  options: {
    threshold?: number;
    limit?: number;
    prioritizeTypes?: string[];
    requireMinScore?: boolean;
  } = {}
): Promise<ContentEntry[]> => {
  const {
    threshold = 0.4, // Higher threshold for better relevance
    limit = 3, // Fewer results for more focused responses
    prioritizeTypes = ['thoughts', 'research', 'project'],
    requireMinScore = true
  } = options;

  try {
    console.log('Enhanced content search for:', userMessage);
    
    // Generate embedding for the query
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('generate-embeddings', {
      body: { text: userMessage }
    });
    
    if (embeddingError || !embeddingData || !embeddingData.embedding) {
      console.error('Failed to generate embedding for content search:', embeddingError);
      return [];
    }
    
    console.log('Embedding generated, searching with enhanced parameters...');
    
    // Use embedding to search for similar content with higher threshold
    const { data: searchData, error: searchError } = await supabase.functions.invoke('search-content', {
      body: { 
        embedding: embeddingData.embedding, 
        threshold: threshold,
        limit: limit * 2 // Get more candidates to filter
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
    
    console.log(`Found ${searchData.entries.length} potential matches, filtering...`);
    
    // Filter results by similarity score if required
    let filteredEntries = searchData.entries;
    if (requireMinScore) {
      const avgScore = filteredEntries.reduce((acc: number, entry: any) => acc + (entry.similarity || 0), 0) / filteredEntries.length;
      const minScore = Math.max(threshold, avgScore * 0.8); // Require at least 80% of average score
      
      filteredEntries = filteredEntries.filter((entry: any) => (entry.similarity || 0) >= minScore);
      console.log(`Filtered to ${filteredEntries.length} entries with similarity >= ${minScore}`);
    }
    
    // Get content IDs to fetch full content entries
    const contentIds = filteredEntries.map((entry: any) => entry.content_id);
    
    if (contentIds.length === 0) return [];
    
    // Don't filter by visible here - let RLS handle it (admins see all, others see only visible)
    const { data: contentEntries, error: contentError } = await supabase
      .from('content_entries')
      .select('*')
      .in('id', contentIds);
      
    if (contentError) {
      console.error('Error fetching content entries:', contentError);
      return [];
    }
    
    if (!contentEntries || contentEntries.length === 0) {
      return [];
    }
    
    // Sort by type priority and similarity score
    const sortedEntries = contentEntries
      .map(entry => {
        const searchResult = filteredEntries.find((sr: any) => sr.content_id === entry.id);
        return {
          ...entry,
          similarity: searchResult?.similarity || 0
        };
      })
      .sort((a, b) => {
        // First, prioritize by content type
        const aTypePriority = prioritizeTypes.indexOf(a.type) !== -1 ? prioritizeTypes.indexOf(a.type) : 999;
        const bTypePriority = prioritizeTypes.indexOf(b.type) !== -1 ? prioritizeTypes.indexOf(b.type) : 999;
        
        if (aTypePriority !== bTypePriority) {
          return aTypePriority - bTypePriority;
        }
        
        // Then by similarity score
        return (b.similarity || 0) - (a.similarity || 0);
      })
      .slice(0, limit); // Final limit
    
    console.log(`Returning ${sortedEntries.length} prioritized and filtered content entries`);
    return sortedEntries;
  } catch (error) {
    console.error('Error in enhanced content search:', error);
    return [];
  }
};

/**
 * Analyzes the user query to determine search strategy
 */
export const analyzeQuery = (userMessage: string): {
  isSpecific: boolean;
  keywords: string[];
  suggestedTypes: string[];
  searchStrategy: 'focused' | 'broad';
} => {
  const message = userMessage.toLowerCase();
  
  // Check for specific project or topic mentions
  const projectKeywords = ['ariadne', 'deep time', 'project', 'weaving', 'textile', 'preservation'];
  const thoughtKeywords = ['fascinating', 'example', 'meaning', 'communication'];
  const researchKeywords = ['research', 'study', 'analysis', 'findings'];
  
  const hasProjectKeywords = projectKeywords.some(keyword => message.includes(keyword));
  const hasThoughtKeywords = thoughtKeywords.some(keyword => message.includes(keyword));
  const hasResearchKeywords = researchKeywords.some(keyword => message.includes(keyword));
  
  // Determine if this is a specific question
  const isSpecific = message.includes('what') || message.includes('how') || message.includes('why') || 
                     message.includes('example') || hasProjectKeywords;
  
  // Extract potential keywords
  const keywords = [
    ...projectKeywords.filter(keyword => message.includes(keyword)),
    ...thoughtKeywords.filter(keyword => message.includes(keyword)),
    ...researchKeywords.filter(keyword => message.includes(keyword))
  ];
  
  // Suggest content types to prioritize
  let suggestedTypes = ['thoughts'];
  if (hasProjectKeywords) {
    suggestedTypes = ['project', 'thoughts', 'research'];
  }
  if (hasResearchKeywords) {
    suggestedTypes = ['research', 'thoughts', 'project'];
  }
  
  return {
    isSpecific,
    keywords,
    suggestedTypes,
    searchStrategy: isSpecific ? 'focused' : 'broad'
  };
};
