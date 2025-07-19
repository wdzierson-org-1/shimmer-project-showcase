import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ContentEntry {
  id: string;
  title: string;
  content: string;
  type: string;
  image_url?: string;
  created_at: string;
}

const PublicContentList = () => {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const { data, error } = await supabase
          .from('content_entries')
          .select('id, title, content, type, image_url, created_at')
          .eq('visible', true)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setEntries(data || []);
      } catch (error) {
        console.error('Error fetching content entries:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEntries();
  }, []);

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entries.map((entry) => (
        <Link key={entry.id} to={`/content/${entry.id}`} className="group">
          <Card className="h-full transition-transform duration-200 group-hover:scale-[1.02]">
            {entry.image_url && (
              <div className="aspect-video overflow-hidden rounded-t-lg">
                <img 
                  src={entry.image_url} 
                  alt={entry.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="mb-2">
                  {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(entry.created_at)}
                </span>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors">
                {entry.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">
                {truncateContent(entry.content)}
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default PublicContentList;