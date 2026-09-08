import React from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';
import SortableProjectRow, { AdminProject } from './SortableProjectRow';

interface SortableProjectListProps {
  projects: AdminProject[];
  onReorder: (activeId: string, overId: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
  sortingDisabled?: boolean;
}

const modifiers = [restrictToVerticalAxis, restrictToParentElement];

const SortableProjectList = ({
  projects,
  onReorder,
  onDelete,
  disabled = false,
  sortingDisabled = false,
}: SortableProjectListProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!disabled && !sortingDisabled && over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No projects in this section.
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="divide-y">
          {projects.map((project) => (
            <SortableProjectRow
              key={project.id}
              project={project}
              onDelete={onDelete}
              disabled={disabled}
              sortingDisabled={sortingDisabled}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableProjectList;
