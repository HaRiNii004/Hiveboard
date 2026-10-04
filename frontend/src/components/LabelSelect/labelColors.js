// Colours for label options. `key` matches the backend LabelColor enum;
// bg/text are Notion's select-option colours.
export const LABEL_COLORS = [
  { key: 'DEFAULT', name: 'Default', bg: '#efeeec', text: '#37352f' },
  { key: 'GRAY',    name: 'Gray',    bg: '#e3e2e0', text: '#32302c' },
  { key: 'BROWN',   name: 'Brown',   bg: '#eee0da', text: '#442a1e' },
  { key: 'ORANGE',  name: 'Orange',  bg: '#fadec9', text: '#49290e' },
  { key: 'YELLOW',  name: 'Yellow',  bg: '#fdecc8', text: '#402c1b' },
  { key: 'GREEN',   name: 'Green',   bg: '#dbeddb', text: '#1c3829' },
  { key: 'BLUE',    name: 'Blue',    bg: '#d3e5ef', text: '#183347' },
  { key: 'PURPLE',  name: 'Purple',  bg: '#e8deee', text: '#412454' },
  { key: 'PINK',    name: 'Pink',    bg: '#f5e0e9', text: '#4c2337' },
  { key: 'RED',     name: 'Red',     bg: '#ffe2dd', text: '#5d1715' }
];

export const getLabelColor = (key) => {
  return LABEL_COLORS.find(color => color.key === key) || LABEL_COLORS[0];
};

// New options cycle through the non-default colours so neighbours differ
export const pickNewLabelColor = (existingOptions) => {
  const palette = LABEL_COLORS.slice(1);
  return palette[existingOptions.length % palette.length].key;
};
