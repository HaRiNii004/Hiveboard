import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, UserX, Search } from 'lucide-react';
import { initials } from '../../utils/initials';
import { timeAgo } from '../../utils/timeAgo';
import './AssigneeSelect.css';

const ROLE_NAMES = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

// Pick who a card is assigned to, from the board's members.
//
// Props:
//   members: [{ userId, fullName, email, role }]
//   value / onChange(userId | null)
//   assignedBy, assignedAt   who assigned the card's saved assignee, and when
//   savedAssigneeId          the card's saved assignee, to know if the pick changed
//   disabled
export default function AssigneeSelect({
  members,
  value,
  onChange,
  assignedBy,
  assignedAt,
  savedAssigneeId = null,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  // Close when clicking anywhere outside the component
  useEffect(() => {
    if (!open) return undefined;
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const selected = members.find(m => m.userId === value) || null;
  const q = query.trim().toLowerCase();
  const filtered = members.filter(m =>
    m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  );

  const pick = (userId) => {
    onChange(userId);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation(); // close the list, not the whole popup
      setOpen(false);
      setQuery('');
    } else if (e.key === 'Enter' && open) {
      e.preventDefault(); // don't submit the surrounding form
      if (filtered.length === 1) pick(filtered[0].userId);
    }
  };

  // "Assigned by" line under the picker
  let assignedNote = null;
  if (value !== null && value === savedAssigneeId && assignedBy) {
    assignedNote = `Assigned by ${assignedBy.fullName}${assignedAt ? ` · ${timeAgo(assignedAt)}` : ''}`;
  } else if (value !== null && value !== savedAssigneeId) {
    assignedNote = "You'll be recorded as the person who assigned it";
  }

  return (
    <div className="assignee-select" ref={containerRef} onKeyDown={handleKeyDown}>
      <span className="assignee-label" id="assignee-label">Assigned to</span>

      <button
        type="button"
        className={`assignee-control ${open ? 'open' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby="assignee-label"
      >
        {selected ? (
          <>
            <span className="assignee-avatar" aria-hidden="true">{initials(selected.fullName)}</span>
            <span className="assignee-name">{selected.fullName}</span>
          </>
        ) : (
          <>
            <span className="assignee-avatar empty" aria-hidden="true"><UserX size={14} /></span>
            <span className="assignee-name placeholder">Unassigned</span>
          </>
        )}
        {!disabled && <ChevronDown size={16} className="assignee-chevron" />}
      </button>

      {open && (
        <div className="assignee-panel">
          {members.length > 5 && (
            <div className="assignee-search">
              <Search size={14} className="assignee-search-icon" />
              <input
                className="assignee-search-input"
                placeholder="Search members"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search members"
                autoFocus
              />
            </div>
          )}

          <ul className="assignee-options" role="listbox" aria-labelledby="assignee-label">
            {!q && (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === null}
                  className="assignee-option"
                  onClick={() => pick(null)}
                >
                  <span className="assignee-avatar empty" aria-hidden="true"><UserX size={14} /></span>
                  <span className="assignee-option-text">
                    <span className="assignee-option-name">Unassigned</span>
                  </span>
                  {value === null && <Check size={16} className="assignee-check" />}
                </button>
              </li>
            )}
            {filtered.map(member => (
              <li key={member.userId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === member.userId}
                  className="assignee-option"
                  onClick={() => pick(member.userId)}
                >
                  <span className="assignee-avatar" aria-hidden="true">{initials(member.fullName)}</span>
                  <span className="assignee-option-text">
                    <span className="assignee-option-name">{member.fullName}</span>
                    <span className="assignee-option-email">{member.email} · {ROLE_NAMES[member.role] || member.role}</span>
                  </span>
                  {value === member.userId && <Check size={16} className="assignee-check" />}
                </button>
              </li>
            ))}
            {q && filtered.length === 0 && <li className="assignee-empty">No members match "{query}"</li>}
          </ul>
          <p className="assignee-hint">People appear here once they've joined the board.</p>
        </div>
      )}

      {assignedNote && <span className="assignee-note">{assignedNote}</span>}
    </div>
  );
}
