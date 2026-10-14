// "just now", "5 min ago", "3 h ago", "yesterday, 14:30", "12 Oct, 09:15", "3 Jan 2025"
export const formatRelative = (iso) => {
  const date = new Date(iso);
  const now = new Date();
  const seconds = Math.round((now - date) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date >= startOfToday) return hours < 6 ? `${hours} h ago` : `today, ${time}`;
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (date >= startOfYesterday) return `yesterday, ${time}`;
  if (date.getFullYear() === now.getFullYear()) {
    return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${time}`;
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Full date and time, for tooltips
export const formatFull = (iso) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' });
