// Helpers for card due dates. The backend sends the day as "yyyy-MM-dd" and an
// optional time as "HH:mm" (or "HH:mm:ss"); both are read as local time so
// nothing shifts between timezones.

const parseLocalDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

// "14:30:00" -> "14:30" (what <input type="time"> uses)
export const toTimeInputValue = (dueTime) => (dueTime ? dueTime.slice(0, 5) : '');

// Returns { text, status, tooltip } for a due date/time, or null if there is none.
// status: 'overdue' | 'soon' (today/tomorrow) | 'upcoming'
export const getDueDateInfo = (dueDate, dueTime) => {
  if (!dueDate) return null;

  const day = parseLocalDate(dueDate);
  const today = startOfToday();
  const daysLeft = Math.round((day - today) / (24 * 60 * 60 * 1000));

  // With a time, the card is overdue once that moment passes;
  // without one, it is due until the end of the day
  let due = day;
  let timeText = '';
  if (dueTime) {
    const [hours, minutes] = dueTime.split(':').map(Number);
    due = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
    timeText = due.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  const overdue = dueTime ? due < new Date() : daysLeft < 0;

  const dateText = day.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(day.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {})
  });
  const withTime = (text) => (timeText ? `${text}, ${timeText}` : text);

  if (overdue) {
    return { text: withTime(dateText), status: 'overdue', tooltip: `Overdue (was due ${withTime(dateText)})` };
  }
  if (daysLeft === 0) {
    return { text: withTime('Today'), status: 'soon', tooltip: `Due ${withTime('today')}` };
  }
  if (daysLeft === 1) {
    return { text: withTime('Tomorrow'), status: 'soon', tooltip: `Due ${withTime('tomorrow')}` };
  }
  return { text: withTime(dateText), status: 'upcoming', tooltip: `Due ${withTime(dateText)}` };
};
