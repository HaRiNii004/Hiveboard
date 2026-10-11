import api from './axiosClient';

// Newest first
export const getComments = (cardId) => {
  return api.get(`/cards/${cardId}/comments`);
};

export const addComment = (cardId, text) => {
  return api.post(`/cards/${cardId}/comments`, { text });
};
