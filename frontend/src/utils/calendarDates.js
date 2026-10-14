// Date helpers for the calendar. Days are handled as local "yyyy-MM-dd" strings,
// the same format the backend uses for card due dates.

const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const parseISODate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// The 6 weeks (42 days, Monday first) shown for a month, as "yyyy-MM-dd" strings
export const monthGridDays = (year, month) => {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // days since Monday
  return Array.from({ length: 42 }, (_, i) => toISODate(new Date(year, month, 1 - offset + i)));
};

export const addMonths = ({ year, month }, delta) => {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const monthTitle = ({ year, month }) =>
  new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const longDayTitle = (iso) =>
  parseISODate(iso).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

// "14:30:00" -> "2:30 PM" (in the user's locale)
export const formatTime = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};
