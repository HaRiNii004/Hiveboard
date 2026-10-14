import { Flag } from 'lucide-react';
import { getColorScheme } from '../../utils/boardColors';
import { getDueDateInfo } from '../../utils/dueDate';
import { formatTime } from '../../utils/calendarDates';

// A card in a calendar day cell, coloured like its board. Clicking opens the card on its board.
export default function CalendarCardChip({ card, onOpen }) {
  const scheme = getColorScheme(card.boardId);
  const due = getDueDateInfo(card.dueDate, card.dueTime);
  const overdue = due && due.status === 'overdue';

  return (
    <button
      type="button"
      className={`calendar-chip ${overdue ? 'overdue' : ''}`}
      style={{ '--chip-bg': scheme.bg, '--chip-accent': scheme.accent, '--chip-text': scheme.text }}
      onClick={(e) => {
        e.stopPropagation(); // don't also select the day
        onOpen(card);
      }}
      title={`${card.title} · ${card.boardName} / ${card.listName}${due ? ` · ${due.tooltip}` : ''}`}
    >
      {card.highPriority && <Flag size={10} className="calendar-chip-flag" aria-label="High priority" />}
      {card.dueTime && <span className="calendar-chip-time">{formatTime(card.dueTime)}</span>}
      <span className="calendar-chip-title">{card.title}</span>
    </button>
  );
}
