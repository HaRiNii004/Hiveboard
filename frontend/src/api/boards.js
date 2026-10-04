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
