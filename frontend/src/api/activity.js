import api from './axiosClient';

// History, newest first: { items, hasMore }. `before` = id of the oldest entry you have.

export const getBoardActivity = (boardId, before = null) => {
  return api.get(`/boards/${boardId}/activity`, { params: before ? { before } : {} });
};

export const getCardActivity = (cardId, before = null) => {
  return api.get(`/cards/${cardId}/activity`, { params: before ? { before } : {} });
};
