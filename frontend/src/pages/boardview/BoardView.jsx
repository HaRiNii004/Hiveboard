import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, AlignLeft, Calendar, MessageSquare, Users, Eye, Flag, X, GripVertical, Copy } from 'lucide-react';
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCorners, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import LabelSelect from '../../components/LabelSelect/LabelSelect';
import LabelChip from '../../components/LabelSelect/LabelChip';
import DueDatePicker from '../../components/DueDatePicker/DueDatePicker';
import AssigneeSelect from '../../components/AssigneeSelect/AssigneeSelect';
import PriorityToggle from '../../components/PriorityToggle/PriorityToggle';
import HideFromViewersToggle from '../../components/HideFromViewersToggle/HideFromViewersToggle';
import CreateItemPopup from './CreateItemPopup';
import CommentsPopup from './CommentsPopup';
import ShareDialog from './ShareDialog';
import SortableCard from './SortableCard';
import ListDropZone from './ListDropZone';
import { getBoardDetail, updateLabelsTitle } from '../../api/boards';
import { getMembers } from '../../api/members';
import { createLabel, updateLabel, deleteLabel } from '../../api/labels';
import { createList, updateList } from '../../api/lists';
import { createCard, updateCard, setCardPriority, reorderCards, moveCard, duplicateCard } from '../../api/cards';
import { getColorScheme } from '../../utils/boardColors';
import { getDueDateInfo, toTimeInputValue } from '../../utils/dueDate';
import { getBoardPermissions, roleLabel } from '../../utils/boardPermissions';
import { getApiErrorMessage } from '../../utils/apiError';
import { initials } from '../../utils/initials';
import { applyBoardEvent } from '../../utils/applyBoardEvent';
import { moveCardInList, moveCardBetweenLists, findListOfCard } from '../../utils/cardOrder';
import { useBoardSocket } from '../../components/Realtime/useBoardSocket';
import PresenceAvatars from '../../components/Realtime/PresenceAvatars';
import LiveCursors from '../../components/Realtime/LiveCursors';
import './BoardView.css';

// Limits match the database columns (VARCHAR(255) names/titles, TEXT card description)
const LIST_FIELDS = [
  { name: 'name', label: 'List name', required: true, placeholder: 'e.g. To Do', maxLength: 100 }
];

const CARD_TITLE_FIELD = {
  name: 'title', label: 'Card title', required: true, placeholder: 'e.g. Design the login page', maxLength: 150
};

// High priority on/off (flagged cards are listed first)
const CARD_PRIORITY_FIELD = {
  name: 'highPriority',
  type: 'custom',
  defaultValue: false,
  render: ({ value, onChange, disabled }) => (
    <PriorityToggle value={value} onChange={onChange} disabled={disabled} />
  )
};

// Hide the card from Viewers (only offered to Members and Admins, never shown on the card itself)
const CARD_HIDDEN_FIELD = {
  name: 'hiddenFromViewers',
  type: 'custom',
  defaultValue: false,
  render: ({ value, onChange, disabled }) => (
    <HideFromViewersToggle value={value} onChange={onChange} disabled={disabled} />
  )
};

// Due date + optional time, edited together as { date, time }
const CARD_DUE_FIELD = {
  name: 'due',
  type: 'custom',
  defaultValue: { date: '', time: '' },
  render: ({ value, onChange, disabled }) => (
    <DueDatePicker value={value} onChange={onChange} disabled={disabled} />
  )
};

// { date, time } from the picker -> the API's dueDate / dueTime
const toDueFields = (due) => ({
  dueDate: due.date || null,
  dueTime: due.date && due.time ? due.time : null
});

const CARD_DESCRIPTION_FIELD = {
  name: 'description', label: 'Description', placeholder: 'Add more details...', maxLength: 2000, multiline: true
};

// Resolves (never rejects) with the board and its members, or an error message to show
const fetchBoard = (boardId) => {
  return Promise.all([getBoardDetail(boardId), getMembers(boardId)])
    .then(([board, members]) => ({ boardId, board: board.data, members: members.data, error: '' }))
    .catch(err => {
      console.error(err);
      const status = err.response && err.response.status;
      const error = status === 404 || status === 400
        ? "This board doesn't exist or you don't have access to it."
        : getApiErrorMessage(err, 'Could not load this board. Please try again.');
      return { boardId, board: null, members: [], error };
    });
};

const currentUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.email ? user.email.toLowerCase() : '';
  } catch {
    return '';
  }
};

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  // Result is tagged with the boardId it belongs to, so switching boards shows loading
  const [result, setResult] = useState(null);
  // null | { type: 'list' } | { type: 'editList', list }
  //      | { type: 'card', listId, listName } | { type: 'editCard', listId, listName, card }
  //      | { type: 'comments', listId, card } | { type: 'share' }
  const [popup, setPopup] = useState(null);
  const [priorityError, setPriorityError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  // e.g. "Write docs was deleted by Bob" when a card you had open is deleted by someone else
  const [liveNotice, setLiveNotice] = useState('');
  // bumped when someone else comments on the card whose comments are open
  const [commentsRefresh, setCommentsRefresh] = useState(0);

  // Drag and drop (within a list and between lists)
  const [activeCardId, setActiveCardId] = useState(null); // drawn in the floating overlay
  const dragSnapshot = useRef(null);   // the board before the drag, to restore on cancel
  const dragFromListId = useRef(null);
  const draggingRef = useRef(false);   // remote events are held back while dragging...
  const queuedEvents = useRef([]);     // ...and applied on drop, so nothing moves under the pointer
  const suppressClick = useRef(false); // a drop isn't also a click that opens the card
  const sensors = useSensors(
    // Mouse/touch: start after moving 5px, so a plain click still opens the card
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Keyboard (on the grip handle): Space to pick up, arrows to move, Space to drop, Esc to cancel
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loading = !result || result.boardId !== boardId;
  const board = loading ? null : result.board;
  const members = loading ? [] : result.members;
  const error = loading ? '' : result.error;

  // What the UI offers is based on my role; the backend enforces it regardless
  const perms = getBoardPermissions(board ? board.myRole : null);

  const myEmail = currentUserEmail();
  const me = members.find(m => m.email.toLowerCase() === myEmail);
  const myUserId = me ? me.userId : null;

  useEffect(() => {
    let cancelled = false;
    fetchBoard(boardId).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  // Reload quietly (e.g. after my own role changed in the Share dialog)
  const refreshBoard = () => {
    fetchBoard(boardId).then(setResult);
  };

  const handleRetry = () => {
    setResult(null);
    fetchBoard(boardId).then(setResult);
  };

  const setBoard = (updater) => {
    setResult(prev => ({ ...prev, board: updater(prev.board) }));
  };

  // Applies a board event (from the server, or built from my own REST response).
  // Idempotent, so my own action echoed back by the server changes nothing.
  const applyEvent = (event) => {
    setResult(prev => (prev && prev.board
      ? { ...prev, ...applyBoardEvent({ board: prev.board, members: prev.members }, event) }
      : prev));
  };

  // Events that are about *me* (board gone, I was removed, my role changed) are handled
  // straight away, even mid-drag. Returns true when the event needs nothing more.
  const handleUrgentEvent = (event) => {
    const p = event.payload || {};
    const byOther = event.actorId !== myUserId;
    const boardName = board ? board.name : 'this board';

    if (event.type === 'BOARD_DELETED') {
      navigate('/dashboard', { state: { notice: byOther ? `"${boardName}" was deleted by ${event.actorName}.` : null } });
      return true;
    }
    if (event.type === 'MEMBER_REMOVED' && p.userId === myUserId) {
      navigate('/dashboard', { state: { notice: p.left ? null : `${event.actorName} removed you from "${boardName}".` } });
      return true;
    }
    if (event.type === 'MEMBER_ROLE_CHANGED' && p.member.userId === myUserId) {
      // What I can see and do may have changed (e.g. hidden cards): reload
      applyEvent(event);
      refreshBoard();
      return true;
    }
    return false;
  };

  // Popups react to changes to the card they show
  const runEventSideEffects = (event) => {
    const p = event.payload || {};
    const byOther = event.actorId !== myUserId;
    if (event.type === 'CARD_DELETED' && byOther && popup && popup.card && popup.card.id === p.cardId) {
      setPopup(null);
      setLiveNotice(`"${popup.card.title}" was deleted by ${event.actorName}.`);
    }
    if (event.type === 'COMMENT_ADDED' && byOther && popup && popup.type === 'comments' && popup.card.id === p.cardId) {
      setCommentsRefresh(k => k + 1);
    }
  };

  // Events from other people (and my own echoes) over the WebSocket
  const handleRemoteEvent = (event) => {
    if (handleUrgentEvent(event)) return;
    if (draggingRef.current) {
      queuedEvents.current.push(event); // applied when the card is dropped
      return;
    }
    runEventSideEffects(event);
    applyEvent(event);
  };

  const live = useBoardSocket({
    boardId,
    myUserId,
    enabled: Boolean(board),
    onEvent: handleRemoteEvent,
    onResync: refreshBoard
  });

  // Live cursors use board-content coordinates, so scrolling doesn't matter
  const handleBoardMouseMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    live.sendCursor(e.clientX - rect.left + el.scrollLeft, e.clientY - rect.top + el.scrollTop);
  };

  // ---- Drag and drop: within a list and between lists ----
  const handleDragStart = ({ active }) => {
    draggingRef.current = true;
    dragSnapshot.current = result.board;
    dragFromListId.current = active.data.current ? active.data.current.listId : null;
    setActiveCardId(active.id);
  };

  // Moving over another list: show the card there right away (it's only saved on drop)
  const handleDragOver = ({ active, over }) => {
    if (!over || over.id === active.id) return;
    const toListId = over.data.current ? over.data.current.listId : null;
    if (!toListId) return;
    const beforeCardId = String(over.id).startsWith('list:') ? null : over.id;

    setResult(prev => {
      const fromList = findListOfCard(prev.board.lists, active.id);
      if (!fromList || fromList.id === toListId) return prev;
      return { ...prev, board: { ...prev.board, lists: moveCardBetweenLists(prev.board.lists, active.id, toListId, beforeCardId) } };
    });
  };

  // Shared clean-up: allow clicks again shortly, and apply anything that arrived mid-drag
  const endDrag = (board) => {
    draggingRef.current = false;
    setActiveCardId(null);
    // The browser fires the click right after the drop; ignore it, then allow clicks again
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 0);

    const queued = queuedEvents.current.splice(0);
    let latest = { board, members: result.members };
    queued.forEach(event => {
      latest = applyBoardEvent(latest, event);
      runEventSideEffects(event);
    });
    setResult(prev => ({ ...prev, board: latest.board, members: latest.members }));
    return queued.length > 0;
  };

  const handleDragCancel = () => {
    endDrag(dragSnapshot.current);
  };

  const handleDragEnd = ({ active, over }) => {
    const fromListId = dragFromListId.current;
    const list = over ? findListOfCard(result.board.lists, active.id) : null;
    if (!list) {
      endDrag(dragSnapshot.current); // dropped outside any list: put it back
      return;
    }

    // Final spot within the list it ended up in
    const overCardId = String(over.id).startsWith('list:') ? null : over.id;
    const reordered = overCardId && overCardId !== active.id ? moveCardInList(list.cards, active.id, overCardId) : null;
    const finalCards = reordered || list.cards.map((card, index) => ({ ...card, position: index }));
    const board = {
      ...result.board,
      lists: result.board.lists.map(l => (l.id === list.id ? { ...l, cards: finalCards } : l))
    };
    const changedMidDrag = endDrag(board);

    const orderedIds = finalCards.map(card => card.id);
    const before = dragSnapshot.current.lists.find(l => l.id === list.id);
    const sameAsBefore = before && before.cards.map(card => card.id).join() === orderedIds.join();

    let request = null;
    if (list.id !== fromListId) {
      request = moveCard(active.id, list.id, orderedIds);   // to another list, at this spot
    } else if (!sameAsBefore) {
      request = reorderCards(list.id, orderedIds);         // same list, new order
    }
    if (!request) return;

    // Shown immediately; the server then sends everyone the resulting order.
    // If it's rejected (e.g. the list changed meanwhile), reload to get back in sync.
    request
      .then(() => {
        // Card versions changed; without the socket's echo, fetch them
        if (!live.connected) refreshBoard();
      })
      .catch(err => {
        console.error(err);
        setPriorityError(getApiErrorMessage(err, 'Could not move the card. Please try again.'));
        refreshBoard();
      });
    if (changedMidDrag) {
      setLiveNotice('The board changed while you were dragging; your move was applied on top.');
    }
  };

  // ---- Duplicate (from the card popup): opens the copy so it can be edited ----
  const handleDuplicateCard = async () => {
    const { listId, listName, card } = popup;
    setDuplicating(true);
    try {
      const response = await duplicateCard(card.id);
      applyEvent({ type: 'CARD_CREATED', payload: { listId, card: response.data } });
      setPopup({ type: 'editCard', listId, listName, card: response.data });
    } catch (err) {
      console.error(err);
      setPriorityError(getApiErrorMessage(err, 'Could not duplicate the card. Please try again.'));
      setPopup(null);
    } finally {
      setDuplicating(false);
    }
  };

  const handleCreateList = async ({ name }) => {
    const response = await createList(boardId, name);
    applyEvent({ type: 'LIST_CREATED', payload: { list: response.data } });
    setPopup(null);
  };

  const handleUpdateList = async ({ name }) => {
    const listId = popup.list.id;
    const response = await updateList(listId, name);
    applyEvent({ type: 'LIST_UPDATED', payload: { listId, name: response.data.name } });
    setPopup(null);
  };

  const handleCreateCard = async ({ title, description, labelIds, due, assigneeId, highPriority, hiddenFromViewers }) => {
    const { listId } = popup;
    const { dueDate, dueTime } = toDueFields(due);
    const response = await createCard(listId, title, description, labelIds, dueDate, dueTime,
      assigneeId, highPriority, hiddenFromViewers);
    applyEvent({ type: 'CARD_CREATED', payload: { listId, card: response.data } });
    setPopup(null);
  };

  const openComments = (e, list, card) => {
    e.stopPropagation(); // don't also open the edit popup
    setPopup({ type: 'comments', listId: list.id, card });
  };

  // Keep the card's comment count in step with the popup (absolute, so events can't double-count)
  const handleCommentAdded = (commentCount) => {
    applyEvent({ type: 'COMMENT_ADDED', payload: { cardId: popup.card.id, commentCount } });
  };

  // Flag / unflag; a flagged card moves to the top of its list
  const handleTogglePriority = async (e, list, card) => {
    e.stopPropagation(); // don't also open the edit popup
    setPriorityError('');
    try {
      const response = await setCardPriority(card.id, !card.highPriority);
      applyEvent({ type: 'CARD_UPDATED', payload: { listId: list.id, card: response.data } });
    } catch (err) {
      console.error(err);
      setPriorityError(getApiErrorMessage(err, 'Could not change the priority. Please try again.'));
    }
  };

  const openEditCard = (list, card) => {
    if (suppressClick.current) return; // that was a drop, not a click
    setPopup({ type: 'editCard', listId: list.id, listName: list.name, card });
  };

  const handleUpdateCard = async ({ title, description, labelIds, due, assigneeId, highPriority, hiddenFromViewers }) => {
    const { listId, card } = popup;
    const { dueDate, dueTime } = toDueFields(due);
    // Sends the version I opened; if someone changed the card since, this fails with 409
    const response = await updateCard(card.id, title, description, labelIds, dueDate, dueTime,
      assigneeId, highPriority, hiddenFromViewers, card.version);
    applyEvent({ type: 'CARD_UPDATED', payload: { listId, card: response.data } });
    setPopup(null);
  };

  // --- Label options (board-level, saved immediately from the label picker) ---
  const handleCreateLabel = async (name, color) => {
    const response = await createLabel(boardId, name, color);
    applyEvent({ type: 'LABEL_CREATED', payload: { label: response.data } });
    return response.data;
  };

  const handleUpdateLabel = async (labelId, { name, color }) => {
    const response = await updateLabel(labelId, name, color);
    applyEvent({ type: 'LABEL_UPDATED', payload: { label: response.data } });
    return response.data;
  };

  const handleDeleteLabel = async (labelId) => {
    await deleteLabel(labelId);
    // The backend also removes it from every card; the reducer mirrors that
    applyEvent({ type: 'LABEL_DELETED', payload: { labelId } });
  };

  const handleRenameLabelsTitle = async (labelsTitle) => {
    const response = await updateLabelsTitle(boardId, labelsTitle);
    setBoard(b => ({ ...b, labelsTitle: response.data.labelsTitle }));
  };

  // Cards show the board's current version of each label, so renames and
  // colour changes appear everywhere straight away
  const labelsById = board ? Object.fromEntries(board.labels.map(label => [label.id, label])) : {};
  const cardLabels = (card) => card.labels.map(label => labelsById[label.id]).filter(Boolean);

  // The card being edited (for "Assigned by"), if any
  const editingCard = popup && popup.type === 'editCard' ? popup.card : null;

  const cardFields = board
    ? [
        CARD_TITLE_FIELD,
        CARD_PRIORITY_FIELD,
        ...(perms.canEdit ? [CARD_HIDDEN_FIELD] : []),
        {
          name: 'assigneeId',
          type: 'custom',
          defaultValue: null,
          render: ({ value, onChange, disabled }) => (
            <AssigneeSelect
              members={members}
              value={value}
              onChange={onChange}
              savedAssigneeId={editingCard && editingCard.assignee ? editingCard.assignee.id : null}
              assignedBy={editingCard ? editingCard.assignedBy : null}
              assignedAt={editingCard ? editingCard.assignedAt : null}
              disabled={disabled}
            />
          )
        },
        {
          name: 'labelIds',
          type: 'custom',
          defaultValue: [],
          render: ({ value, onChange, disabled }) => (
            <LabelSelect
              title={board.labelsTitle}
              onRenameTitle={handleRenameLabelsTitle}
              options={board.labels}
              selectedIds={value}
              onChange={onChange}
              onCreateOption={handleCreateLabel}
              onUpdateOption={handleUpdateLabel}
              onDeleteOption={handleDeleteLabel}
              disabled={disabled}
            />
          )
        },
        CARD_DUE_FIELD,
        CARD_DESCRIPTION_FIELD
      ]
    : [];

  // One card. With `sortable` (from SortableCard) it can be dragged within its list.
  const renderCard = (list, card, sortable = null) => (
      <article
        key={card.id}
        ref={sortable ? sortable.ref : undefined}
        style={sortable ? sortable.style : undefined}
        {...(sortable ? sortable.cardProps : {})}
        className={`list-card ${card.highPriority ? 'high-priority' : ''} ${sortable ? 'draggable' : ''}`
          + ` ${sortable && sortable.isDragging ? 'dragging' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={`${perms.canEdit ? 'Edit' : 'View'} card ${card.title}`}
        onClick={() => openEditCard(list, card)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEditCard(list, card);
          }
        }}
      >
        <div className="list-card-body">
          {card.highPriority && (
            <span className="list-card-priority" title="High-priority cards stay pinned at the top of the list">
              <Flag size={11} />
              High priority
            </span>
          )}
          <h3 className="list-card-title">{card.title}</h3>
          {cardLabels(card).length > 0 && (
            <div className="list-card-labels">
              {cardLabels(card).map(label => (
                <LabelChip key={label.id} label={label} size="sm" />
              ))}
            </div>
          )}
          <div className="list-card-footer">
            {card.dueDate && (() => {
              const due = getDueDateInfo(card.dueDate, card.dueTime);
              return (
                <span className={`list-card-due ${due.status}`} title={due.tooltip}>
                  <Calendar size={12} />
                  {due.text}
                </span>
              );
            })()}
            {card.description && (
              <span className="list-card-has-description" title="This card has a description">
                <AlignLeft size={14} />
              </span>
            )}
            <div className="list-card-footer-actions">
            {sortable && (
              <button
                type="button"
                className="list-card-drag-handle"
                {...sortable.handleProps}
                aria-label={`Move ${card.title}`}
                title="Drag to reorder (or focus and press Space, then the arrow keys)"
              >
                <GripVertical size={14} />
              </button>
            )}
              {perms.canEdit && (
                <button
                  type="button"
                  className={`list-card-flag-btn ${card.highPriority ? 'flagged' : ''}`}
                  onClick={(e) => handleTogglePriority(e, list, card)}
                  onKeyDown={(e) => e.stopPropagation()}
                  aria-pressed={card.highPriority}
                  aria-label={card.highPriority
                    ? `Remove high priority from ${card.title}`
                    : `Flag ${card.title} as high priority`}
                  title={card.highPriority ? 'Remove high priority' : 'Flag as high priority'}
                >
                  <Flag size={14} fill={card.highPriority ? 'currentColor' : 'none'} />
                </button>
              )}
              <button
                type="button"
                className={`list-card-comments-btn ${card.commentCount > 0 ? 'has-comments' : ''}`}
                onClick={(e) => openComments(e, list, card)}
                onKeyDown={(e) => e.stopPropagation()}
                aria-label={
                  card.commentCount > 0
                    ? `${card.commentCount} comments on ${card.title}`
                    : `Comment on ${card.title}`
                }
                title="Comments"
              >
                <MessageSquare size={14} />
                {card.commentCount > 0 && <span>{card.commentCount}</span>}
              </button>
              {card.assignee && (
                <span
                  className="list-card-assignee"
                  title={`Assigned to ${card.assignee.fullName}`
                    + (card.assignedBy ? ` by ${card.assignedBy.fullName}` : '')}
                  aria-label={`Assigned to ${card.assignee.fullName}`}
                >
                  {initials(card.assignee.fullName)}
                </span>
              )}
            </div>
          </div>
        </div>
      </article>
  );

  const scheme = getColorScheme(boardId);

  return (
    <div className="boardview-page">
      <Sidebar />
      <div className="boardview-main-content">
        <Topbar showSearch={false} />

        <main
          className="boardview-content-panel"
          style={{
            '--board-bg': scheme.bg,
            '--board-accent': scheme.accent,
            '--board-text': scheme.text
          }}
        >
          <nav className="boardview-breadcrumb" aria-label="Breadcrumb">
            <button className="boardview-back-btn" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={16} />
              All boards
            </button>
          </nav>

          {loading && <p className="boardview-status">Loading board...</p>}

          {!loading && error && (
            <div className="boardview-status error">
              <span>{error}</span>
              <button className="boardview-retry-btn" onClick={handleRetry}>Retry</button>
            </div>
          )}

          {!loading && board && (
            <>
              {/* Board name & description */}
              <div className="boardview-heading">
                <div className="boardview-heading-text">
                  <h1 className="boardview-title">{board.name}</h1>
                  {board.description && <p className="boardview-description">{board.description}</p>}
                </div>
                <div className="boardview-heading-actions">
                  <PresenceAvatars users={live.presence} myUserId={myUserId} connected={live.connected} />
                  <span
                    className={`boardview-role-badge ${board.myRole.toLowerCase()}`}
                    title={perms.canEdit ? undefined : 'You can view this board but not change it'}
                  >
                    {!perms.canEdit && <Eye size={13} />}
                    {roleLabel(board.myRole)}
                  </span>
                  <button className="boardview-share-btn" onClick={() => setPopup({ type: 'share' })}>
                    <Users size={16} />
                    {perms.isAdmin ? 'Share' : 'Members'}
                  </button>
                </div>
              </div>

              {priorityError && <div className="boardview-inline-error">{priorityError}</div>}
              {liveNotice && (
                <div className="boardview-live-notice" role="status">
                  <span>{liveNotice}</span>
                  <button type="button" onClick={() => setLiveNotice('')} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Lists: one drag area, so cards can move within and between lists */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
              <div
                className="boardview-lists"
                onMouseMove={handleBoardMouseMove}
                onMouseLeave={live.hideCursor}
              >
                {board.lists.map(list => (
                  <section key={list.id} className="board-list">
                    <div className="board-list-header">
                      <h2 className="board-list-title" title={list.name}>{list.name}</h2>
                      <div className="board-list-header-actions">
                        <span className="board-list-count">{list.cards.length}</span>
                        {perms.canEdit && (
                          <button
                            className="boardview-edit-btn small"
                            onClick={() => setPopup({ type: 'editList', list })}
                            aria-label={`Edit list ${list.name}`}
                            title="Edit list"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <ListDropZone listId={list.id} className="board-list-cards">
                      {/* High-priority cards are pinned at the top; the rest can be dragged */}
                      {list.cards.filter(card => card.highPriority || !perms.canEdit).map(card => renderCard(list, card))}
                      {perms.canEdit && (
                        <SortableContext
                          items={list.cards.filter(card => !card.highPriority).map(card => card.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {list.cards.filter(card => !card.highPriority).map(card => (
                            <SortableCard key={card.id} id={card.id} listId={list.id}>
                              {sortable => renderCard(list, card, sortable)}
                            </SortableCard>
                          ))}
                        </SortableContext>
                      )}
                      {list.cards.length === 0 && <p className="board-list-empty">No cards yet</p>}
                    </ListDropZone>

                    {perms.canEdit && (
                      <button
                        className="board-list-add-card-btn"
                        onClick={() => setPopup({ type: 'card', listId: list.id, listName: list.name })}
                      >
                        <Plus size={16} />
                        Add a card
                      </button>
                    )}
                  </section>
                ))}

                {/* Create list column */}
                {perms.canEdit && (
                  <button className="board-list-create" onClick={() => setPopup({ type: 'list' })}>
                    <Plus size={20} />
                    {board.lists.length === 0 ? 'Create your first list' : 'Create a list'}
                  </button>
                )}
                {!perms.canEdit && board.lists.length === 0 && (
                  <p className="boardview-status">This board doesn't have any lists yet.</p>
                )}

                <LiveCursors cursors={live.cursors} />
              </div>

              {/* The card being dragged follows the pointer above everything, so it isn't
                  clipped by a list's scroll area while moving between lists */}
              <DragOverlay>
                {activeCardId && (() => {
                  const list = findListOfCard(board.lists, activeCardId);
                  const card = list && list.cards.find(c => c.id === activeCardId);
                  return card ? <div className="list-card-overlay">{renderCard(list, card)}</div> : null;
                })()}
              </DragOverlay>
              </DndContext>
            </>
          )}
        </main>
      </div>

      {popup && popup.type === 'list' && (
        <CreateItemPopup
          heading="Create a list"
          subheading={`Add a new list to ${board.name}.`}
          fields={LIST_FIELDS}
          submitLabel="Create List"
          onSubmit={handleCreateList}
          onClose={() => setPopup(null)}
        />
      )}

      {popup && popup.type === 'editList' && (
        <CreateItemPopup
          heading="Edit list"
          subheading={`Rename "${popup.list.name}".`}
          fields={LIST_FIELDS}
          initialValues={{ name: popup.list.name }}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          onSubmit={handleUpdateList}
          onClose={() => setPopup(null)}
        />
      )}

      {popup && popup.type === 'card' && (
        <CreateItemPopup
          heading="Add a card"
          subheading={`New card in "${popup.listName}".`}
          fields={cardFields}
          submitLabel="Add Card"
          onSubmit={handleCreateCard}
          onClose={() => setPopup(null)}
        />
      )}

      {popup && popup.type === 'comments' && (
        <CommentsPopup
          card={popup.card}
          canComment={perms.canEdit}
          refreshKey={commentsRefresh}
          onClose={() => setPopup(null)}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {popup && popup.type === 'share' && (
        <ShareDialog
          boardId={boardId}
          boardName={board.name}
          isAdmin={perms.isAdmin}
          onClose={() => {
            setPopup(null);
            refreshBoard();
          }}
          onMyRoleChanged={refreshBoard}
          onLeft={() => navigate('/dashboard')}
        />
      )}

      {popup && popup.type === 'editCard' && (
        <CreateItemPopup
          key={popup.card.id}
          heading={perms.canEdit ? 'Edit card' : 'Card'}
          subheading={`Card in "${popup.listName}".`}
          readOnly={!perms.canEdit}
          fields={cardFields}
          initialValues={{
            title: popup.card.title,
            description: popup.card.description,
            labelIds: cardLabels(popup.card).map(label => label.id),
            due: { date: popup.card.dueDate || '', time: toTimeInputValue(popup.card.dueTime) },
            assigneeId: popup.card.assignee ? popup.card.assignee.id : null,
            highPriority: popup.card.highPriority,
            hiddenFromViewers: popup.card.hiddenFromViewers
          }}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          extraActions={perms.canEdit ? (
            <button
              type="button"
              className="item-popup-btn secondary item-popup-duplicate"
              onClick={handleDuplicateCard}
              disabled={duplicating}
              title="Copy this card (title, description, labels and due date) right below it"
            >
              <Copy size={15} />
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </button>
          ) : null}
          onSubmit={handleUpdateCard}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
