import { createContext } from 'react';

// Shared notification state, provided by NotificationsProvider:
// { notifications, unreadCount, markRead(notification), markAllRead() }
export const NotificationsContext = createContext(null);
