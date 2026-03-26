
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { X, Images, Pencil, Plus } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
  thumbnailUrl?: string;
  caption?: string;
}

interface AdditionalImagesProps {
  images: string[];
  onRemove: (index: number) => void;
  onMakePrimary: (imageUrl: string, index: number) => void;
  onUpdate: (index: number, value: string) => void;
  primaryImageUrl: string;
}

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

const AdditionalImages = ({
  images,
  onRemove,
  onMakePrimary,
  onUpdate,
  primaryImageUrl,
}: AdditionalImagesProps) => {
  const [captionIndex, setCaptionIndex] = useState<number | null>(null);
  const [draftCaption, setDraftCaption] = useState('');

  if (images.length === 0) return null;

  const openCaptionModal = (index: number) => {
    const media = parseMediaItem(images[index]);
    setDraftCaption(media.caption || '');
    setCaptionIndex(index);
  };

  const saveCaption = () => {
    if (captionIndex === null) return;
    const media = parseMediaItem(images[captionIndex]);
    const updated = { ...media, caption: draftCaption.trim() };
    onUpdate(captionIndex, JSON.stringify(updated));
    setCaptionIndex(null);
  };

  return (
    <div>
      <div className="text-sm text-muted-foreground mb-2">Additional Images</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {images.map((mediaString, index) => {
          const media = parseMediaItem(mediaString);
          const displayUrl = media.type === 'video' && media.thumbnailUrl ? media.thumbnailUrl : media.url;
          const hasCaption = !!media.caption;

          return (
            <div key={index}>
              <div className="relative group">
                <img
                  src={displayUrl}
                  alt={`Additional ${media.type} ${index + 1}`}
                  className="w-full h-40 object-cover rounded-md"
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
                  onClick={() => openCaptionModal(index)}
                >
                  {hasCaption ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {hasCaption ? 'Edit caption' : 'Add caption'}
                </Button>
                <div className="absolute -top-2 -right-2 flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="rounded-full"
                    onClick={() => onMakePrimary(primaryImageUrl, index)}
                    title="Make primary"
                  >
                    <Images className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="rounded-full"
                    onClick={() => onRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {hasCaption && (
                <p className="text-xs text-muted-foreground mt-1.5 italic">{media.caption}</p>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={captionIndex !== null} onOpenChange={(open) => { if (!open) setCaptionIndex(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {captionIndex !== null && parseMediaItem(images[captionIndex]).caption
                ? 'Edit caption'
                : 'Add caption'}
            </DialogTitle>
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
            <Button type="button" variant="outline" onClick={() => setCaptionIndex(null)}>
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

export default AdditionalImages;
