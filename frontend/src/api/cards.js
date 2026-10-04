import api from './axiosClient';

export const createCard = (listId, title, description) => {
  return api.post(`/lists/${listId}/cards`, { title, description });
};

export const updateCard = (cardId, title, description) => {
  return api.put(`/cards/${cardId}`, { title, description });
};
