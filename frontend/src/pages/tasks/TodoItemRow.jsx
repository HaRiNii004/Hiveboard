import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Pencil, Trash2, Link2 } from 'lucide-react';
import { getColorScheme } from '../../utils/boardColors';
import './TodoItemRow.css';

const TEXT_MAX = 500; // matches the backend

// One task: tick it off, double-click (or the pencil) to edit, delete.
//   drag            (from SortableTodoRow) makes it draggable by its grip
//   showBoard       show the linked board as a coloured tag that opens it
//   boards, onLink  offer a "link to board" picker (boards you're a member of)
export default function TodoItemRow({
  item, onToggle, onSave, onDelete, drag = null, showBoard = true, boards = null, onLink = null
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [linking, setLinking] = useState(false);

  const startEditing = () => {
    setDraft(item.text);
    setEditing(true);
  };

  const finishEditing = () => {
    setEditing(false);
    const text = draft.trim();
    if (text && text !== item.text) onSave(item, text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setDraft(item.text);
    }
  };

  const scheme = item.board ? getColorScheme(item.board.id) : null;

  return (
    <li
      ref={drag ? drag.ref : undefined}
      style={drag ? drag.style : undefined}
      className={`todo-row ${item.done ? 'done' : ''} ${drag && drag.isDragging ? 'dragging' : ''}`}
    >
      {drag && (
        <button type="button" className="todo-grip" {...drag.handleProps} aria-label={`Move "${item.text}"`} title="Drag to reorder">
          <GripVertical size={16} />
        </button>
      )}

      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        className={`todo-check ${item.done ? 'checked' : ''}`}
        onClick={() => onToggle(item)}
        aria-label={item.done ? `Mark "${item.text}" as not done` : `Mark "${item.text}" as done`}
      >
        {item.done && <Check size={13} strokeWidth={3} />}
      </button>

      {editing ? (
        <input
          className="todo-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={handleKeyDown}
          maxLength={TEXT_MAX}
          aria-label="Edit task"
          autoFocus
        />
      ) : (
        <span className="todo-main">
          <span className="todo-text" onDoubleClick={startEditing} title="Double-click to edit">
            {item.text}
          </span>
          {showBoard && item.board && !linking && (
            <Link
              to={`/boards/${item.board.id}`}
              className="todo-board-chip"
              style={{ '--chip-bg': scheme.bg, '--chip-text': scheme.text, '--chip-accent': scheme.accent }}
              title={`Open ${item.board.name}`}
            >
              {item.board.name}
            </Link>
          )}
        </span>
      )}

      {linking && boards && (
        <select
          className="todo-link-select"
          value={item.board ? item.board.id : ''}
          onChange={(e) => {
            setLinking(false);
            onLink(item, e.target.value || null);
          }}
          onBlur={() => setLinking(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLinking(false); }}
          aria-label={`Board for "${item.text}"`}
          autoFocus
        >
          <option value="">No board</option>
          {boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
        </select>
      )}

      {!editing && !linking && (
        <div className="todo-actions">
          {onLink && boards && (
            <button
              type="button"
              className="todo-icon-btn"
              onClick={() => setLinking(true)}
              aria-label={item.board ? `Change the board for "${item.text}"` : `Link "${item.text}" to a board`}
              title={item.board ? 'Change or remove the board' : 'Link to a board'}
            >
              <Link2 size={14} />
            </button>
          )}
          <button type="button" className="todo-icon-btn" onClick={startEditing} aria-label={`Edit "${item.text}"`} title="Edit">
            <Pencil size={14} />
          </button>
          <button type="button" className="todo-icon-btn delete" onClick={() => onDelete(item)} aria-label={`Delete "${item.text}"`} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </li>
  );
}

// A row that can be dragged to reorder (inside a SortableContext)
export function SortableTodoRow(props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.item.id });

  return (
    <TodoItemRow
      {...props}
      drag={{
        ref: setNodeRef,
        style: { transform: CSS.Translate.toString(transform), transition },
        isDragging,
        handleProps: { ...attributes, ...listeners, ref: setActivatorNodeRef }
      }}
    />
  );
}
