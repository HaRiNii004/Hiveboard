// "Harini Selvaraj" -> "HS", for avatar circles
export const initials = (name) =>
  (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
