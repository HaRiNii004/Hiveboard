import api from './axiosClient';

// Threads: top-level comments newest first, each with `replies` oldest first
export const getComments = (cardId) => {
  return api.get(`/cards/${cardId}/comments`);
};

// parentId: the comment being replied to (null for a new top-level comment)
// mentionedUserIds: board members @mentioned in the text (they get notified)
export const addComment = (cardId, text, parentId = null, mentionedUserIds = []) => {
  return api.post(`/cards/${cardId}/comments`, { text, parentId, mentionedUserIds });
};
