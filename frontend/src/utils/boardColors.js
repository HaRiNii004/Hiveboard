// Colour schemes for board cards, all drawn from the dashboard's warm
// cream/honey background so cards blend in: soft background, accent, readable text
export const BOARD_COLOR_SCHEMES = [
  { name: 'honey',    bg: '#fff3e0', accent: '#f28f0f', text: '#5c3a0c' },
  { name: 'cream',    bg: '#fef9f2', accent: '#f5b04a', text: '#614d42' },
  { name: 'butter',   bg: '#fff8e1', accent: '#f2b705', text: '#5a4300' },
  { name: 'apricot',  bg: '#ffeedd', accent: '#f5891f', text: '#5e3510' },
  { name: 'amber',    bg: '#fff0d4', accent: '#e09b1a', text: '#5a3d08' },
  { name: 'peach',    bg: '#fdebdc', accent: '#e8814a', text: '#653219' },
  { name: 'caramel',  bg: '#f9e8d2', accent: '#c47a2c', text: '#4f2f12' },
  { name: 'toffee',   bg: '#f6e6d6', accent: '#a8673a', text: '#3c2415' }
];

// Same board id always maps to the same colour scheme
export const getColorScheme = (boardId) => {
  const key = String(boardId);
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return BOARD_COLOR_SCHEMES[Math.abs(hash) % BOARD_COLOR_SCHEMES.length];
};
