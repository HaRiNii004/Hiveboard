// @mentions in comments. The text keeps "@Full Name"; the comment also lists who that is.

// Ids of the members a text mentions ("@Full Name", any letter case)
export const mentionedIds = (text, members) => {
  const lower = text.toLowerCase();
  return members.filter(m => lower.includes(`@${m.fullName.toLowerCase()}`)).map(m => m.userId);
};

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Splits a comment into text and mention parts, for highlighting:
// [{ text }, { text: '@Bob Smith', mention: { id, fullName } }, ...]
export const splitMentions = (text, mentions) => {
  if (!mentions || mentions.length === 0) return [{ text }];
  // Longest names first, so "@Ann Lee" wins over "@Ann"
  const sorted = [...mentions].sort((a, b) => b.fullName.length - a.fullName.length);
  const pattern = new RegExp(`(${sorted.map(m => `@${escapeRegExp(m.fullName)}`).join('|')})`, 'gi');
  return text.split(pattern).filter(Boolean).map(part => {
    const mention = sorted.find(m => `@${m.fullName}`.toLowerCase() === part.toLowerCase());
    return mention ? { text: part, mention } : { text: part };
  });
};
