import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { metaFor, linkFor } from './notificationMeta';
import './NotificationToasts.css';

const TOAST_MS = 6000;

function Toast({ notification, onDismiss, onOpen }) {
  const navigate = useNavigate();
  const { icon: Icon, tone } = metaFor(notification.type);
  const link = linkFor(notification);

  // Each toast closes itself after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), TOAST_MS);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const open = () => {
    onOpen(notification);
    onDismiss(notification.id);
    if (link) navigate(link);
  };

  return (
    <div className={`notif-toast tone-${tone}`} role="status">
      <span className="notif-toast-icon" aria-hidden="true"><Icon size={16} /></span>
      <button type="button" className="notif-toast-body" onClick={open}>
        <span className="notif-toast-title">New notification</span>
        <span className="notif-toast-message">{notification.message}</span>
      </button>
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
