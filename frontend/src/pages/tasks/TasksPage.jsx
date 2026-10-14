import { useEffect, useState } from 'react';
import { Plus, Lock, X } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import TaskBox from './TaskBox';
import { getTodos, addTodo, updateTodo, deleteTodo, clearCompletedTodos, reorderTodos } from '../../api/todos';
import { getBoards } from '../../api/boards';
import { getApiErrorMessage } from '../../utils/apiError';
import './TasksPage.css';

const TEXT_MAX = 500;

const boxKeyOf = (item) => (item.board ? item.board.id : 'none');

// Resolves (never rejects) with the items or an error message
const fetchTodos = () =>
  getTodos()
    .then(response => ({ items: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      return { items: [], error: getApiErrorMessage(err, 'Could not load your tasks. Please try again.') };
    });

// "My Tasks": a personal to-do list (the backend only ever returns or changes the
// logged-in user's items), shown as one box per board, plus one for unlinked tasks.
export default function TasksPage() {
  const [items, setItems] = useState(null); // null while loading
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [adding, setAdding] = useState(false);
  const [boards, setBoards] = useState([]);         // boards I can link tasks to
  const [newBoardId, setNewBoardId] = useState(''); // board for the next new task ('' = none)
  const [filter, setFilter] = useState('all');      // 'all' | 'none' | a board id

  // Boards I'm a member of, for linking tasks
  useEffect(() => {
    let cancelled = false;
    getBoards()
      .then(response => {
        if (!cancelled) setBoards(response.data.map(b => ({ id: b.id, name: b.name })));
      })
      .catch(err => console.error(err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchTodos().then(result => {
      if (cancelled) return;
      setItems(result.items);
      setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reload = () => {
    fetchTodos().then(result => {
      setItems(result.items);
      setLoadError(result.error);
    });
  };

  // Shows a change straight away; if saving fails, reloads the real list and says why
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

  const all = items || [];
  const allActive = all.filter(item => !item.done);
  const allCompleted = all.filter(item => item.done);
  const boardName = (id) => (boards.find(b => b.id === id) || {}).name;

  // ---- One box per board (in the order their first task appears), unlinked tasks last ----
  const matchesFilter = (item) =>
    filter === 'all' || (filter === 'none' ? !item.board : item.board && item.board.id === filter);
  const groups = [];
  const byKey = new Map();
  all.filter(matchesFilter).forEach(item => {
    const key = boxKeyOf(item);
    if (!byKey.has(key)) {
      const group = { key, board: item.board, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).items.push(item);
  });
  groups.sort((a, b) => (a.key === 'none') - (b.key === 'none'));
  // Filtering to one board (or "no board") that has no tasks yet: still show its box to add to
  if (filter !== 'all' && groups.length === 0) {
    const board = filter === 'none' ? null : { id: filter, name: boardName(filter) || 'Board' };
    groups.push({ key: filter, board, items: [] });
  }

  const handleFilterChange = (value) => {
    setFilter(value);
    // New tasks added while looking at a board go to that board
    setNewBoardId(value !== 'all' && value !== 'none' ? value : '');
  };

  // Used by the main add box and by each board's box. Returns true when added.
  const addTask = async (taskText, boardId) => {
    const response = await save(addTodo(taskText, boardId || null), 'Could not add the task. Please try again.');
    if (!response) return false;
    setItems(prev => [...prev, response.data]);
    return true;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    if (await addTask(trimmed, newBoardId)) setText('');
    setAdding(false);
  };

  const replaceItem = (updated) => setItems(prev => prev.map(i => (i.id === updated.id ? updated : i)));

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

  // Link to a board (or remove the link): the task moves to that board's box straight away
  const handleLink = async (item, boardId) => {
    replaceItem({ ...item, board: boardId ? { id: boardId, name: boardName(boardId) } : null });
    const response = await save(
      updateTodo(item.id, boardId ? { boardId } : { unlinkBoard: true }),
      'Could not change the board for this task.'
    );
    if (response) replaceItem(response.data);
  };

  const handleClearCompleted = async () => {
    setItems(prev => prev.filter(i => !i.done));
    await save(clearCompletedTodos(), 'Could not clear completed tasks.');
  };

  // Reorder within one box. The server keeps one order for the whole list, so the box's
  // tasks are swapped among their own slots and everything else stays where it was.
  const handleReorder = async (boxKey, draggedId, overId) => {
    const inBox = allActive.filter(item => boxKeyOf(item) === boxKey);
    const from = inBox.findIndex(i => i.id === draggedId);
    const to = inBox.findIndex(i => i.id === overId);
    if (from === -1 || to === -1) return;

    const moved = arrayMove(inBox, from, to);
    let next = 0;
    const merged = allActive.map(item => (boxKeyOf(item) === boxKey ? moved[next++] : item));
    const ordered = [...merged, ...allCompleted].map((item, index) => ({ ...item, position: index }));
    setItems(ordered);
    await save(reorderTodos(ordered.map(i => i.id)), 'Could not reorder your tasks.');
  };

  const rowProps = { onToggle: handleToggle, onSave: handleSave, onDelete: handleDelete, boards, onLink: handleLink };

  return (
    <div className="tasks-page">
      <Sidebar />
      <div className="tasks-main-content">
        <Topbar showSearch={false} />

        <main className="tasks-content">
          <header className="tasks-header">
            <div>
              <h1 className="tasks-title">My Tasks</h1>
              <p className="tasks-subtitle">
                <Lock size={13} />
                Private to you. Nobody else can see this list, not even people on your boards.
              </p>
            </div>
            {items !== null && !loadError && (
              <div className="tasks-toolbar">
                <div className="tasks-toolbar-actions">
                  <select
                    className="tasks-filter"
                    value={filter}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    aria-label="Show tasks for"
                  >
                    <option value="all">All boards</option>
                    <option value="none">Not linked to a board</option>
                    {boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
                  </select>
                  {allCompleted.length > 0 && (
                    <button type="button" className="tasks-secondary-btn" onClick={handleClearCompleted}>
                      Clear all completed
                    </button>
                  )}
                </div>
              </div>
            )}
          </header>

          <section className="tasks-card">
            <form className="tasks-add" onSubmit={handleAdd}>
              <Plus size={18} className="tasks-add-icon" />
              <input
                className="tasks-add-input"
                placeholder="Add a task and press Enter"
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={TEXT_MAX}
                disabled={adding || items === null}
                aria-label="New task"
                autoFocus
              />
              <select
                className="tasks-board-select"
                value={newBoardId}
                onChange={(e) => setNewBoardId(e.target.value)}
                disabled={adding}
                aria-label="Link the new task to a board"
                title="Link the new task to a board (optional)"
              >
                <option value="">No board</option>
                {boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
              </select>
              <button type="submit" className="tasks-add-btn" disabled={!text.trim() || adding}>
                {adding ? 'Adding...' : 'Add'}
              </button>
            </form>

            {error && (
              <div className="tasks-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button>
              </div>
            )}
          </section>

          {items === null && <p className="tasks-status">Loading your tasks...</p>}

          {items !== null && loadError && (
            <div className="tasks-status error">
              <span>{loadError}</span>
              <button type="button" className="tasks-secondary-btn" onClick={reload}>Retry</button>
            </div>
          )}

          {items !== null && !loadError && groups.length === 0 && (
            <p className="tasks-status">Add your first task above. Pick a board to put it in that board's box.</p>
          )}

          {items !== null && !loadError && groups.length > 0 && (
            <div className="task-boxes">
              {groups.map(group => (
                <TaskBox
                  key={group.key}
                  board={group.board}
                  items={group.items}
                  onAdd={addTask}
                  onReorder={handleReorder}
                  rowProps={rowProps}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
