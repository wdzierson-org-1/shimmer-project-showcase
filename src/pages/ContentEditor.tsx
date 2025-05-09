
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ContentForm from '@/components/content/ContentForm';
import { fetchContentById, saveContentEntry, ContentEntry } from '@/services/content/contentService';

const ContentEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('skill');
  const [visible, setVisible] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);

  // Load content data if editing existing entry
  useEffect(() => {
    const loadContentData = async () => {
      if (isNew) return;
      
      try {
        const data = await fetchContentById(id as string);
        
        if (data) {
          setTitle(data.title);
          setContent(data.content);
          setType(data.type);
          setVisible(!!data.visible);
          // Use optional chaining to safely access these properties
          setImageUrl(data.image_url || '');
          setFileUrl(data.file_url || '');
          setLoading(false);
        } else {
          toast.error('Content entry not found');
          navigate('/admin/content');
        }
      } catch (error) {
        console.error('Error loading content:', error);
        toast.error('Failed to load content entry');
        navigate('/admin/content');
      }
    };

    loadContentData();
  }, [id, isNew, navigate]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      // Validate required fields
      if (!title.trim()) {
        toast.error('Title is required');
        setIsSaving(false);
        return;
      }
      
      if (!content.trim()) {
        toast.error('Content is required');
        setIsSaving(false);
        return;
      }
      
      if (!type) {
        toast.error('Content type is required');
        setIsSaving(false);
        return;
      }
      
      // Save content entry
      await saveContentEntry({
        id: isNew ? undefined : id,
        title,
        content,
        type,
        visible,
        image_url: imageUrl,
        file_url: fileUrl,
        isNew
      });
      
      toast.success(`Content ${isNew ? 'created' : 'updated'} successfully`);
      navigate('/admin/content');
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error(`Failed to ${isNew ? 'create' : 'update'} content entry`);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    navigate('/admin/content');
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Content List
            </Link>
          </Button>
          <h1 className="text-3xl font-semibold">
            {isNew ? 'Create New Content' : 'Edit Content'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isNew 
              ? 'Add a new content entry for the RAG chatbot' 
              : 'Update this content entry'}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-muted-foreground">Loading content data...</div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <ContentForm 
              isNew={isNew}
              title={title}
              setTitle={setTitle}
              content={content}
              setContent={setContent}
              type={type}
              setType={setType}
              visible={visible}
              setVisible={setVisible}
              imageUrl={imageUrl}
              setImageUrl={setImageUrl}
              fileUrl={fileUrl}
              setFileUrl={setFileUrl}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
              isSaving={isSaving}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentEditor;
