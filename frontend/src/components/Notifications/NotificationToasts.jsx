import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { metaFor, linkFor } from './notificationMeta';
import './NotificationToasts.css';

const TOAST_MS = 6000;       // notifications
const APP_TOAST_MS = 4000;   // the app's own messages (e.g. "Archived ...")

function Toast({ notification, onDismiss, onOpen }) {
  const navigate = useNavigate();
  const local = Boolean(notification.local);
  const meta = local ? { icon: notification.icon, tone: notification.tone || 'honey' } : metaFor(notification.type);
  const { icon: Icon, tone } = meta;
  const link = local ? null : linkFor(notification);
  const duration = local ? (notification.duration || APP_TOAST_MS) : TOAST_MS;

  // Each toast closes itself after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), duration);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss, duration]);

  const open = () => {
    if (!local) onOpen(notification);
    onDismiss(notification.id);
    if (link) navigate(link.path, { state: link.state });
  };

  const runAction = () => {
    onDismiss(notification.id);
    notification.action.run();
  };

  return (
    <div className={`notif-toast tone-${tone}`} role="status">
      <span className="notif-toast-icon" aria-hidden="true">{Icon && <Icon size={16} />}</span>
      <button type="button" className="notif-toast-body" onClick={open}>
        <span className="notif-toast-title">{local ? notification.title : 'New notification'}</span>
        <span className="notif-toast-message">{notification.message}</span>
      </button>
      {local && notification.action && (
        <button type="button" className="notif-toast-action" onClick={runAction}>
          {notification.action.label}
        </button>
      )}
      <button
        type="button"
        className="notif-toast-close"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Small pop-ups stacked in the bottom-right corner for newly arrived notifications
export default function NotificationToasts({ toasts, onDismiss, onOpen }) {
  if (toasts.length === 0) return null;

  return (
    <div className="notif-toasts" aria-live="polite">
      {toasts.map(notification => (
        <Toast key={notification.id} notification={notification} onDismiss={onDismiss} onOpen={onOpen} />
      ))}
    </div>
  );
}
