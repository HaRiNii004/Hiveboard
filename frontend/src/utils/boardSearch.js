// Board search on the dashboard (in the browser: the dashboard already has every board).
//
// The query is split into words; a board matches when EVERY word appears somewhere in its
// name, description or creator's name (ignoring capitals and accents), so
// "road q4" finds "Q4 Roadmap".

const normalize = (text) =>
  (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const searchWords = (query) =>
  normalize(query).split(/\s+/).filter(Boolean);

export const matchesBoard = (board, words) => {
  if (words.length === 0) return true;
  const haystack = normalize(`${board.name} ${board.description || ''} ${board.createdBy || ''}`);
  return words.every(word => haystack.includes(word));
};

// Splits `text` into [{ text, match }] parts for highlighting the search words.
// Works on the original text, so capitals and spacing are kept.
export const highlightParts = (text, words) => {
  if (!text || words.length === 0) return [{ text: text || '', match: false }];

  const folded = normalize(text);
  // Mark every character covered by any search word (accents are removed one-for-one,
  // so positions line up with the original text for ordinary names)
  const marked = new Array(text.length).fill(false);
  if (folded.length === text.length) {
    words.forEach(word => {
      let from = 0;
      let index;
      while ((index = folded.indexOf(word, from)) !== -1) {
        for (let i = index; i < index + word.length; i++) marked[i] = true;
        from = index + word.length;
      }
    });
  }

  const parts = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) {
      last.text += text[i];
    } else {
      parts.push({ text: text[i], match: marked[i] });
    }
  }
  return parts;
};
