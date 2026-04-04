
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { X, Images, Pencil, Plus, GripVertical } from 'lucide-react';

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
  onReorder: (newImages: string[]) => void;
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

interface SortableImageItemProps {
  id: string;
  mediaString: string;
  index: number;
  primaryImageUrl: string;
  onRemove: (index: number) => void;
  onMakePrimary: (imageUrl: string, index: number) => void;
  onOpenCaption: (index: number) => void;
}

const SortableImageItem = ({
  id,
  mediaString,
  index,
  primaryImageUrl,
  onRemove,
  onMakePrimary,
  onOpenCaption,
}: SortableImageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const media = parseMediaItem(mediaString);
  const displayUrl = media.type === 'video' && media.thumbnailUrl ? media.thumbnailUrl : media.url;
  const hasCaption = !!media.caption;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-50' : undefined}>
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
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/50 text-white rounded p-0.5"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        {media.type === 'video' && (
          <div className="absolute top-2 left-8 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
            Video
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="absolute bottom-2 left-2 h-7 text-xs gap-1"
          onClick={() => onOpenCaption(index)}
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
};

const modifiers = [restrictToParentElement];

const AdditionalImages = ({
  images,
  onRemove,
  onMakePrimary,
  onUpdate,
  onReorder,
  primaryImageUrl,
}: AdditionalImagesProps) => {
  const [captionIndex, setCaptionIndex] = useState<number | null>(null);
  const [draftCaption, setDraftCaption] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (images.length === 0) return null;

  // Use URL as stable ID (URLs are unique per image)
  const ids = images.map((img) => {
    try {
      return JSON.parse(img).url as string;
    } catch {
      return img;
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  };

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={modifiers}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {images.map((mediaString, index) => (
              <SortableImageItem
                key={ids[index]}
                id={ids[index]}
                mediaString={mediaString}
                index={index}
                primaryImageUrl={primaryImageUrl}
                onRemove={onRemove}
                onMakePrimary={onMakePrimary}
                onOpenCaption={openCaptionModal}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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
