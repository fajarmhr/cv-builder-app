"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Vertical drag-to-reorder container for form entry lists.
 * `ids` must be stable, unique strings aligned with the rendered children order.
 */
export function SortableList({
  ids,
  onReorder,
  children,
}: {
  ids: string[];
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from !== -1 && to !== -1) onReorder(from, to);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

type SortableRenderProps = {
  setNodeRef: (el: HTMLElement | null) => void;
  style: React.CSSProperties;
  handleProps: React.HTMLAttributes<HTMLElement>;
  isDragging: boolean;
};

/**
 * Per-item sortable wrapper using a render prop, so `useSortable` runs as a
 * hook (not inside a `.map` callback). Spread `handleProps` onto a drag handle
 * and apply `setNodeRef`/`style` to the item's root element.
 */
export function SortableItem({
  id,
  children,
}: {
  id: string;
  children: (props: SortableRenderProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <>
      {children({
        setNodeRef,
        style,
        handleProps: { ...attributes, ...listeners } as unknown as React.HTMLAttributes<HTMLElement>,
        isDragging,
      })}
    </>
  );
}
