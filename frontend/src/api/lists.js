import api from './axiosClient';

export const createList = (boardId, name) => {
  return api.post(`/boards/${boardId}/lists`, { name });
};

export const updateList = (listId, name) => {
  return api.put(`/boards/lists/${listId}`, { name });
};
