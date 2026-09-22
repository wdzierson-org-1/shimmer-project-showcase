
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://uilvozcryifnpldfpwiz.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const bucketName = 'project_images';

    // Check if bucket exists and create it if it doesn't
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
      
      console.log(`Created storage bucket: ${bucketName}`, data);
    } else {
      // Clear any bucket-level file size restriction so uploads only use the project-wide storage limit.
      const { data, error } = await supabase.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: null,
      });

      if (error) {
        throw new Error(`Failed to update bucket: ${error.message}`);
      }

      console.log(`Updated storage bucket: ${bucketName}`, data);
    }

    return new Response(
      JSON.stringify({ message: 'Database setup complete' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in setup-db function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
