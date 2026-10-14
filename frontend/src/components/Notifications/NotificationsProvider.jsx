import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/notifications';
import { NotificationsContext } from './notificationsContext';
import NotificationToasts from './NotificationToasts';
import { useRealtime } from '../Realtime/useRealtime';
import { getToken } from '../../utils/authSession';

const POLL_MS = 30000;     // fallback check; new notifications normally arrive over the WebSocket
const OVERLAP_MS = 30000;  // re-ask a little further back so nothing committed late is missed
const MAX_KEPT = 100;
const MAX_NEW_TOASTS = 3;

const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

// Resolves (never rejects) with the poll result, or null when logged out / on error.
const fetchSince = (after) => {
  if (!getToken()) return Promise.resolve(null);
  return getNotifications(after)
    .then(response => response.data)
    .catch(err => {
      console.error(err);
      return null;
    });
};

// The logged-in user's notifications: pushed instantly over the WebSocket, with
// polling as a fallback (and to load the list). Shared with the bell via
// useNotifications; new ones pop up as a toast in the bottom-right.
export default function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const seenIds = useRef(new Set());
  const latestAt = useRef(null);     // newest createdAt seen so far
  const initialLoadDone = useRef(false);
  const token = useRef(null);        // whose notifications we're showing

  useEffect(() => {
    let active = true;

    const tick = () => {
      // Someone logged out or a different user logged in: start over
      const currentToken = getToken();
      if (currentToken !== token.current) {
        token.current = currentToken;
        seenIds.current = new Set();
        latestAt.current = null;
        initialLoadDone.current = false;
      }

      const after = latestAt.current
        ? new Date(new Date(latestAt.current).getTime() - OVERLAP_MS).toISOString()
        : null;
      const forToken = currentToken;

      fetchSince(after).then(data => {
        if (!active || token.current !== forToken) return;
        if (!data) {
          if (!forToken) {
            setNotifications([]);
            setUnreadCount(0);
            setToasts([]);
          }
          return;
        }

        const fresh = data.notifications.filter(n => !seenIds.current.has(n.id));
        fresh.forEach(n => seenIds.current.add(n.id));

        if (!initialLoadDone.current) {
          setNotifications(data.notifications);
        } else if (fresh.length > 0) {
          setNotifications(prev => [...fresh, ...prev].sort(byNewest).slice(0, MAX_KEPT));
          // Only things that arrived while you were here pop up
          setToasts(prev => [...prev, ...fresh.slice(0, MAX_NEW_TOASTS)]);
        }
        if (data.notifications.length > 0) {
          const newest = data.notifications[0].createdAt;
          if (!latestAt.current || new Date(newest) > new Date(latestAt.current)) {
            latestAt.current = newest;
          }
        }
        initialLoadDone.current = true;
        setUnreadCount(data.unreadCount);
      });
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Pushed the moment they're created (deduped against what polling already found)
  const { subscribe } = useRealtime();
  useEffect(() => subscribe('/user/queue/notifications', notification => {
    if (seenIds.current.has(notification.id)) return;
    seenIds.current.add(notification.id);
    if (!latestAt.current || new Date(notification.createdAt) > new Date(latestAt.current)) {
      latestAt.current = notification.createdAt;
    }
    setNotifications(prev => [notification, ...prev].sort(byNewest).slice(0, MAX_KEPT));
    setUnreadCount(count => count + 1);
    setToasts(prev => [...prev, notification]);
  }), [subscribe]);

  const markRead = useCallback((notification) => {
    if (notification.read) return;
    setNotifications(prev => prev.map(n => (n.id === notification.id ? { ...n, read: true } : n)));
    setUnreadCount(count => Math.max(0, count - 1));
    markNotificationRead(notification.id).catch(err => console.error(err));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    markAllNotificationsRead().catch(err => console.error(err));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // A message from the app itself (not a server notification) in the same bottom-right
  // stack, e.g. "Archived ..." with Undo:
  //   { title, message, icon, tone, action: { label, run }, duration (ms) }
  const showToast = useCallback((toast) => {
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { ...toast, id, local: true }]);
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, markRead, markAllRead, showToast }),
    [notifications, unreadCount, markRead, markAllRead, showToast]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationToasts toasts={toasts} onDismiss={dismissToast} onOpen={markRead} />
    </NotificationsContext.Provider>
  );
}
