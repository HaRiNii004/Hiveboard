import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Makes one card draggable (inside its list's SortableContext). `listId` travels with the
// drag so the board knows which list a card is over, for moves between lists.
// Hands its children what they need through a render prop:
//   ref, style        put on the card element
//   isDragging        the card's original spot while it's being dragged (shown as a placeholder)
//   cardProps         mouse/touch dragging from anywhere on the card
//   handleProps       a grip button: keyboard dragging (Space, arrows, Space/Esc)
//                     and touch dragging, since the card itself lets the list scroll
export default function SortableCard({ id, listId, children }) {
  const {
    attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging
  } = useSortable({ id, data: { listId } });

  return children({
    ref: setNodeRef,
    style: { transform: CSS.Translate.toString(transform), transition },
    isDragging,
    cardProps: { onPointerDown: listeners ? listeners.onPointerDown : undefined },
    handleProps: {
      ...attributes,
      ...listeners,
      ref: setActivatorNodeRef,
      // The card opens on Enter/Space, so keep those keys for the handle when it has focus
      onKeyDown: (e) => {
        if (listeners && listeners.onKeyDown) listeners.onKeyDown(e);
        e.stopPropagation();
      },
      onClick: (e) => e.stopPropagation()
    }
  });
}
