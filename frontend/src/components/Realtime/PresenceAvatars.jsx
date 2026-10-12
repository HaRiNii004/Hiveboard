import { initials } from '../../utils/initials';
import './PresenceAvatars.css';

const MAX_SHOWN = 4;

// "Who's here" avatar stack. One avatar per person, coloured like their live cursor.
export default function PresenceAvatars({ users, myUserId, connected }) {
  if (!connected) {
    return (
      <span className="presence-offline" title="Live updates paused — reconnecting">
        <span className="presence-dot offline" />
        Reconnecting…
      </span>
    );
  }
  if (users.length === 0) return null;

  // Me first, then everyone else
  const ordered = [...users].sort((a, b) => (a.userId === myUserId ? -1 : b.userId === myUserId ? 1 : 0));
  const shown = ordered.slice(0, MAX_SHOWN);
  const extra = ordered.length - shown.length;
  const names = ordered.map(u => (u.userId === myUserId ? `${u.fullName} (you)` : u.fullName)).join(', ');

  return (
    <div className="presence" aria-label={`On this board now: ${names}`} title={`On this board now: ${names}`}>
      <span className="presence-dot" aria-hidden="true" />
      <div className="presence-stack">
        {shown.map(user => (
          <span
            key={user.userId}
            className="presence-avatar"
            style={{ '--presence-color': user.color }}
            aria-hidden="true"
          >
            {initials(user.fullName)}
          </span>
        ))}
        {extra > 0 && <span className="presence-avatar more" aria-hidden="true">+{extra}</span>}
      </div>
    </div>
  );
}
