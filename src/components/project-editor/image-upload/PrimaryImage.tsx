
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { X, Pencil, Plus } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
}

interface PrimaryImageProps {
  imageUrl: string;
  onRemove: () => void;
  onUpdate: (value: string) => void;
}

const PrimaryImage = ({ imageUrl, onRemove, onUpdate }: PrimaryImageProps) => {
  const [captionOpen, setCaptionOpen] = useState(false);
  const [draftCaption, setDraftCaption] = useState('');

  const parseMediaItem = (mediaString: string): MediaItem => {
    try {
      const parsed = JSON.parse(mediaString);
      return {
        url: parsed.url || mediaString,
        type: parsed.type || 'image',
        thumbnailUrl: parsed.thumbnailUrl || parsed.url || mediaString,
        caption: parsed.caption || '',
      };
    } catch {
      return { url: mediaString, type: 'image', thumbnailUrl: mediaString, caption: '' };
    }
  };

  const media = parseMediaItem(imageUrl);
  const displayUrl = media.type === 'video' && media.thumbnailUrl ? media.thumbnailUrl : media.url;
  const hasCaption = !!media.caption;

  const openCaptionModal = () => {
    setDraftCaption(media.caption || '');
    setCaptionOpen(true);
  };

  const saveCaption = () => {
    const updated = { ...media, caption: draftCaption.trim() };
    onUpdate(JSON.stringify(updated));
    setCaptionOpen(false);
  };

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Primary Image</div>
      <div className="relative group">
        <img
          src={displayUrl}
          alt="Primary media"
          className="w-full h-64 object-cover rounded-md"
          onError={(e) => {
            if (media.type !== 'video' && e.currentTarget.src !== media.url) {
              e.currentTarget.src = media.url;
            }
          }}
        />
        {media.type === 'video' && (
          <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            Video
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-2 left-2 h-7 text-xs gap-1"
          onClick={openCaptionModal}
        >
          {hasCaption ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {hasCaption ? 'Edit caption' : 'Add caption'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 rounded-full"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {hasCaption && (
        <p className="text-xs text-muted-foreground mt-1.5 italic">{media.caption}</p>
      )}

      <Dialog open={captionOpen} onOpenChange={setCaptionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hasCaption ? 'Edit caption' : 'Add caption'}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={draftCaption}
            onChange={(e) => setDraftCaption(e.target.value)}
            placeholder="Enter a caption for this image…"
            className="resize-none"
            rows={3}
            autoFocus
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCaptionOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveCaption}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrimaryImage;
