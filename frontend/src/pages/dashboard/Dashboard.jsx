import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Star, ChevronDown, Grid, List as ListIcon, Plus, User, Calendar, Pencil, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import Bee from '../../components/Bee/Bee';
import CreatePopup from './CreatePopup/CreatePopup';
import { getBoards, setBoardStarred } from '../../api/boards';
import { getApiErrorMessage } from '../../utils/apiError';
import { getColorScheme } from '../../utils/boardColors';
import { roleLabel } from '../../utils/boardPermissions';
import { useRealtime } from '../../components/Realtime/useRealtime';
import HighlightText from '../../components/HighlightText/HighlightText';
import { searchWords, matchesBoard } from '../../utils/boardSearch';
import './Dashboard.css';
import { getStoredUser } from '../../utils/authSession';

const formatCreatedDate = (createdAt) => {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

// BoardSummaryResponse -> card data
const toBoard = (summary) => ({
  id: summary.id,
  name: summary.name,
  description: summary.description,
  createdBy: summary.createdBy,
  createdAt: summary.createdAt,
  myRole: summary.myRole,       // my role on this board: ADMIN | MEMBER | VIEWER
  ownedByMe: summary.ownedByMe, // false for boards shared with me
  starred: summary.starred,     // my own star (stars are personal)
  starredAt: summary.starredAt
});

// Starred page: most recently starred first (a star still being saved counts as newest)
const byStarredAtDesc = (a, b) => {
  if (!a.starredAt) return -1;
  if (!b.starredAt) return 1;
  return new Date(b.starredAt) - new Date(a.starredAt);
};

// Resolves (never rejects) with the boards or an error message to show
const fetchBoards = () => {
  return getBoards()
    .then(response => ({ boards: response.data.map(toBoard), error: '' }))
    .catch(err => {
      console.error(err);
      const status = err.response && err.response.status;
      const error = status === 401 || status === 403
        ? 'Your session has expired. Please log in again.'
        : 'Could not load your boards. Please try again.';
      return { boards: [], error };
    });
};

// Also the Starred page: <Dashboard view="starred" /> shows only boards you've starred.
export default function Dashboard({ view = 'all' }) {
  const starredView = view === 'starred';
  const navigate = useNavigate();
  const location = useLocation();
  // e.g. "Alice removed you from Team." after being sent here from a board
  const [notice, setNotice] = useState(location.state ? location.state.notice : null);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy] = useState('Last opened');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [starError, setStarError] = useState('');

  const storedUser = getStoredUser();
  const userName = storedUser && storedUser.fullName ? storedUser.fullName : 'Harini Selvaraj';

  const firstName = userName.split(' ')[0];

  // Search (in the browser: every board is already loaded)
  const words = searchWords(searchQuery);
  const searching = words.length > 0;
  const baseBoards = starredView ? boards.filter(board => board.starred).sort(byStarredAtDesc) : boards;
  const visibleBoards = baseBoards.filter(board => matchesBoard(board, words));

  const applyResult = (result) => {
    setBoards(result.boards);
    setError(result.error);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    fetchBoards().then(result => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates for every board I'm on
  const { subscribe, connectionCount } = useRealtime();
  useEffect(() => subscribe('/user/queue/boards', event => {
    const p = event.payload || {};
    switch (event.type) {
      case 'BOARD_UPDATED':
        setBoards(prev => prev.map(b =>
          b.id === event.boardId ? { ...b, name: p.name, description: p.description } : b));
        break;
      case 'BOARD_DELETED':
        setBoards(prev => prev.filter(b => b.id !== event.boardId));
        break;
      case 'MEMBER_ADDED':
      case 'MEMBER_REMOVED':
      case 'MEMBER_ROLE_CHANGED':
        // Could be about me (shared, removed, role badge): quietly reload the list
        fetchBoards().then(result => {
          if (!result.error) setBoards(result.boards);
        });
        break;
      default:
        break;
    }
  }), [subscribe]);

  // Resync after a reconnect (events missed while offline are gone)
  const syncedCount = useRef(null);
  useEffect(() => {
    if (connectionCount === 0) return;
    if (syncedCount.current !== null && syncedCount.current !== connectionCount) {
      fetchBoards().then(result => {
        if (!result.error) setBoards(result.boards);
      });
    }
    syncedCount.current = connectionCount;
  }, [connectionCount]);

  const handleRetry = () => {
    setLoading(true);
    fetchBoards().then(applyResult);
  };

  // Shown straight away, then saved; put back if saving fails
  const handleToggleStar = async (boardId, e) => {
    e.stopPropagation();
    const board = boards.find(b => b.id === boardId);
    if (!board) return;
    const starred = !board.starred;
    setStarError('');
    setBoards(prev => prev.map(b => (b.id === boardId ? { ...b, starred, starredAt: null } : b)));
    try {
      const response = await setBoardStarred(boardId, starred);
      setBoards(prev => prev.map(b => (b.id === boardId
        ? { ...b, starred: response.data.starred, starredAt: response.data.starredAt }
        : b)));
    } catch (err) {
      console.error(err);
      setBoards(prev => prev.map(b => (b.id === boardId
        ? { ...b, starred: board.starred, starredAt: board.starredAt }
        : b)));
      setStarError(getApiErrorMessage(err, 'Could not update the star. Please try again.'));
    }
  };

  // Add the board returned by POST /api/boards to the top of the grid
  const handleEditBoard = (board, e) => {
    e.stopPropagation();
    setEditingBoard(board);
  };

  // Merge the PUT /api/boards/{id} response into the card, keeping local state like `starred`
  const handleBoardUpdated = (updated) => {
    setBoards(prev => prev.map(b =>
      b.id === updated.id ? { ...b, name: updated.name, description: updated.description } : b
    ));
    setEditingBoard(null);
  };

  const handleBoardCreated = (created) => {
    setBoards(prev => [toBoard(created), ...prev]);
    setShowCreatePopup(false);
  };

  return (
    <div className="dashboard-page">
      <Sidebar />
      <div className="dashboard-main-content">
        <Topbar searchValue={searchQuery} onSearchChange={setSearchQuery} />

        {/* Dashboard Content Panel */}
        <main className="dashboard-content-panel">
          
          {/* Header decorative Honeycomb & Bee overlay */}
          <div className="header-decoration">
            <svg className="honeycomb-bg" width="300" height="240" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Honeycomb Pattern Mesh */}
              <defs>
                <pattern id="honeycomb-pattern" width="36" height="62.4" patternUnits="userSpaceOnUse">
                  <path d="M 0 0 L 18 10.4 L 36 0 L 36 20.8 L 18 31.2 L 0 20.8 Z M 0 62.4 L 18 52 L 36 62.4 L 36 41.6 L 18 31.2 L 0 41.6 Z" fill="none" stroke="rgba(242, 143, 15, 0.12)" strokeWidth="1.5" />
                </pattern>
              </defs>
              <rect width="300" height="240" fill="url(#honeycomb-pattern)" />
              {/* Flight Path */}
              <path d="M 120 180 C 140 130, 200 120, 230 150" stroke="#f28f0f" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" opacity="0.6" />
              {/* Render Bee inside SVG */}
              <Bee x={230} y={150} rotate={45} type="idea" size={38} />
            </svg>
          </div>

          {/* Welcome greeting */}
          <div className="welcome-banner">
            <h1 className="welcome-title">
              {starredView ? 'Starred boards' : `Welcome back, ${firstName}!`}
              <svg className="welcome-bee" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <defs>
                  <clipPath id="welcome-bee-body">
                    <ellipse cx="26" cy="29" rx="13" ry="10" />
                  </clipPath>
                </defs>
                {/* Wings */}
                <g className="welcome-bee-wings">
                  <ellipse cx="22" cy="15" rx="6" ry="9" transform="rotate(-25 22 15)" fill="#ffffff" stroke="#e8c9a0" strokeWidth="1.5" opacity="0.95" />
                  <ellipse cx="31" cy="15" rx="5" ry="8" transform="rotate(20 31 15)" fill="#ffffff" stroke="#e8c9a0" strokeWidth="1.5" opacity="0.95" />
                </g>
                {/* Body with stripes */}
                <ellipse cx="26" cy="29" rx="13" ry="10" fill="#ffc233" />
                <g clipPath="url(#welcome-bee-body)" fill="#3c2415">
                  <rect x="22" y="17" width="4" height="24" />
                  <rect x="30" y="17" width="4" height="24" />
                </g>
                <ellipse cx="26" cy="29" rx="13" ry="10" stroke="#3c2415" strokeWidth="1.5" />
                {/* Stinger */}
                <path d="M39 29 L44 27.5 L39 31 Z" fill="#3c2415" />
                {/* Head, eye, smile & antennae */}
                <circle cx="12" cy="28" r="6.5" fill="#3c2415" />
                <circle cx="10" cy="26.5" r="1.6" fill="#ffffff" />
                <path d="M8.5 30.5 Q10.5 32 12.5 30.5" stroke="#ffc233" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M11 22 Q8 16 5 15" stroke="#3c2415" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14 22 Q14 16 11 13" stroke="#3c2415" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="5" cy="15" r="1.6" fill="#3c2415" />
                <circle cx="11" cy="13" r="1.6" fill="#3c2415" />
              </svg>
            </h1>
            <p className="welcome-subtitle">
              {starredView
                ? 'The boards you\'ve starred, most recent first. Stars are just for you.'
                : 'Here\'s what\'s happening in your workspace.'}
            </p>
          </div>

          {starError && (
            <div className="dashboard-notice" role="alert">
              <span>{starError}</span>
              <button type="button" onClick={() => setStarError('')} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {notice && (
            <div className="dashboard-notice" role="status">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          )}

          {/* All Boards Section */}
          <section className="boards-section">
            <div className="boards-header">
              <h2 className="section-title">
                {searching ? 'Search results' : starredView ? 'Starred' : 'All Boards'}
                {searching && !loading && !error && (
                  <span className="boards-search-count" aria-live="polite">
                    {visibleBoards.length} of {baseBoards.length} {baseBoards.length === 1 ? 'board' : 'boards'}
                  </span>
                )}
              </h2>
              
              <div className="boards-controls">
                <div className="sort-dropdown">
                  <span className="sort-label">Sort by:</span>
                  <button className="sort-btn">
                    {sortBy}
                    <ChevronDown size={16} />
                  </button>
                </div>

                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    aria-label="Grid View"
                  >
                    <Grid size={18} />
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    aria-label="List View"
                  >
                    <ListIcon size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Boards Grid */}
            <div className={`boards-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              
              {/* Create Board Card */}
              {!searching && !starredView && (
                <div
                  className="board-card create-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowCreatePopup(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowCreatePopup(true);
                    }
                  }}
                >
                  <div className="create-card-content">
                    <div className="hexagon-btn">
                      <svg className="hexagon-svg" viewBox="0 0 100 100">
                        <polygon points="50,5 95,25 95,75 50,95 5,75 5,25" fill="none" stroke="#f28f0f" strokeWidth="4" />
                      </svg>
                      <Plus className="plus-icon" size={28} />
                    </div>
                    <span className="create-label">Create Board</span>
                  </div>
                </div>
              )}

              {/* Boards loaded from GET /api/boards */}
              {!loading && !error && visibleBoards.map(board => {
                const scheme = getColorScheme(board.id);
                return (
                  <div
                    key={board.id}
                    className="board-card real-board"
                    role="link"
                    tabIndex={0}
                    onClick={() => navigate(`/boards/${board.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/boards/${board.id}`);
                    }}
                    style={{
                      '--board-bg': scheme.bg,
                      '--board-accent': scheme.accent,
                      '--board-text': scheme.text
                    }}
                  >
                    {/* Name & description preview */}
                    <div className="board-card-preview">
                      {!board.ownedByMe && (
                        <span className="board-shared-badge">Shared with you · {roleLabel(board.myRole)}</span>
                      )}
                      <h3 className="board-card-title" title={board.name}>
                        <HighlightText text={board.name} words={words} />
                      </h3>
                      <p className={`board-card-description ${board.description ? '' : 'empty'}`}>
                        {board.description ? <HighlightText text={board.description} words={words} /> : 'No description'}
                      </p>
                    </div>

                    <div className="board-card-footer">
                      <div className="board-meta">
                        <span className="board-meta-item" title={`Created by ${board.createdBy || 'Unknown'}`}>
                          <User size={13} />
                          <span className="board-meta-text">{board.createdBy || 'Unknown'}</span>
                        </span>
                        <span className="board-meta-item" title={board.createdAt ? new Date(board.createdAt).toLocaleString() : ''}>
                          <Calendar size={13} />
                          <span className="board-meta-text">{formatCreatedDate(board.createdAt)}</span>
                        </span>
                      </div>
                      <div className="board-card-actions">
                        {/* Only board admins may rename or re-describe a board */}
                        {board.myRole === 'ADMIN' && (
                          <button
                            className="edit-btn"
                            onClick={(e) => handleEditBoard(board, e)}
                            onKeyDown={(e) => e.stopPropagation()}
                            aria-label="Edit Board"
                            title="Edit board"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        <button
                          className={`star-btn ${board.starred ? 'starred' : ''}`}
                          onClick={(e) => handleToggleStar(board.id, e)}
                          onKeyDown={(e) => e.stopPropagation()}
                          aria-label={board.starred ? 'Unstar Board' : 'Star Board'}
                        >
                          <Star size={16} fill={board.starred ? '#f28f0f' : 'transparent'} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>

            {loading && <p className="boards-status">Loading your boards...</p>}

            {!loading && error && (
              <div className="boards-status error">
                <span>{error}</span>
                <button className="boards-retry-btn" onClick={handleRetry}>Retry</button>
              </div>
            )}

            {!loading && !error && baseBoards.length === 0 && (
              starredView ? (
                <div className="boards-status boards-no-results">
                  <span>No starred boards yet. Click the ☆ on any board to add it here.</span>
                  <button className="boards-retry-btn" onClick={() => navigate('/dashboard')}>Go to all boards</button>
                </div>
              ) : (
                <p className="boards-status">No boards yet. Create your first board to get started!</p>
              )
            )}

            {!loading && !error && baseBoards.length > 0 && searching && visibleBoards.length === 0 && (
              <div className="boards-status boards-no-results">
                <span>No boards match "{searchQuery.trim()}".</span>
                <button className="boards-retry-btn" onClick={() => setSearchQuery('')}>Clear search</button>
              </div>
            )}
          </section>

          {/* Bottom decorative looping Bee path */}
          <div className="footer-decoration">
            <svg className="footer-bee-path" width="220" height="120" viewBox="0 0 220 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 20 100 C 60 100, 80 50, 110 50 C 140 50, 160 100, 200 80" stroke="#f28f0f" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" opacity="0.6" />
              <Bee x={200} y={80} rotate={-15} type="read" size={38} />
            </svg>
          </div>

        </main>
      </div>

      {editingBoard && (
        <CreatePopup
          board={editingBoard}
          onClose={() => setEditingBoard(null)}
          onUpdated={handleBoardUpdated}
        />
      )}

      {showCreatePopup && (
        <CreatePopup
          onClose={() => setShowCreatePopup(false)}
          onCreated={handleBoardCreated}
        />
      )}
    </div>
  );
}
