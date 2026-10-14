import { getDueDateInfo } from './dueDate';
import { toISODate, parseISODate } from './calendarDates';

// Board filters. Within a group any choice matches (overdue or due today); groups combine
// (assigned to me and overdue).
//   text      words in the title or description
//   members   'me', 'none' (unassigned) or user ids
//   due       'overdue' | 'today' | 'week' (next 7 days) | 'none' (no due date)
//   priority  only high-priority cards
export const EMPTY_FILTERS = { text: '', members: [], due: [], priority: false };

export const DUE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due in the next 7 days' },
  { value: 'none', label: 'No due date' }
];

export const activeFilterCount = (f) =>
  (f.text.trim() ? 1 : 0) + f.members.length + f.due.length + (f.priority ? 1 : 0);

export const isFiltering = (f) => activeFilterCount(f) > 0;

const dueMatches = (card, option, today, weekEnd) => {
  if (option === 'none') return !card.dueDate;
  if (!card.dueDate) return false;
  if (option === 'overdue') {
    const info = getDueDateInfo(card.dueDate, card.dueTime);
    return info && info.status === 'overdue';
  }
  if (option === 'today') return card.dueDate === today;
  if (option === 'week') return card.dueDate >= today && card.dueDate <= weekEnd;
  return false;
};

// Returns a predicate for cards (dates worked out once, not per card)
export const cardFilter = (f, myUserId) => {
  const words = f.text.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const today = toISODate(new Date());
  const weekEndDate = parseISODate(today);
  weekEndDate.setDate(weekEndDate.getDate() + 7);
  const weekEnd = toISODate(weekEndDate);

  return (card) => {
    if (words.length) {
      const haystack = `${card.title} ${card.description || ''}`.toLowerCase();
      if (!words.every(word => haystack.includes(word))) return false;
    }
    if (f.members.length) {
      const assigneeId = card.assignee ? card.assignee.id : null;
      const ok = f.members.some(m =>
        (m === 'none' && assigneeId === null)
        || (m === 'me' && assigneeId !== null && assigneeId === myUserId)
        || (m === assigneeId));
      if (!ok) return false;
    }
    if (f.due.length && !f.due.some(option => dueMatches(card, option, today, weekEnd))) return false;
    if (f.priority && !card.highPriority) return false;
    return true;
  };
};

// Per board, for this browser tab (so a refresh keeps them)
const storageKey = (boardId) => `hiveboard.filters.${boardId}`;

export const loadFilters = (boardId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(boardId)));
    if (!saved) return EMPTY_FILTERS;
    const { text, members, due, priority } = { ...EMPTY_FILTERS, ...saved };
    return { text, members, due, priority };
  } catch {
    return EMPTY_FILTERS;
  }
};

export const saveFilters = (boardId, filters) => {
  try {
    if (isFiltering(filters)) sessionStorage.setItem(storageKey(boardId), JSON.stringify(filters));
    else sessionStorage.removeItem(storageKey(boardId));
  } catch {
    // only a convenience
  }
};
