import api from './axiosClient';

// dueDate: "yyyy-MM-dd" or null; dueTime: "HH:mm" or null (needs a dueDate)
// assigneeId: user id of a board member, or null for unassigned
// highPriority: flag the new card as high priority
// hiddenFromViewers: hide the new card from people with the Viewer role
export const createCard = (listId, title, description, labelIds = [], dueDate = null, dueTime = null,
  assigneeId = null, highPriority = false, hiddenFromViewers = false) => {
  return api.post(`/lists/${listId}/cards`,
    { title, description, labelIds, dueDate, dueTime, assigneeId, highPriority, hiddenFromViewers });
};

// dueDate / dueTime / assigneeId replace the current ones; null clears them.
// "Assigned by" is set by the backend to whoever changes the assignee.
// highPriority / hiddenFromViewers: leave undefined to keep them as they are
// version: the card version you loaded; if someone changed it since, the server answers 409
export const updateCard = (cardId, title, description, labelIds, dueDate = null, dueTime = null,
  assigneeId = null, highPriority = undefined, hiddenFromViewers = undefined, version = undefined) => {
  return api.put(`/cards/${cardId}`,
    { title, description, labelIds, dueDate, dueTime, assigneeId, highPriority, hiddenFromViewers, version });
};

// Flag / unflag as high priority (flagged cards are listed at the top of their list)
export const setCardPriority = (cardId, highPriority) => {
  return api.patch(`/cards/${cardId}/priority`, { highPriority });
};

// Reorder a list's cards: send every card id in the new order (the server sets
// position = index and broadcasts the resulting order to everyone on the board)
export const reorderCards = (listId, orderedCardIds) => {
  return api.patch(`/lists/${listId}/cards/reorder`, { orderedCardIds });
};

// Move a card to another list. orderedCardIds: the target list's cards in their new order
// (including the moved card) so it lands exactly where it was dropped.
export const moveCard = (cardId, targetListId, orderedCardIds) => {
  return api.patch(`/cards/${cardId}/move`, { targetListId, orderedCardIds });
};

// Copy a card (title + " (copy)", description, labels, due date) right below the original
export const duplicateCard = (cardId) => {
  return api.post(`/cards/${cardId}/duplicate`);
};

// ---- Archive ----

// Off the board into the board's archive
export const archiveCard = (cardId) => {
  return api.patch(`/cards/${cardId}/archive`);
};

// Back onto the board; listId only needed when its own list is archived too
export const restoreCard = (cardId, listId = null) => {
  return api.patch(`/cards/${cardId}/restore`, { listId });
};

// Deletes for good (from the archive)
export const deleteCard = (cardId) => {
  return api.delete(`/cards/${cardId}`);
};
