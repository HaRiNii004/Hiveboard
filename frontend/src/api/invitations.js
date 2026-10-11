import api from './axiosClient';

// --- Admin side ---

// Response includes inviteUrl (only available right after creating)
export const createInvitation = (boardId, email, role) => {
  return api.post(`/boards/${boardId}/invitations`, { email, role });
};

export const getPendingInvitations = (boardId) => {
  return api.get(`/boards/${boardId}/invitations`);
};

export const revokeInvitation = (invitationId) => {
  return api.delete(`/invitations/${invitationId}`);
};

// --- Invitee side (must be logged in) ---

export const previewInvitation = (token) => {
  return api.get(`/invitations/${token}`);
};

export const acceptInvitation = (token) => {
  return api.post(`/invitations/${token}/accept`);
};
