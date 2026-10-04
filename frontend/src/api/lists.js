import api from './axiosClient';

export const createList = (boardId, name) => {
  return api.post(`/boards/${boardId}/lists`, { name });
};
