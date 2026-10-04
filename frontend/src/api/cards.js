import api from './axiosClient';

export const createCard = (listId, title, description, labelIds = []) => {
  return api.post(`/lists/${listId}/cards`, { title, description, labelIds });
};

export const updateCard = (cardId, title, description, labelIds) => {
  return api.put(`/cards/${cardId}`, { title, description, labelIds });
};
