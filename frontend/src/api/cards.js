import api from './axiosClient';

// dueDate: "yyyy-MM-dd" or null; dueTime: "HH:mm" or null (needs a dueDate)
export const createCard = (listId, title, description, labelIds = [], dueDate = null, dueTime = null) => {
  return api.post(`/lists/${listId}/cards`, { title, description, labelIds, dueDate, dueTime });
};

// dueDate / dueTime replace the current ones; null clears them
export const updateCard = (cardId, title, description, labelIds, dueDate = null, dueTime = null) => {
  return api.put(`/cards/${cardId}`, { title, description, labelIds, dueDate, dueTime });
};
