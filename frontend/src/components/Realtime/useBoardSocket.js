import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime } from './useRealtime';

const CURSOR_SEND_MS = 75;   // ~13 cursor messages a second at most
const CURSOR_IDLE_MS = 5000; // hide a cursor that stopped moving

// Real-time for one board page:
//   - board events for this board -> onEvent(event)
//   - every reconnect after the first -> onResync() (events missed while offline are gone)
//   - presence (who's here) and other people's live cursors
//   - sendCursor(x, y) / hideCursor(), throttled
// `enabled` should only be true once the board loaded (i.e. we're a member), because the
// server rejects presence/cursor subscriptions from non-members.
export function useBoardSocket({ boardId, myUserId, enabled, onEvent, onResync }) {
  const { connected, connectionCount, subscribe, publish } = useRealtime();
  const [presence, setPresence] = useState([]);
  const [cursors, setCursors] = useState({}); // userId -> cursor

  // Latest callbacks without re-subscribing on every render
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);
  const myUserIdRef = useRef(myUserId);
  useEffect(() => {
    onEventRef.current = onEvent;
    onResyncRef.current = onResync;
    myUserIdRef.current = myUserId;
  });

  // Board events arrive on the personal queue (role-filtered by the server)
  useEffect(() => {
    if (!enabled) return undefined;
    return subscribe('/user/queue/boards', event => {
      if (event.boardId === boardId) onEventRef.current(event);
    });
  }, [boardId, enabled, subscribe]);

  // Presence and cursors
  useEffect(() => {
    if (!enabled) return undefined;
    const offTopic = subscribe(`/topic/boards/${boardId}/presence`, p => setPresence(p.users));
    const offMine = subscribe('/user/queue/presence', p => {
      if (p.boardId === boardId) setPresence(p.users);
    });
    const offCursors = subscribe(`/topic/boards/${boardId}/cursors`, cursor => {
      if (cursor.userId === myUserIdRef.current) return; // never draw my own
      setCursors(prev => {
        const next = { ...prev };
        if (cursor.visible) {
          next[cursor.userId] = { ...cursor, at: Date.now() };
        } else {
          delete next[cursor.userId];
        }
        return next;
      });
    });
    return () => {
      offTopic();
      offMine();
      offCursors();
    };
  }, [boardId, enabled, subscribe]);

  // Join presence on every (re)connect, leave when leaving the page
  useEffect(() => {
    if (!enabled || !connected) return undefined;
    publish(`/app/boards/${boardId}/presence.join`);
    return () => publish(`/app/boards/${boardId}/presence.leave`);
  }, [boardId, enabled, connected, connectionCount, publish]);

  // Resync on reconnect (not on the first connection: the page just loaded the board)
  const syncedCount = useRef(null);
  useEffect(() => {
    if (!enabled || connectionCount === 0) return;
    if (syncedCount.current !== null && syncedCount.current !== connectionCount) {
      onResyncRef.current();
    }
    syncedCount.current = connectionCount;
  }, [enabled, connectionCount]);

  // Forget cursors that stopped moving
  useEffect(() => {
    const timer = setInterval(() => {
      const cutoff = Date.now() - CURSOR_IDLE_MS;
      setCursors(prev => {
        const stale = Object.values(prev).filter(c => c.at < cutoff);
        if (stale.length === 0) return prev;
        const next = { ...prev };
        stale.forEach(c => { delete next[c.userId]; });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Throttled cursor sending (with a trailing send so the final position arrives)
  const lastSent = useRef(0);
  const pending = useRef(null);
  const trailingTimer = useRef(null);

  const sendCursor = useCallback((x, y) => {
    if (!enabled) return;
    const flush = () => {
      trailingTimer.current = null;
      lastSent.current = Date.now();
      publish(`/app/boards/${boardId}/cursor`, pending.current);
    };
    pending.current = { x: Math.round(x), y: Math.round(y), visible: true };
    const wait = CURSOR_SEND_MS - (Date.now() - lastSent.current);
    if (wait <= 0) {
      flush();
    } else if (!trailingTimer.current) {
      trailingTimer.current = setTimeout(flush, wait);
    }
  }, [boardId, enabled, publish]);

  const hideCursor = useCallback(() => {
    if (!enabled) return;
    clearTimeout(trailingTimer.current);
    trailingTimer.current = null;
    publish(`/app/boards/${boardId}/cursor`, { visible: false });
  }, [boardId, enabled, publish]);

  useEffect(() => () => clearTimeout(trailingTimer.current), []);

  // Only draw cursors of people who are still here
  const presentIds = new Set(presence.map(p => p.userId));
  const liveCursors = Object.values(cursors).filter(c => presentIds.has(c.userId));

  return { connected, presence, cursors: liveCursors, sendCursor, hideCursor };
}
