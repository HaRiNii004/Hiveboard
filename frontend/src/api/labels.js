import api from './axiosClient';

// Label options belong to a board; cards select from them

export const createLabel = (boardId, name, color) => {
  return api.post(`/boards/${boardId}/labels`, { name, color });
};

export const updateLabel = (labelId, name, color) => {
  return api.put(`/labels/${labelId}`, { name, color });
};

export const deleteLabel = (labelId) => {
  return api.delete(`/labels/${labelId}`);
};
