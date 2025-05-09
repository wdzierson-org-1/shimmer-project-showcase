
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if columns exist
    const { data: columnsData, error: columnsError } = await supabase
      .rpc('system.columns', { 
        table_schema: 'public',
        table_name: 'content_entries', 
      });

    if (columnsError) {
      throw new Error(`Failed to check columns: ${columnsError.message}`);
    }

    const columns = columnsData as { column_name: string }[];
    const columnNames = columns.map(col => col.column_name);
    
    // Array to collect SQL statements
    const statements = [];

    // Add image_url column if it doesn't exist
    if (!columnNames.includes('image_url')) {
      statements.push("ALTER TABLE public.content_entries ADD COLUMN image_url TEXT DEFAULT NULL;");
    }

    // Add file_url column if it doesn't exist
    if (!columnNames.includes('file_url')) {
      statements.push("ALTER TABLE public.content_entries ADD COLUMN file_url TEXT DEFAULT NULL;");
    }

    // Execute SQL if there are statements to run
    if (statements.length > 0) {
      for (const sql of statements) {
        const { error } = await supabase.rpc('system.exec', { sql });
        if (error) {
          throw new Error(`Failed to execute SQL: ${error.message}`);
        }
      }
      return new Response(
        JSON.stringify({ 
          message: 'Schema updated successfully', 
          changes: statements 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ message: 'No schema changes needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in update-content-entries-schema function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
