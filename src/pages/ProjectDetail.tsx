import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import { Project } from '@/components/project/ProjectCard';
import { supabase } from '@/integrations/supabase/client';

// Import our new components
import ProjectHeader from '@/components/project/detail/ProjectHeader';
import ProjectImageCarousel from '@/components/project/detail/ProjectImageCarousel';
import ProjectMeta from '@/components/project/detail/ProjectMeta';
import ProjectInfoSections from '@/components/project/detail/ProjectInfoSections';
import ProjectDescription from '@/components/project/detail/ProjectDescription';

interface ProjectWithImages extends Project {
  additionalImages?: string[];
  liveUrl?: string;
  involvement?: string;
}

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectWithImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        setLoading(true);
        
        // Fetch project data
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
          
        if (projectError) {
          console.error('Error fetching project:', projectError);
          setError('Failed to load project');
          setLoading(false);
          return;
        }
        
        if (!projectData) {
          setError('Project not found');
          setLoading(false);
          return;
        }
        
        // Fetch images/media
        const { data: imageData } = await supabase
          .from('project_images')
          .select('image_url, is_primary, display_order, media_type, video_thumbnail_url')
          .eq('project_id', id)
          .order('display_order', { ascending: true });
          
        let primaryImageUrl = '';
        let additionalImages: string[] = [];
          
        if (imageData && imageData.length > 0) {
          console.log('Fetched image data:', imageData);
          
          // Find primary image/media
          const primaryImage = imageData.find(img => img.is_primary);
          if (primaryImage) {
            // Create media object for primary image - use video_thumbnail_url for videos
            const primaryMedia = {
              url: primaryImage.image_url,
              type: primaryImage.media_type || 'image',
              // Use video_thumbnail_url for videos, image_url for images
              thumbnailUrl: primaryImage.media_type === 'video' 
                ? primaryImage.video_thumbnail_url
                : primaryImage.image_url
            };
            primaryImageUrl = JSON.stringify(primaryMedia);
            console.log('Primary media object:', primaryMedia);
          }
            
          // Get additional images/media (non-primary) - use video_thumbnail_url for videos
          additionalImages = imageData
            .filter(img => !img.is_primary)
            .map(img => {
              const media = {
                url: img.image_url,
                type: img.media_type || 'image',
                // Use video_thumbnail_url for videos, image_url for images
                thumbnailUrl: img.media_type === 'video' 
                  ? img.video_thumbnail_url
                  : img.image_url
              };
              console.log('Additional media object:', media);
              return JSON.stringify(media);
            });
        }
        
        // Fetch tags
        const { data: tagData } = await supabase
          .from('project_tags')
          .select('tags(name)')
          .eq('project_id', id);
        
        const tags = tagData ? tagData.map(item => item.tags.name) : [];
        
        // Create complete project object
        const completeProject: ProjectWithImages = {
          id: projectData.id,
          title: projectData.title,
          client: projectData.client,
          description: projectData.description,
          imageUrl: primaryImageUrl,
          additionalImages: additionalImages,
          tags: tags,
          createdAt: projectData.created_at,
          liveUrl: projectData.liveurl,
          involvement: projectData.involvement
        };
        
        console.log('Complete project object:', completeProject);
        setProject(completeProject);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching project details:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container mx-auto pt-24 px-4 md:px-6 flex justify-center">
          <div className="text-lg">Loading project details...</div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !project) {
    return (
      <div>
        <Header />
        <div className="container mx-auto pt-24 px-4 md:px-6">
          <h1 className="text-2xl font-bold mt-8">{error || 'Project not found'}</h1>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ProjectHeader title={project.title} />
      
      <main className="flex-grow pt-24 px-4 md:px-6">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
            <div>
              <ProjectImageCarousel 
                mainImageUrl={project.imageUrl} 
                additionalImages={project.additionalImages}
                title={project.title}
              />
            </div>
            
            <div>
              <ProjectMeta 
                client={project.client}
                title={project.title}
                tags={project.tags}
              />
              
              <div className="mt-8">
                <ProjectInfoSections />
              </div>
              
              <div className="mt-8">
                <ProjectDescription 
                  description={project.description} 
                  involvement={project.involvement}
                  liveUrl={project.liveUrl}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ChatBot />
    </div>
  );
};

export default ProjectDetail;
