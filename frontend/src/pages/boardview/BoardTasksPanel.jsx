import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, ListTodo, Lock, Plus } from 'lucide-react';
import TodoItemRow from '../tasks/TodoItemRow';
import { getTodos, addTodo, updateTodo, deleteTodo } from '../../api/todos';
import { getApiErrorMessage } from '../../utils/apiError';
import './BoardTasksPanel.css';

const TEXT_MAX = 500;

// Resolves (never rejects) with this board's tasks from my personal list
const fetchBoardTodos = (boardId) =>
  getTodos(boardId)
    .then(response => ({ items: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      return { items: [], error: getApiErrorMessage(err, 'Could not load your tasks. Please try again.') };
    });

// "My tasks" on a board page: the tasks from MY personal to-do list that are linked to
// this board. New tasks added here are linked to the board automatically. Private to me.
export default function BoardTasksPanel({ boardId, boardName, onClose }) {
  const [items, setItems] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchBoardTodos(boardId).then(result => {
      if (cancelled) return;
      setItems(result.items);
      setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const reload = () => {
    fetchBoardTodos(boardId).then(result => {
      setItems(result.items);
      setLoadError(result.error);
    });
  };

  const save = async (request, fallbackMessage) => {
    setError('');
    try {
      return await request;
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, fallbackMessage));
      reload();
      return null;
    }
  };

  const replaceItem = (updated) => setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    const response = await save(addTodo(trimmed, boardId), 'Could not add the task. Please try again.');
    if (response) {
      setItems(prev => [...prev, response.data]);
      setText('');
    }
    setAdding(false);
  };

  const handleToggle = async (item) => {
    replaceItem({ ...item, done: !item.done });
    const response = await save(updateTodo(item.id, { done: !item.done }), 'Could not update the task.');
    if (response) replaceItem(response.data);
  };

  const handleSave = async (item, newText) => {
    replaceItem({ ...item, text: newText });
    const response = await save(updateTodo(item.id, { text: newText }), 'Could not save the task.');
    if (response) replaceItem(response.data);
  };

  const handleDelete = async (item) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    await save(deleteTodo(item.id), 'Could not delete the task.');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const active = (items || []).filter(i => !i.done);
  const done = (items || []).filter(i => i.done);
  const rowProps = { onToggle: handleToggle, onSave: handleSave, onDelete: handleDelete, showBoard: false };

  return (
    <div className="board-tasks-overlay" onMouseDown={handleOverlayClick}>
      <aside className="board-tasks-panel" role="dialog" aria-modal="true" aria-labelledby="board-tasks-title">
        <div className="board-tasks-header">
          <div className="board-tasks-heading">
            <h2 id="board-tasks-title" className="board-tasks-title">
              <ListTodo size={20} />
              My tasks
            </h2>
            <p className="board-tasks-subtitle" title={boardName}>
              <Lock size={12} />
              For {boardName}. Only you can see these.
            </p>
          </div>
          <button type="button" className="board-tasks-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form className="board-tasks-add" onSubmit={handleAdd}>
          <Plus size={16} className="board-tasks-add-icon" />
          <input
            className="board-tasks-add-input"
            placeholder="Add a task for this board"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={TEXT_MAX}
            disabled={adding || items === null}
            aria-label="New task for this board"
            autoFocus
          />
          <button type="submit" className="board-tasks-add-btn" disabled={!text.trim() || adding}>
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>

        {error && <div className="board-tasks-error" role="alert">{error}</div>}

        <div className="board-tasks-body">
          {items === null && <p className="board-tasks-status">Loading...</p>}

          {items !== null && loadError && (
            <div className="board-tasks-status error">
              <span>{loadError}</span>
              <button type="button" className="board-tasks-link-btn" onClick={reload}>Retry</button>
            </div>
          )}

          {items !== null && !loadError && (
            <>
              {items.length === 0 && (
                <p className="board-tasks-status">
                  No tasks for this board yet. Add one above. It also shows up in My Tasks.
                </p>
              )}
              {active.length > 0 && (
                <ul className="todo-list">
                  {active.map(item => <TodoItemRow key={item.id} item={item} {...rowProps} />)}
                </ul>
              )}
              {done.length > 0 && (
                <>
                  <p className="board-tasks-section">Completed · {done.length}</p>
                  <ul className="todo-list">
                    {done.map(item => <TodoItemRow key={item.id} item={item} {...rowProps} />)}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        <div className="board-tasks-footer">
          <Link to="/tasks" className="board-tasks-open-all">Open all my tasks →</Link>
        </div>
      </aside>
    </div>
  );
}
