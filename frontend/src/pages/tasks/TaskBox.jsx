import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronDown, ChevronRight, ArrowUpRight, Inbox } from 'lucide-react';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import TodoItemRow, { SortableTodoRow } from './TodoItemRow';
import { getColorScheme } from '../../utils/boardColors';

const TEXT_MAX = 500;

// One box on the My Tasks page: the tasks linked to one board (or to no board).
// The header links to the board. Tasks added in the box are linked to its board.
//   board       { id, name } or null for "Not linked to a board"
//   items       this box's tasks (to do and completed), in list order
//   onAdd(text, boardId) -> promise resolving to true when added
//   onReorder(boxKey, draggedId, overId)
//   rowProps    handlers shared by every row (toggle, save, delete, link)
export default function TaskBox({ board, items, onAdd, onReorder, rowProps }) {
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const boxKey = board ? board.id : 'none';
  const todo = items.filter(item => !item.done);
  const done = items.filter(item => item.done);
  const scheme = board ? getColorScheme(board.id) : null;

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const added = await onAdd(trimmed, board ? board.id : null);
    if (added) setText('');
    setAdding(false);
  };

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) onReorder(boxKey, active.id, over.id);
  };

  // In a board's box the board is already obvious, so rows don't repeat its tag
  const boxRowProps = { ...rowProps, showBoard: false };

  return (
    <section
      className={`task-box ${board ? '' : 'unlinked'}`}
      style={scheme ? { '--box-accent': scheme.accent, '--box-bg': scheme.bg, '--box-text': scheme.text } : undefined}
      aria-label={board ? `Tasks for ${board.name}` : 'Tasks not linked to a board'}
    >
      <header className="task-box-header">
        {board ? (
          <Link to={`/boards/${board.id}`} className="task-box-title" title={`Open ${board.name}`}>
            <span className="task-box-dot" aria-hidden="true" />
            <span className="task-box-name">{board.name}</span>
            <ArrowUpRight size={15} className="task-box-open" aria-hidden="true" />
          </Link>
        ) : (
          <span className="task-box-title">
            <Inbox size={15} aria-hidden="true" />
            <span className="task-box-name">Not linked to a board</span>
          </span>
        )}
        <span className="task-box-count">
          {todo.length === 0 ? (done.length > 0 ? 'All done' : 'Empty') : `${todo.length} to do`}
        </span>
      </header>

      <form className="task-box-add" onSubmit={handleAdd}>
        <Plus size={14} className="task-box-add-icon" />
        <input
          className="task-box-add-input"
          placeholder={board ? `Add a task to ${board.name}` : 'Add a task'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={TEXT_MAX}
          disabled={adding}
          aria-label={board ? `New task for ${board.name}` : 'New task without a board'}
        />
      </form>

      {todo.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={todo.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="todo-list">
              {todo.map(item => <SortableTodoRow key={item.id} item={item} {...boxRowProps} />)}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {done.length > 0 && (
        <div className="task-box-completed">
          <button
            type="button"
            className="task-box-completed-toggle"
            onClick={() => setShowCompleted(s => !s)}
            aria-expanded={showCompleted}
          >
            {showCompleted ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {done.length} completed
          </button>
          {showCompleted && (
            <ul className="todo-list">
              {done.map(item => <TodoItemRow key={item.id} item={item} {...boxRowProps} />)}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
