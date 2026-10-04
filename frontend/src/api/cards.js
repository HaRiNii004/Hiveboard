import api from './axiosClient';

export const createCard = (listId, title, description) => {
  return api.post(`/lists/${listId}/cards`, { title, description });
};
