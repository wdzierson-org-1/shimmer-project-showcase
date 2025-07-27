UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 
  'image/png', 
  'image/webp', 
  'video/mp4', 
  'video/webm', 
  'video/quicktime',
  'application/pdf'
] 
WHERE id = 'project_images';