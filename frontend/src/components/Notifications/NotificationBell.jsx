import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from './useNotifications';
import { metaFor, linkFor } from './notificationMeta';
import { timeAgo } from '../../utils/timeAgo';
import './NotificationBell.css';

// Bell in the top bar: unread badge, and a dropdown with all notifications
export default function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const openNotification = (notification) => {
    markRead(notification);
    const link = linkFor(notification);
    if (link) {
      setOpen(false);
      navigate(link.path, { state: link.state });
    }
  };

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="notif-bell" ref={containerRef}>
      <button
        type="button"
        className="action-btn notif-bell-btn"
        onClick={() => setOpen(o => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-bell-count">{badge}</span>}
      </button>

      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-panel-header">
            <h2 className="notif-panel-title">Notifications</h2>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} />
                Mark all as read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={22} />
              <p>You're all caught up.</p>
              <span>We'll let you know when something happens on your boards.</span>
            </div>
          ) : (
            <ul className="notif-list">
              {notifications.map(notification => {
                const { icon: Icon, tone } = metaFor(notification.type);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      className={`notif-item tone-${tone} ${notification.read ? '' : 'unread'}`}
                      onClick={() => openNotification(notification)}
                    >
                      <span className="notif-item-icon" aria-hidden="true"><Icon size={15} /></span>
                      <span className="notif-item-text">
                        <span className="notif-item-message">{notification.message}</span>
                        <time
                          className="notif-item-time"
                          dateTime={notification.createdAt}
                          title={new Date(notification.createdAt).toLocaleString()}
                        >
                          {timeAgo(notification.createdAt)}
                        </time>
                      </span>
                      {!notification.read && <span className="notif-item-dot" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
