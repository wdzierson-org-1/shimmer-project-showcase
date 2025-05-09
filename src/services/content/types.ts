
import { SupabaseClient } from '@supabase/supabase-js';

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

// Interface for saveContentEntry parameters
export interface SaveContentParams {
  id?: string;
  title: string;
  content: string;
  type: string;
  visible?: boolean;
  image_url?: string | null;
  file_url?: string | null;
  isNew?: boolean;
}
