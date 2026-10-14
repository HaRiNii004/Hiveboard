import { useCallback, useEffect } from 'react';
import { History, X } from 'lucide-react';
import ActivityFeed from '../../components/Activity/ActivityFeed';
import { getBoardActivity } from '../../api/activity';
import './BoardTasksPanel.css'; // the same slide-in panel
import './BoardActivityPanel.css';

// The board's history, newest first, updating live. Card names open the card.
//   subscribeActivity(fn) -> unsubscribe   (new entries pushed over the WebSocket)
//   canOpenCard(cardId), onOpenCard(cardId)
export default function BoardActivityPanel({ boardId, boardName, subscribeActivity, canOpenCard, onOpenCard, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const load = useCallback(
    (before) => getBoardActivity(boardId, before).then(response => response.data),
    [boardId]
  );

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="board-tasks-overlay" onMouseDown={handleOverlayClick}>
      <aside className="board-tasks-panel" role="dialog" aria-modal="true" aria-labelledby="board-activity-title">
        <div className="board-tasks-header">
          <div className="board-tasks-heading">
            <h2 id="board-activity-title" className="board-tasks-title">
              <History size={20} />
              Activity
            </h2>
            <p className="board-tasks-subtitle" title={boardName}>
              Who changed what on {boardName}
            </p>
          </div>
          <button type="button" className="board-tasks-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="board-tasks-body board-activity-body">
          <ActivityFeed
            load={load}
            subscribe={subscribeActivity}
            canOpenCard={canOpenCard}
            onOpenCard={onOpenCard}
            emptyText="Changes to this board will show up here."
          />
        </div>
      </aside>
    </div>
  );
}
