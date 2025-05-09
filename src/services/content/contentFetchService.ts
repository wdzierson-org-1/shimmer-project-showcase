
import { supabase } from '@/integrations/supabase/client';
import { ContentEntry } from './types';

/**
 * Fetches all content entries from the database
 */
export async function fetchAllContent(): Promise<ContentEntry[]> {
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

/**
 * Fetches a single content entry by its ID
 */
export async function fetchContentById(id: string): Promise<ContentEntry> {
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
