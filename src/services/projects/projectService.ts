
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { ProjectSubmitData } from './types';
import { saveProjectTags } from './tagService';
import { saveProjectImages } from './imageService';
import { saveProjectEmbeddings } from './embeddingService';

export async function saveProject({
  id,
  title,
  client,
  description,
  imageUrl,
  additionalImages = [],
  liveUrl = '',
  involvement = '',
  year,
  tags,
  isNew
}: ProjectSubmitData): Promise<boolean> {
  // Enhanced input validation
  const {
    validateProjectTitle,
    validateClientName,
    validateAndSanitizeHTML,
    validateURL,
    validateYear,
    validateTags,
    RateLimiter
  } = await import('@/utils/inputValidation');

  // Rate limiting
  const rateLimitKey = `project_save_${Date.now().toString().slice(0, -3)}`; // Per minute
  if (!RateLimiter.isAllowed(rateLimitKey, 10, 60000)) {
    toast.error('Too many requests. Please wait a moment before trying again.');
    return false;
  }

  // Validate title
  const titleValidation = validateProjectTitle(title);
  if (!titleValidation.isValid) {
    toast.error(`Title error: ${titleValidation.error}`);
    return false;
  }

  // Validate client
  const clientValidation = validateClientName(client);
  if (!clientValidation.isValid) {
    toast.error(`Client error: ${clientValidation.error}`);
    return false;
  }

  // Validate and sanitize description
  const descriptionValidation = validateAndSanitizeHTML(description);
  if (!descriptionValidation.isValid) {
    toast.error(`Description error: ${descriptionValidation.error}`);
    return false;
  }

  // Validate involvement if provided
  let sanitizedInvolvement = involvement;
  if (involvement) {
    const involvementValidation = validateAndSanitizeHTML(involvement);
    if (!involvementValidation.isValid) {
      toast.error(`Involvement error: ${involvementValidation.error}`);
      return false;
    }
    sanitizedInvolvement = involvementValidation.sanitizedValue || '';
  }

  // Validate URL if provided
  const urlValidation = validateURL(liveUrl);
  if (!urlValidation.isValid) {
    toast.error(`URL error: ${urlValidation.error}`);
    return false;
  }

  // Validate year
  const yearValidation = validateYear(year || new Date().getFullYear());
  if (!yearValidation.isValid) {
    toast.error(`Year error: ${yearValidation.error}`);
    return false;
  }

  // Validate tags
  const tagsValidation = validateTags(tags);
  if (!tagsValidation.isValid) {
    toast.error(`Tags error: ${tagsValidation.error}`);
    return false;
  }

  // Use sanitized values
  const sanitizedTitle = titleValidation.sanitizedValue!;
  const sanitizedClient = clientValidation.sanitizedValue!;
  const sanitizedDescription = descriptionValidation.sanitizedValue!;
  const sanitizedUrl = urlValidation.sanitizedValue!;
  const validatedYear = parseInt(yearValidation.sanitizedValue!);
  const sanitizedTags = Array.isArray(tagsValidation.sanitizedValue) ? tagsValidation.sanitizedValue : [];
  
  try {
    toast.info('Saving project...');
    
    // Create or update project in Supabase with sanitized data
    const projectId = isNew ? uuidv4() : id;
    const projectData = {
      id: projectId,
      title: sanitizedTitle,
      client: sanitizedClient,
      description: sanitizedDescription,
      year: validatedYear,
      updated_at: new Date().toISOString(),
      ...(isNew && { created_at: new Date().toISOString() }),
      ...(sanitizedUrl && { liveurl: sanitizedUrl }),
      ...(sanitizedInvolvement && { involvement: sanitizedInvolvement })
    };
    
    console.log('Saving project data:', projectData);
    
    // Insert or update project
    let { error } = isNew 
      ? await supabase.from('projects').insert(projectData)
      : await supabase.from('projects').update(projectData).eq('id', projectId);
    
    if (error) {
      console.error('Error saving project:', error);
      throw error;
    }
    
    // Save tags with sanitized data
    try {
      await saveProjectTags(projectId, sanitizedTags);
    } catch (error) {
      console.error('Error saving project tags:', error);
      toast.error('Error saving project tags');
      // Continue even if tags fail - don't block the user
    }
    
    // Handle images
    try {
      await saveProjectImages(projectId, imageUrl, additionalImages);
    } catch (error) {
      console.error('Error saving project images:', error);
      toast.error('Error saving project images');
      // Continue even if images fail - don't block the user
    }
    
    // Generate embeddings
    try {
      const embeddingSuccess = await saveProjectEmbeddings(
        projectId,
        sanitizedTitle,
        sanitizedClient,
        sanitizedDescription,
        validatedYear,
        sanitizedInvolvement,
        sanitizedTags
      );
      
      if (!embeddingSuccess) {
        toast.error('Error saving project embeddings, search functionality may be limited.');
      }
    } catch (error) {
      console.error('Error with embeddings process:', error);
      toast.error('Error processing project embeddings, search functionality may be limited.');
      // We don't want embedding errors to prevent project saving
    }
    
    toast.success(`Project ${isNew ? 'created' : 'updated'} successfully!`);
    return true;
  } catch (error) {
    console.error('Error saving project:', error);
    toast.error(`Failed to ${isNew ? 'create' : 'update'} project`);
    return false;
  }
}
