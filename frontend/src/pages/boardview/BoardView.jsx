import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import CreateItemPopup from './CreateItemPopup';
import { getBoardDetail } from '../../api/boards';
import { createList } from '../../api/lists';
import { createCard } from '../../api/cards';
import { getColorScheme } from '../../utils/boardColors';
import './BoardView.css';

// Limits match the database columns (VARCHAR(255) names/titles, TEXT card description)
const LIST_FIELDS = [
  { name: 'name', label: 'List name', required: true, placeholder: 'e.g. To Do', maxLength: 100 }
];

const CARD_FIELDS = [
  { name: 'title', label: 'Card title', required: true, placeholder: 'e.g. Design the login page', maxLength: 150 },
  { name: 'description', label: 'Description', placeholder: 'Add more details...', maxLength: 2000, multiline: true }
];

// Resolves (never rejects) with the board or an error message to show
const fetchBoard = (boardId) => {
  return getBoardDetail(boardId)
    .then(response => ({ boardId, board: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      const status = err.response && err.response.status;
      let error = 'Could not load this board. Please try again.';
      if (status === 401) {
        error = 'Your session has expired. Please log in again.';
      } else if (status === 403 || status === 404 || status === 400) {
        error = "This board doesn't exist or you don't have access to it.";
      }
      return { boardId, board: null, error };
    });
};

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();

  // Result is tagged with the boardId it belongs to, so switching boards shows loading
  const [result, setResult] = useState(null);
  // null | { type: 'list' } | { type: 'card', listId, listName }
  const [popup, setPopup] = useState(null);

  const loading = !result || result.boardId !== boardId;
  const board = loading ? null : result.board;
  const error = loading ? '' : result.error;

  useEffect(() => {
    let cancelled = false;
    fetchBoard(boardId).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const handleRetry = () => {
    setResult(null);
    fetchBoard(boardId).then(setResult);
  };

  const updateBoard = (updater) => {
    setResult(prev => ({ ...prev, board: updater(prev.board) }));
  };

  const handleCreateList = async ({ name }) => {
    const response = await createList(boardId, name);
    updateBoard(b => ({ ...b, lists: [...b.lists, response.data] }));
    setPopup(null);
  };

  const handleCreateCard = async ({ title, description }) => {
    const { listId } = popup;
    const response = await createCard(listId, title, description);
    updateBoard(b => ({
      ...b,
      lists: b.lists.map(list =>
        list.id === listId ? { ...list, cards: [...list.cards, response.data] } : list
      )
    }));
    setPopup(null);
  };

  const scheme = getColorScheme(boardId);

  return (
    <div className="boardview-page">
      <Sidebar />
      <div className="boardview-main-content">
        <Topbar />

        <main
          className="boardview-content-panel"
          style={{
            '--board-bg': scheme.bg,
            '--board-accent': scheme.accent,
            '--board-text': scheme.text
          }}
        >
          <button className="boardview-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} />
            All boards
          </button>

          {loading && <p className="boardview-status">Loading board...</p>}

          {!loading && error && (
            <div className="boardview-status error">
              <span>{error}</span>
              <button className="boardview-retry-btn" onClick={handleRetry}>Retry</button>
            </div>
          )}

          {!loading && board && (
            <>
              {/* Board header */}
              <header className="boardview-header">
                <div className="boardview-header-text">
                  <h1 className="boardview-title">{board.name}</h1>
                  {board.description && <p className="boardview-description">{board.description}</p>}
                </div>
                <button className="boardview-create-list-btn" onClick={() => setPopup({ type: 'list' })}>
                  <Plus size={18} />
                  Create a list
                </button>
              </header>

              {/* Lists */}
              <div className="boardview-lists">
                {board.lists.map(list => (
                  <section key={list.id} className="board-list">
                    <div className="board-list-header">
                      <h2 className="board-list-title" title={list.name}>{list.name}</h2>
                      <span className="board-list-count">{list.cards.length}</span>
                    </div>

                    <div className="board-list-cards">
                      {list.cards.map(card => (
                        <article key={card.id} className="list-card">
                          <h3 className="list-card-title">{card.title}</h3>
                          {card.description && <p className="list-card-description">{card.description}</p>}
                        </article>
                      ))}
                      {list.cards.length === 0 && <p className="board-list-empty">No cards yet</p>}
                    </div>

                    <button
                      className="board-list-add-card-btn"
                      onClick={() => setPopup({ type: 'card', listId: list.id, listName: list.name })}
                    >
                      <Plus size={16} />
                      Add a card
                    </button>
                  </section>
                ))}

                {/* Create list column */}
                <button className="board-list-create" onClick={() => setPopup({ type: 'list' })}>
                  <Plus size={20} />
                  {board.lists.length === 0 ? 'Create your first list' : 'Create a list'}
                </button>
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

      {popup && popup.type === 'card' && (
        <CreateItemPopup
          heading="Add a card"
          subheading={`New card in "${popup.listName}".`}
          fields={CARD_FIELDS}
          submitLabel="Add Card"
          onSubmit={handleCreateCard}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
