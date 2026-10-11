import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, AlignLeft, Calendar, MessageSquare, Users, Eye } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import LabelSelect from '../../components/LabelSelect/LabelSelect';
import LabelChip from '../../components/LabelSelect/LabelChip';
import DueDatePicker from '../../components/DueDatePicker/DueDatePicker';
import CreateItemPopup from './CreateItemPopup';
import CommentsPopup from './CommentsPopup';
import ShareDialog from './ShareDialog';
import { getBoardDetail, updateLabelsTitle } from '../../api/boards';
import { createLabel, updateLabel, deleteLabel } from '../../api/labels';
import { createList, updateList } from '../../api/lists';
import { createCard, updateCard } from '../../api/cards';
import { getColorScheme } from '../../utils/boardColors';
import { getDueDateInfo, toTimeInputValue } from '../../utils/dueDate';
import { getBoardPermissions, roleLabel } from '../../utils/boardPermissions';
import { getApiErrorMessage } from '../../utils/apiError';
import './BoardView.css';

// Limits match the database columns (VARCHAR(255) names/titles, TEXT card description)
const LIST_FIELDS = [
  { name: 'name', label: 'List name', required: true, placeholder: 'e.g. To Do', maxLength: 100 }
];

const CARD_TITLE_FIELD = {
  name: 'title', label: 'Card title', required: true, placeholder: 'e.g. Design the login page', maxLength: 150
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

// Resolves (never rejects) with the board or an error message to show
const fetchBoard = (boardId) => {
  return getBoardDetail(boardId)
    .then(response => ({ boardId, board: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      const status = err.response && err.response.status;
      const error = status === 404 || status === 400
        ? "This board doesn't exist or you don't have access to it."
        : getApiErrorMessage(err, 'Could not load this board. Please try again.');
      return { boardId, board: null, error };
    });
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

  const loading = !result || result.boardId !== boardId;
  const board = loading ? null : result.board;
  const error = loading ? '' : result.error;

  // What the UI offers is based on my role; the backend enforces it regardless
  const perms = getBoardPermissions(board ? board.myRole : null);

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

  // Apply `updater` to one list, leaving the others untouched
  const setList = (listId, updater) => {
    setBoard(b => ({
      ...b,
      lists: b.lists.map(list => (list.id === listId ? updater(list) : list))
    }));
  };

  const handleCreateList = async ({ name }) => {
    const response = await createList(boardId, name);
    setBoard(b => ({ ...b, lists: [...b.lists, response.data] }));
    setPopup(null);
  };

  const handleUpdateList = async ({ name }) => {
    const listId = popup.list.id;
    const response = await updateList(listId, name);
    setList(listId, list => ({ ...list, name: response.data.name }));
    setPopup(null);
  };

  const handleCreateCard = async ({ title, description, labelIds, due }) => {
    const { listId } = popup;
    const { dueDate, dueTime } = toDueFields(due);
    const response = await createCard(listId, title, description, labelIds, dueDate, dueTime);
    setList(listId, list => ({ ...list, cards: [...list.cards, response.data] }));
    setPopup(null);
  };

  const openComments = (e, list, card) => {
    e.stopPropagation(); // don't also open the edit popup
    setPopup({ type: 'comments', listId: list.id, card });
  };

  // Keep the card's comment count in step with the popup
  const handleCommentAdded = () => {
    const { listId, card } = popup;
    setList(listId, list => ({
      ...list,
      cards: list.cards.map(c => (c.id === card.id ? { ...c, commentCount: (c.commentCount || 0) + 1 } : c))
    }));
  };

  const openEditCard = (list, card) => {
    setPopup({ type: 'editCard', listId: list.id, listName: list.name, card });
  };

  const handleUpdateCard = async ({ title, description, labelIds, due }) => {
    const { listId, card } = popup;
    const { dueDate, dueTime } = toDueFields(due);
    const response = await updateCard(card.id, title, description, labelIds, dueDate, dueTime);
    setList(listId, list => ({
      ...list,
      cards: list.cards.map(c => (c.id === card.id ? response.data : c))
    }));
    setPopup(null);
  };

  // --- Label options (board-level, saved immediately from the label picker) ---
  const handleCreateLabel = async (name, color) => {
    const response = await createLabel(boardId, name, color);
    setBoard(b => ({ ...b, labels: [...b.labels, response.data] }));
    return response.data;
  };

  const handleUpdateLabel = async (labelId, { name, color }) => {
    const response = await updateLabel(labelId, name, color);
    setBoard(b => ({
      ...b,
      labels: b.labels.map(label => (label.id === labelId ? response.data : label))
    }));
    return response.data;
  };

  const handleDeleteLabel = async (labelId) => {
    await deleteLabel(labelId);
    // The backend also removes it from every card, so mirror that here
    setBoard(b => ({
      ...b,
      labels: b.labels.filter(label => label.id !== labelId),
      lists: b.lists.map(list => ({
        ...list,
        cards: list.cards.map(card => ({
          ...card,
          labels: card.labels.filter(label => label.id !== labelId)
        }))
      }))
    }));
  };

  const handleRenameLabelsTitle = async (labelsTitle) => {
    const response = await updateLabelsTitle(boardId, labelsTitle);
    setBoard(b => ({ ...b, labelsTitle: response.data.labelsTitle }));
  };

  // Cards show the board's current version of each label, so renames and
  // colour changes appear everywhere straight away
  const labelsById = board ? Object.fromEntries(board.labels.map(label => [label.id, label])) : {};
  const cardLabels = (card) => card.labels.map(label => labelsById[label.id]).filter(Boolean);

  const cardFields = board
    ? [
        CARD_TITLE_FIELD,
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

              {/* Lists */}
              <div className="boardview-lists">
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

                    <div className="board-list-cards">
                      {list.cards.map(card => (
                        <article
                          key={card.id}
                          className="list-card"
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
                            </div>
                          </div>
                        </article>
                      ))}
                      {list.cards.length === 0 && <p className="board-list-empty">No cards yet</p>}
                    </div>

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
              </div>
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
          onClose={() => setPopup(null)}
          onCommentAdded={handleCommentAdded}
        />
      )}

      {popup && popup.type === 'share' && (
        <ShareDialog
          boardId={boardId}
          boardName={board.name}
          isAdmin={perms.isAdmin}
          onClose={() => setPopup(null)}
          onMyRoleChanged={refreshBoard}
          onLeft={() => navigate('/dashboard')}
        />
      )}

      {popup && popup.type === 'editCard' && (
        <CreateItemPopup
          heading={perms.canEdit ? 'Edit card' : 'Card'}
          subheading={`Card in "${popup.listName}".`}
          readOnly={!perms.canEdit}
          fields={cardFields}
          initialValues={{
            title: popup.card.title,
            description: popup.card.description,
            labelIds: cardLabels(popup.card).map(label => label.id),
            due: { date: popup.card.dueDate || '', time: toTimeInputValue(popup.card.dueTime) }
          }}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          onSubmit={handleUpdateCard}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
