
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ChatBot from '@/components/chat/ChatBot';
import { ContentEntry, fetchContentById } from '@/services/content/contentService';
import ContentDetail from '@/components/content/ContentDetail';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ContentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<ContentEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchContentData = async () => {
      try {
        setLoading(true);
        
        if (!id) {
          setError('Content ID not provided');
          setLoading(false);
          return;
        }
        
        const contentData = await fetchContentById(id);
        
        if (!contentData) {
          setError('Content not found');
          setLoading(false);
          return;
        }
        
        setContent(contentData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching content:', err);
        setError('Failed to load content');
        setLoading(false);
      }
    };
    
    fetchContentData();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="container mx-auto pt-24 px-4 md:px-6 flex justify-center">
          <div className="text-lg">Loading content...</div>
        </div>
        <Footer />
      </div>
    );
  }
  
  if (error || !content) {
    return (
      <div>
        <Header />
        <div className="container mx-auto pt-24 px-4 md:px-6">
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat
            </Link>
          </Button>
          <h1 className="text-2xl font-bold mt-8">{error || 'Content not found'}</h1>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24">
        <div className="container mx-auto px-4 md:px-6">
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Chat
            </Link>
          </Button>
          
          <div className="max-w-4xl mx-auto">
            <ContentDetail 
              content={content} 
              onClose={() => window.history.back()}
            />
          </div>
        </div>
      </main>
      
      <Footer />
      <ChatBot />
    </div>
  );
};

export default ContentDetailPage;
