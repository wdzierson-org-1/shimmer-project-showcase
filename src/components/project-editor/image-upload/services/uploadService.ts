
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFile } from '../utils/fileUtils';
import { generateVideoThumbnail, uploadThumbnail } from '../utils/videoUtils';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl: string;
}

// Function to handle file upload
export const uploadFile = async (file: File): Promise<MediaItem | null> => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    toast.error(validation.error!);
    return null;
  }
  
  const isVideo = file.type.startsWith('video/');
  
  try {
    toast.info(`Uploading ${isVideo ? 'video' : 'image'}...`);
    
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload main file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('project_images')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true,
      });
      
    if (error) {
      console.error('Error uploading file:', error);
      toast.error(`Failed to upload ${isVideo ? 'video' : 'image'}`);
      return null;
    }
    
    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('project_images')
      .getPublicUrl(filePath);
    
    console.log('Uploaded file to:', publicUrlData.publicUrl);
    
    let thumbnailUrl = '';
    
    // Generate and upload thumbnail for videos
    if (isVideo) {
      try {
        console.log('Generating thumbnail for video...');
        const thumbnailDataUrl = await generateVideoThumbnail(file);
        thumbnailUrl = await uploadThumbnail(thumbnailDataUrl, fileName);
        console.log('Successfully generated and uploaded thumbnail:', thumbnailUrl);
      } catch (error) {
        console.error('Error generating video thumbnail:', error);
        toast.warning('Video uploaded but thumbnail generation failed');
        // Use video URL as fallback thumbnail
        thumbnailUrl = publicUrlData.publicUrl;
      }
    }
    
    // Create media object
    const mediaItem: MediaItem = {
      url: publicUrlData.publicUrl,
      type: isVideo ? 'video' : 'image',
      thumbnailUrl: thumbnailUrl || publicUrlData.publicUrl
    };
    
    console.log('Created media item:', mediaItem);
    toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
    
    return mediaItem;
    
  } catch (error) {
    console.error('Error in upload process:', error);
    toast.error(`Failed to process ${isVideo ? 'video' : 'image'}`);
    return null;
  }
};
