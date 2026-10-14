import { useEffect, useState } from 'react';
import { Archive, X, RotateCcw, Trash2, Search, LayoutList } from 'lucide-react';
import { getArchive } from '../../api/archive';
import { restoreCard, deleteCard } from '../../api/cards';
import { restoreList, deleteList } from '../../api/lists';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatRelative, formatFull } from '../../utils/relativeTime';
import './BoardTasksPanel.css'; // the same slide-in panel
import './ArchivePanel.css';

// History entries that mean the archive changed (anyone on the board, live)
const ARCHIVE_TYPES = new Set(['CARD_ARCHIVED', 'CARD_RESTORED', 'CARD_DELETED', 'LIST_ARCHIVED', 'LIST_RESTORED', 'LIST_DELETED']);

// Resolves (never rejects) with { cards, lists } or { error }
const fetchArchive = (boardId) =>
  getArchive(boardId)
    .then(response => response.data)
    .catch(err => {
      console.error(err);
      return { error: getApiErrorMessage(err, 'Could not load the archive.') };
    });

const matches = (text, query) => text.toLowerCase().includes(query.trim().toLowerCase());

// The board's archive: archived cards and lists, with Restore and Delete forever.
//   lists                 the board's (active) lists, to restore a card whose own list is archived
//   canEdit               false for viewers: look, don't touch
//   subscribeActivity     live history entries (archive changes made by anyone)
//   onCardRestored(listId, card), onListRestored(list)  put them back on the board right away
export default function ArchivePanel({ boardId, boardName, lists, canEdit, subscribeActivity, onCardRestored, onListRestored, onClose }) {
  const [archive, setArchive] = useState(null); // null while loading
  const [tab, setTab] = useState('cards');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null); // item asking "delete forever?"
  const [targets, setTargets] = useState({});       // cardId -> list chosen to restore into
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchArchive(boardId).then(result => {
      if (!cancelled) setArchive(result);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Someone (maybe in another tab) archived, restored or deleted something: reload
  useEffect(() => {
    let timer = null;
    const unsubscribe = subscribeActivity(entry => {
      if (!ARCHIVE_TYPES.has(entry.type)) return;
      clearTimeout(timer);
      timer = setTimeout(() => fetchArchive(boardId).then(result => {
        if (!result.error) setArchive(result);
      }), 250);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [boardId, subscribeActivity]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const run = async (id, action, fallback) => {
    setBusyId(id);
    setError('');
    try {
      await action();
      setConfirmId(null);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const dropCard = (cardId) => setArchive(prev => ({ ...prev, cards: prev.cards.filter(c => c.card.id !== cardId) }));
  const dropList = (listId) => setArchive(prev => ({ ...prev, lists: prev.lists.filter(l => l.id !== listId) }));

  const handleRestoreCard = (item) => run(item.card.id, async () => {
    const target = item.listArchived ? targets[item.card.id] : null;
    const response = await restoreCard(item.card.id, target);
    dropCard(item.card.id);
    onCardRestored(target || item.listId, response.data);
  }, 'Could not restore the card.');

  const handleDeleteCard = (item) => run(item.card.id, async () => {
    await deleteCard(item.card.id);
    dropCard(item.card.id);
  }, 'Could not delete the card.');

  const handleRestoreList = (item) => run(item.id, async () => {
    const response = await restoreList(item.id);
    dropList(item.id);
    // Cards archived on their own stay in the archive, now restorable into this list
    setArchive(prev => ({ ...prev, cards: prev.cards.map(c => (c.listId === item.id ? { ...c, listArchived: false } : c)) }));
    onListRestored(response.data);
  }, 'Could not restore the list.');

  const handleDeleteList = (item) => run(item.id, async () => {
    await deleteList(item.id);
    dropList(item.id);
    setArchive(prev => ({ ...prev, cards: prev.cards.filter(c => c.listId !== item.id) }));
  }, 'Could not delete the list.');

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const cards = archive && !archive.error ? archive.cards.filter(c => matches(c.card.title, query)) : [];
  const archivedLists = archive && !archive.error ? archive.lists.filter(l => matches(l.name, query)) : [];

  const byline = (item) => (
    <span className="archive-meta" title={formatFull(item.archivedAt)}>
      Archived{item.archivedByName ? ` by ${item.archivedByName}` : ''} · {formatRelative(item.archivedAt)}
    </span>
  );

  const deleteControls = (id, label, onDelete) => (confirmId === id ? (
    <span className="archive-confirm" role="group" aria-label="Confirm delete">
      <span>{label}</span>
      <button type="button" className="archive-btn danger" onClick={onDelete} disabled={busyId === id}>
        {busyId === id ? 'Deleting...' : 'Delete'}
      </button>
      <button type="button" className="archive-btn" onClick={() => setConfirmId(null)} disabled={busyId === id}>Cancel</button>
    </span>
  ) : (
    <button type="button" className="archive-icon-btn" onClick={() => setConfirmId(id)} title="Delete forever" aria-label="Delete forever">
      <Trash2 size={15} />
    </button>
  ));

  return (
    <div className="board-tasks-overlay" onMouseDown={handleOverlayClick}>
      <aside className="board-tasks-panel archive-panel" role="dialog" aria-modal="true" aria-labelledby="archive-title">
        <div className="board-tasks-header">
          <div className="board-tasks-heading">
            <h2 id="archive-title" className="board-tasks-title">
              <Archive size={20} />
              Archived
            </h2>
            <p className="board-tasks-subtitle" title={boardName}>
              Cards and lists taken off {boardName}
            </p>
          </div>
          <button type="button" className="board-tasks-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="archive-controls">
          <div className="archive-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'cards'} className={`archive-tab ${tab === 'cards' ? 'active' : ''}`} onClick={() => setTab('cards')}>
              Cards{archive && !archive.error ? ` (${archive.cards.length})` : ''}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'lists'} className={`archive-tab ${tab === 'lists' ? 'active' : ''}`} onClick={() => setTab('lists')}>
              Lists{archive && !archive.error ? ` (${archive.lists.length})` : ''}
            </button>
          </div>
          <label className="archive-search">
            <Search size={14} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search archived ${tab}`} aria-label={`Search archived ${tab}`} />
          </label>
        </div>

        {error && <div className="board-tasks-error" role="alert">{error}</div>}

        <div className="board-tasks-body archive-body">
          {archive === null && <p className="board-tasks-status">Loading the archive...</p>}
          {archive && archive.error && <p className="board-tasks-status error">{archive.error}</p>}

          {archive && !archive.error && tab === 'cards' && (
            cards.length === 0 ? (
              <p className="board-tasks-status">
                {query ? 'No archived cards match.' : 'No archived cards. Archive a card from its popup to take it off the board without deleting it.'}
              </p>
            ) : (
              <ul className="archive-list">
                {cards.map(item => (
                  <li key={item.card.id} className="archive-item">
                    <div className="archive-item-main">
                      <span className="archive-title">{item.card.title}</span>
                      <span className="archive-meta">
                        in “{item.listName}”{item.listArchived && <span className="archive-flag">list archived</span>}
                      </span>
                      {byline(item)}
                    </div>
                    {canEdit && (
                      <div className="archive-actions">
                        {item.listArchived && (
                          <select
                            className="archive-select"
                            value={targets[item.card.id] || ''}
                            onChange={(e) => setTargets(prev => ({ ...prev, [item.card.id]: e.target.value }))}
                            aria-label={`List to restore "${item.card.title}" to`}
                          >
                            <option value="">Restore to...</option>
                            {lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}
                          </select>
                        )}
                        <button
                          type="button"
                          className="archive-btn primary"
                          onClick={() => handleRestoreCard(item)}
                          disabled={busyId === item.card.id || (item.listArchived && !targets[item.card.id])}
                          title={item.listArchived ? 'Its list is archived: pick a list to put it in' : `Back to "${item.listName}"`}
                        >
                          <RotateCcw size={14} />
                          {busyId === item.card.id && confirmId !== item.card.id ? 'Restoring...' : 'Restore'}
                        </button>
                        {deleteControls(item.card.id, 'Delete forever?', () => handleDeleteCard(item))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}

          {archive && !archive.error && tab === 'lists' && (
            archivedLists.length === 0 ? (
              <p className="board-tasks-status">
                {query ? 'No archived lists match.' : 'No archived lists. Archive a list from its edit menu; its cards go with it.'}
              </p>
            ) : (
              <ul className="archive-list">
                {archivedLists.map(item => (
                  <li key={item.id} className="archive-item">
                    <div className="archive-item-main">
                      <span className="archive-title"><LayoutList size={14} /> {item.name}</span>
                      <span className="archive-meta">{item.cardCount === 1 ? '1 card' : `${item.cardCount} cards`}</span>
                      {byline(item)}
                    </div>
                    {canEdit && (
                      <div className="archive-actions">
                        <button
                          type="button"
                          className="archive-btn primary"
                          onClick={() => handleRestoreList(item)}
                          disabled={busyId === item.id}
                          title="Back on the board, at the end, with its cards"
                        >
                          <RotateCcw size={14} />
                          {busyId === item.id && confirmId !== item.id ? 'Restoring...' : 'Restore'}
                        </button>
                        {deleteControls(item.id,
                          item.cardCount > 0 ? `Delete it and its ${item.cardCount === 1 ? 'card' : `${item.cardCount} cards`} forever?` : 'Delete forever?',
                          () => handleDeleteList(item))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
