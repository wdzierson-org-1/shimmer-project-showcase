
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log("search-projects function called");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { embedding, threshold = 0.3, limit = 10 } = await req.json();
    console.log('Received request to search for similar projects');

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

    console.log('Executing similarity search with threshold:', threshold, 'and limit:', limit);
    
    // Convert embedding to proper format if needed
    const embeddingValue = Array.isArray(embedding) ? embedding : JSON.parse(embedding);
    
    // Execute the similarity search using the database function
    const { data: similarProjects, error } = await supabase.rpc('match_projects_by_query', {
      query_embedding: embeddingValue,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Error searching for similar projects:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!similarProjects || similarProjects.length === 0) {
      console.log('No similar projects found with vector search');
      
      // Fallback: If no projects found through vector search, try to get projects directly
      // This ensures we at least return some projects when semantic search fails
      const { data: fallbackProjects, error: fallbackError } = await supabase
        .from('projects')
        .select('id')
        .eq('visible', true)
        .eq('unlisted', false)
        .limit(5);

      if (fallbackError) {
        console.error('Error fetching fallback projects:', fallbackError);
      } else if (fallbackProjects && fallbackProjects.length > 0) {
        console.log('Using fallback projects:', fallbackProjects.length);
        // Return minimal project data - the client will fetch full details
        return new Response(
          JSON.stringify({ 
            projects: fallbackProjects.map(p => ({
              id: null, // Not an embedding ID
              project_id: p.id,
              content: null, // No matched content
              similarity: 0 // Flag as fallback match
            })),
            fallback: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        console.log('No fallback projects found');
      }
    } else {
      console.log('Found similar projects:', similarProjects.length);
    }
    
    return new Response(
      JSON.stringify({ projects: similarProjects || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-projects function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
