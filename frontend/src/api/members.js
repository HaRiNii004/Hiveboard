import api from './axiosClient';

export const getMembers = (boardId) => {
  return api.get(`/boards/${boardId}/members`);
};

// Admin only
export const changeMemberRole = (boardId, userId, role) => {
  return api.patch(`/boards/${boardId}/members/${userId}`, { role });
};

// Admin removes someone, or pass your own userId to leave the board
export const removeMember = (boardId, userId) => {
  return api.delete(`/boards/${boardId}/members/${userId}`);
};
