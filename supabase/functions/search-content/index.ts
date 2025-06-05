
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("Enhanced search-content function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { embedding, threshold = 0.35, limit = 5 } = await req.json();
    console.log('Received request to search for similar content entries with enhanced parameters');
    console.log('Threshold:', threshold, 'Limit:', limit);

    if (!embedding) {
      console.error('Embedding vector is required');
      return new Response(
        JSON.stringify({ error: 'Embedding vector is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ error: 'Supabase credentials are not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Executing enhanced similarity search with threshold:', threshold, 'and limit:', limit);
    
    // Convert embedding to proper format if needed
    const embeddingValue = Array.isArray(embedding) ? embedding : JSON.parse(embedding);
    
    // Execute the similarity search using the database function with enhanced filtering
    const { data: similarEntries, error } = await supabase.rpc('match_content_by_query', {
      query_embedding: embeddingValue,
      match_threshold: threshold,
      match_count: limit * 2 // Get more results to enable better filtering
    });

    if (error) {
      console.error('Error searching for similar content:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!similarEntries || similarEntries.length === 0) {
      console.log('No content entries found above threshold');
      return new Response(
        JSON.stringify({ entries: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found similar content entries:', similarEntries.length);
    
    // Enhanced filtering and scoring
    const filteredEntries = similarEntries
      .filter(entry => entry.similarity >= threshold) // Ensure threshold compliance
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
      .slice(0, limit); // Apply final limit
    
    // Log similarity scores for debugging
    filteredEntries.forEach((entry, index) => {
      console.log(`Entry ${index + 1}: similarity = ${entry.similarity.toFixed(3)}`);
    });
    
    return new Response(
      JSON.stringify({ entries: filteredEntries }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in enhanced search-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
