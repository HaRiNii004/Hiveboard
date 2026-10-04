import api from './axiosClient';

export const createBoard = (name, description) => {
  return api.post('/boards', { name, description });
};

export const getBoards = () => {
  return api.get('/boards');
};

// Full board with its lists, and each list's cards, in position order
export const getBoardDetail = (boardId) => {
  return api.get(`/boards/${boardId}`);
};

export const updateBoard = (boardId, name, description) => {
  return api.put(`/boards/${boardId}`, { name, description });
};

// Renames the board's labels field (e.g. "Labels" -> "Tags")
export const updateLabelsTitle = (boardId, labelsTitle) => {
  return api.patch(`/boards/${boardId}/labels-title`, { labelsTitle });
};
