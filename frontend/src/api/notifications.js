import api from './axiosClient';

// The current user's notifications (newest first) + unread count.
// Pass `after` (ISO time) to only get newer ones when polling.
export const getNotifications = (after = null) => {
  return api.get('/notifications', { params: after ? { after } : {} });
};

export const markNotificationRead = (notificationId) => {
  return api.patch(`/notifications/${notificationId}/read`);
};

export const markAllNotificationsRead = () => {
  return api.post('/notifications/read-all');
};
