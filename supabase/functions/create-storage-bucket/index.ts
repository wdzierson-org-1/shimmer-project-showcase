
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://uilvozcryifnpldfpwiz.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bucketName = 'project_images';

    // Check if bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      // Create the bucket without a bucket-specific file size cap.
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
      });

      if (error) {
        throw new Error(`Failed to create bucket: ${error.message}`);
      }
      
      return new Response(
        JSON.stringify({ message: 'Storage bucket created', data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clear any bucket-level file size restriction so uploads only use the project-wide storage limit.
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
      public: true,
      fileSizeLimit: null,
    });

    if (error) {
      throw new Error(`Failed to update bucket: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ message: 'Storage bucket updated', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-storage-bucket function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
