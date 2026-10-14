import { useEffect, useState } from 'react';
import {
  ArrowRightLeft, Plus, Copy, Pencil, AlignLeft, Calendar, UserCheck, Tag, Flag, EyeOff, Trash2,
  MessageSquare, LayoutList, LayoutDashboard, UserPlus, UserMinus, Shield, LogOut, History
} from 'lucide-react';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatRelative, formatFull } from '../../utils/relativeTime';
import './ActivityFeed.css';

const ICONS = {
  BOARD_CREATED: LayoutDashboard, BOARD_UPDATED: LayoutDashboard,
  LIST_CREATED: LayoutList, LIST_RENAMED: LayoutList, LIST_DELETED: Trash2,
  CARD_CREATED: Plus, CARD_DUPLICATED: Copy, CARD_RENAMED: Pencil, CARD_DESCRIPTION: AlignLeft,
  CARD_DUE_DATE: Calendar, CARD_ASSIGNEE: UserCheck, CARD_LABELS: Tag, CARD_PRIORITY: Flag,
  CARD_VISIBILITY: EyeOff, CARD_MOVED: ArrowRightLeft, CARD_DELETED: Trash2,
  COMMENT_ADDED: MessageSquare,
  LABEL_CREATED: Tag, LABEL_UPDATED: Tag, LABEL_DELETED: Tag,
  MEMBER_JOINED: UserPlus, MEMBER_ROLE_CHANGED: Shield, MEMBER_REMOVED: UserMinus, MEMBER_LEFT: LogOut
};

const CARD_TOKEN = '{card}';

// A history list: "Alice moved “Write docs” from “To do” to “Done” · 5 min ago".
//   load(before)      -> promise of { items, hasMore } (newest first; keep it stable, e.g. useCallback)
//   subscribe(fn)     -> unsubscribe; fn(entry) is called for each new live entry
//   accept(entry)     -> whether a live entry belongs in this feed (stable too)
//   cardView          -> inside a card: "{card}" reads "this card"
//   canOpenCard(id), onOpenCard(id) -> in a board feed, card names open the card if it still exists
export default function ActivityFeed({
  load, subscribe, accept, cardView = false, canOpenCard = null, onOpenCard = null,
  emptyText = 'Nothing has happened here yet.'
}) {
  const [entries, setEntries] = useState(null); // null while loading
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    load(null)
      .then(page => {
        if (cancelled) return;
        setEntries(page.items);
        setHasMore(page.hasMore);
      })
      .catch(err => {
        console.error(err);
        if (!cancelled) {
          setEntries([]);
          setError(getApiErrorMessage(err, 'Could not load the activity.'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [load]);

  // New entries as they happen (ignored until the first page is in, to keep the order right)
  useEffect(() => subscribe(entry => {
    if (accept && !accept(entry)) return;
    setEntries(prev => (prev === null || prev.some(e => e.id === entry.id) ? prev : [entry, ...prev]));
  }), [subscribe, accept]);

  const loadMore = async () => {
    if (!entries || entries.length === 0) return;
    setLoadingMore(true);
    setError('');
    try {
      const page = await load(entries[entries.length - 1].id);
      setEntries(prev => [...prev, ...page.items.filter(item => !prev.some(e => e.id === item.id))]);
      setHasMore(page.hasMore);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, 'Could not load older activity.'));
    } finally {
      setLoadingMore(false);
    }
  };

  const renderCard = (entry) => {
    if (cardView) return <span className="activity-card-ref">this card</span>;
    const title = `“${entry.cardTitle}”`;
    if (onOpenCard && canOpenCard && canOpenCard(entry.cardId)) {
      return (
        <button type="button" className="activity-card-link" onClick={() => onOpenCard(entry.cardId)} title="Open this card">
          {title}
        </button>
      );
    }
    return <span className="activity-card-ref">{title}</span>;
  };

  const renderMessage = (entry) => {
    const parts = entry.message.split(CARD_TOKEN);
    return parts.map((part, i) => (
      <span key={i}>
        {part}
        {i < parts.length - 1 && renderCard(entry)}
      </span>
    ));
  };

  if (entries === null) return <p className="activity-status">Loading activity...</p>;

  return (
    <div className="activity-feed">
      {error && <p className="activity-status error" role="alert">{error}</p>}
      {entries.length === 0 && !error && (
        <p className="activity-status">
          <History size={16} />
          {emptyText}
        </p>
      )}
      <ol className="activity-list">
        {entries.map(entry => {
          const Icon = ICONS[entry.type] || History;
          return (
            <li key={entry.id} className="activity-item">
              <span className={`activity-icon type-${entry.type.split('_')[0].toLowerCase()}`} aria-hidden="true">
                <Icon size={13} />
              </span>
              <div className="activity-body">
                <p className="activity-text">
                  <strong className="activity-actor">{entry.actorName || 'Someone'}</strong>{' '}
                  {renderMessage(entry)}
                </p>
                <time className="activity-time" dateTime={entry.createdAt} title={formatFull(entry.createdAt)}>
                  {formatRelative(entry.createdAt)}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore && (
        <button type="button" className="activity-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Loading...' : 'Show older activity'}
        </button>
      )}
    </div>
  );
}
