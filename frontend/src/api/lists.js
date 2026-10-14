import api from './axiosClient';

export const createList = (boardId, name) => {
  return api.post(`/boards/${boardId}/lists`, { name });
};

export const updateList = (listId, name) => {
  return api.put(`/boards/lists/${listId}`, { name });
};

// ---- Archive ----

export const archiveList = (listId) => {
  return api.patch(`/boards/lists/${listId}/archive`);
};

// Back at the end of the board, with its cards
export const restoreList = (listId) => {
  return api.patch(`/boards/lists/${listId}/restore`);
};

// "Archive all cards in this list" -> { archived: n }
export const archiveAllCards = (listId) => {
  return api.patch(`/boards/lists/${listId}/archive-cards`);
};

// Deletes for good, with its cards (from the archive)
export const deleteList = (listId) => {
  return api.delete(`/boards/lists/${listId}`);
};
