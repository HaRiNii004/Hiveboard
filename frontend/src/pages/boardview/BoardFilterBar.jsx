import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X, Check, Flag } from 'lucide-react';
import { EMPTY_FILTERS, DUE_OPTIONS, activeFilterCount } from '../../utils/cardFilters';
import { initials } from '../../utils/initials';
import './BoardFilterBar.css';

const toggle = (values, value) => (values.includes(value) ? values.filter(v => v !== value) : [...values, value]);

// One choice in the filter popover (a checkbox-like toggle)
function Option({ selected, onClick, children }) {
  return (
    <button type="button" className={`filter-option ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected}>
      <span className="filter-check" aria-hidden="true">{selected && <Check size={12} strokeWidth={3} />}</span>
      {children}
    </button>
  );
}

// Search + "Filters" (assignee, due date, priority) at the top right of the board.
//   filters, onChange(filters)
//   members   the board's members
//   shown / total  how many cards match
export default function BoardFilterBar({ filters, onChange, members, myUserId, shown, total }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const count = activeFilterCount(filters);
  const filtering = count > 0;

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return undefined;
    const handleMouseDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
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

  const set = (changes) => onChange({ ...filters, ...changes });
  const memberName = (id) => {
    if (id === 'me') return 'Assigned to me';
    if (id === 'none') return 'Unassigned';
    const member = members.find(m => m.userId === id);
    return member ? member.fullName : 'Someone';
  };
  const others = members.filter(m => m.userId !== myUserId);

  return (
    <div className="board-filter-bar" ref={wrapperRef}>
      <div className="board-filter-row">
        <label className="board-filter-search">
          <Search size={15} />
          <input
            value={filters.text}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="Filter cards..."
            aria-label="Filter cards by text"
          />
          {filters.text && (
            <button type="button" onClick={() => set({ text: '' })} aria-label="Clear text filter"><X size={14} /></button>
          )}
        </label>

        <button
          type="button"
          className={`board-filter-toggle ${filtering ? 'active' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <SlidersHorizontal size={15} />
          Filters
          {count > 0 && <span className="board-filter-badge">{count}</span>}
        </button>

        {filtering && (
          <>
            <span className="board-filter-summary" role="status">
              Showing {shown} of {total} {total === 1 ? 'card' : 'cards'}
            </span>
            <button type="button" className="board-filter-clear" onClick={() => onChange(EMPTY_FILTERS)}>
              Clear filters
            </button>
          </>
        )}
      </div>

      {/* What's on, as removable chips */}
      {(filters.members.length > 0 || filters.due.length > 0 || filters.priority) && (
        <div className="board-filter-chips">
          {filters.members.map(id => (
            <button key={id} type="button" className="board-filter-chip" onClick={() => set({ members: toggle(filters.members, id) })} title="Remove filter">
              {memberName(id)} <X size={12} />
            </button>
          ))}
          {filters.due.map(value => (
            <button key={value} type="button" className="board-filter-chip" onClick={() => set({ due: toggle(filters.due, value) })} title="Remove filter">
              {DUE_OPTIONS.find(o => o.value === value).label} <X size={12} />
            </button>
          ))}
          {filters.priority && (
            <button type="button" className="board-filter-chip" onClick={() => set({ priority: false })} title="Remove filter">
              <Flag size={12} /> High priority <X size={12} />
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="board-filter-popover" role="dialog" aria-label="Filter cards">
          <section className="filter-section">
            <h3 className="filter-heading">Assigned to</h3>
            <div className="filter-options">
              <Option selected={filters.members.includes('me')} onClick={() => set({ members: toggle(filters.members, 'me') })}>
                <span className="filter-avatar me">Me</span> Assigned to me
              </Option>
              <Option selected={filters.members.includes('none')} onClick={() => set({ members: toggle(filters.members, 'none') })}>
                <span className="filter-avatar none">?</span> Unassigned
              </Option>
              {others.map(member => (
                <Option key={member.userId} selected={filters.members.includes(member.userId)} onClick={() => set({ members: toggle(filters.members, member.userId) })}>
                  <span className="filter-avatar">{initials(member.fullName)}</span> {member.fullName}
                </Option>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <h3 className="filter-heading">Due date</h3>
            <div className="filter-options">
              {DUE_OPTIONS.map(option => (
                <Option key={option.value} selected={filters.due.includes(option.value)} onClick={() => set({ due: toggle(filters.due, option.value) })}>
                  {option.label}
                </Option>
              ))}
            </div>
          </section>

          <section className="filter-section">
            <h3 className="filter-heading">Priority</h3>
            <div className="filter-options">
              <Option selected={filters.priority} onClick={() => set({ priority: !filters.priority })}>
                <Flag size={13} className="filter-flag" /> High priority only
              </Option>
            </div>
          </section>

          <p className="filter-hint">Cards that match any choice in a group are shown; groups combine.</p>
        </div>
      )}
    </div>
  );
}
