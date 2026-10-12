import { useDroppable } from '@dnd-kit/core';

// A list's card area as a drop target, so cards can be dropped into it even when
// it's empty or the pointer isn't over another card.
export default function ListDropZone({ listId, className, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `list:${listId}`, data: { listId } });

  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'drop-target' : ''}`}>
      {children}
    </div>
  );
}
