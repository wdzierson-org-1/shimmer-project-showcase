
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

    // Instead of using system.columns which is causing errors,
    // directly check if the columns exist by running a simple query
    const { data: columnsData, error } = await supabase
      .from('content_entries')
      .select('image_url, file_url')
      .limit(1);

    if (error && error.message.includes('column "image_url" does not exist')) {
      // Add the missing columns
      const { error: alterError } = await supabase.rpc('system.exec', { 
        sql: "ALTER TABLE public.content_entries ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;" 
      });
      
      if (alterError) {
        throw new Error(`Failed to add image_url column: ${alterError.message}`);
      }

      const { error: alterError2 } = await supabase.rpc('system.exec', { 
        sql: "ALTER TABLE public.content_entries ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT NULL;" 
      });
      
      if (alterError2) {
        throw new Error(`Failed to add file_url column: ${alterError2.message}`);
      }

      return new Response(
        JSON.stringify({ 
          message: 'Schema updated successfully', 
          changes: ['Added image_url column', 'Added file_url column'] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ message: 'No schema changes needed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in update-content-entries-schema function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
