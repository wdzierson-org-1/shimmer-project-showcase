
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Upload, Link as LinkIcon, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentFormProps {
  isNew: boolean;
  title: string;
  setTitle: (title: string) => void;
  content: string;
  setContent: (content: string) => void;
  type: string;
  setType: (type: string) => void;
  visible: boolean;
  setVisible: (visible: boolean) => void;
  imageUrl: string;
  setImageUrl: (url: string) => void;
  fileUrl: string;
  setFileUrl: (url: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const ContentForm: React.FC<ContentFormProps> = ({
  isNew,
  title,
  setTitle,
  content,
  setContent,
  type,
  setType,
  visible,
  setVisible,
  imageUrl,
  setImageUrl,
  fileUrl,
  setFileUrl,
  onCancel,
  onSubmit,
  isSaving
}) => {
  const contentTypes = [
    { label: 'Skill', value: 'skill' },
    { label: 'Background', value: 'background' },
    { label: 'Thought', value: 'thought' },
    { label: 'Experience', value: 'experience' },
    { label: 'Education', value: 'education' },
    { label: 'Other', value: 'other' }
  ];

  const [isUploading, setIsUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `content_images/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('content_assets')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content_assets')
        .getPublicUrl(filePath);
      
      setImageUrl(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${file.name.split('.')[0].replace(/\s+/g, '_')}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `content_files/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('content_assets')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content_assets')
        .getPublicUrl(filePath);
      
      setFileUrl(publicUrl);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Add link to content
  const handleAddLink = () => {
    if (!linkUrl.trim() || !linkUrl.match(/^https?:\/\//)) {
      toast.error('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    const linkText = `${linkUrl}\n\n`;
    setContent(content + linkText);
    setLinkUrl('');
    toast.success('Link added to content');
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 bg-card shadow-sm border rounded-lg p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select 
              value={type} 
              onValueChange={setType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your content here..."
            rows={10}
            required
          />
        </div>

        {/* Link adder */}
        <div className="flex items-end space-x-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="link">Add Link</Label>
            <Input
              id="link"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com/article"
              type="url"
            />
          </div>
          <Button 
            type="button" 
            onClick={handleAddLink}
            className="mb-0.5"
            variant="outline"
          >
            <LinkIcon className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        </div>

        {/* Image uploader */}
        <div className="space-y-2">
          <Label htmlFor="image">Featured Image</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('image')?.click()}
              disabled={isUploading}
              className="flex-none"
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Select Image
            </Button>
            {imageUrl && (
              <div className="flex-1 flex items-center justify-between bg-muted rounded-md px-3 py-1">
                <span className="text-sm truncate">{imageUrl.split('/').pop()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          {imageUrl && (
            <div className="mt-2 relative">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="h-48 w-auto object-contain rounded-md border" 
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 hover:bg-white"
                onClick={() => setImageUrl('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* File uploader */}
        <div className="space-y-2">
          <Label htmlFor="file">Attachment (PDF, DOC, etc.)</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="file"
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById('file')?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Select File
            </Button>
            {fileUrl && (
              <div className="flex-1 flex items-center justify-between bg-muted rounded-md px-3 py-1">
                <span className="text-sm truncate">{fileUrl.split('/').pop()}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFileUrl('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="visible" 
            checked={visible} 
            onCheckedChange={setVisible} 
          />
          <Label htmlFor="visible">Make this content visible to the chatbot</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button 
          variant="outline" 
          type="button" 
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Check className="mr-2 h-4 w-4" />
          )}
          {isNew ? 'Create Content' : 'Update Content'}
        </Button>
      </div>
    </form>
  );
};

export default ContentForm;
