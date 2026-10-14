import { Flag, CalendarDays } from 'lucide-react';
import { getColorScheme } from '../../utils/boardColors';
import { getDueDateInfo } from '../../utils/dueDate';
import { formatTime, longDayTitle } from '../../utils/calendarDates';
import { initials } from '../../utils/initials';

// Everything due on the selected day, in time order (all-day cards first)
export default function CalendarDayPanel({ day, cards, onOpen }) {
  return (
    <aside className="calendar-day-panel" aria-label={`Due on ${longDayTitle(day)}`}>
      <h2 className="calendar-day-title">{longDayTitle(day)}</h2>
      <p className="calendar-day-count">
        {cards.length === 0 ? 'Nothing due' : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} due`}
      </p>

      {cards.length === 0 ? (
        <div className="calendar-day-empty">
          <CalendarDays size={28} />
          <span>Cards with a due date on this day show up here.</span>
        </div>
      ) : (
        <ul className="calendar-agenda">
          {cards.map(card => {
            const scheme = getColorScheme(card.boardId);
            const due = getDueDateInfo(card.dueDate, card.dueTime);
            const overdue = due && due.status === 'overdue';
            return (
              <li key={card.id}>
                <button
                  type="button"
                  className={`calendar-agenda-item ${overdue ? 'overdue' : ''}`}
                  style={{ '--chip-bg': scheme.bg, '--chip-accent': scheme.accent, '--chip-text': scheme.text }}
                  onClick={() => onOpen(card)}
                  title="Open this card"
                >
                  <span className="calendar-agenda-time">
                    {card.dueTime ? formatTime(card.dueTime) : 'All day'}
                    {overdue && <span className="calendar-agenda-overdue">Overdue</span>}
                  </span>
                  <span className="calendar-agenda-title">
                    {card.highPriority && <Flag size={12} className="calendar-chip-flag" aria-label="High priority" />}
                    {card.title}
                  </span>
                  <span className="calendar-agenda-meta">
                    <span className="calendar-agenda-board">{card.boardName}</span>
                    <span className="calendar-agenda-list">in {card.listName}</span>
                    {card.assignee && (
                      <span className="calendar-agenda-assignee" title={`Assigned to ${card.assignee.fullName}`}>
                        {initials(card.assignee.fullName)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
