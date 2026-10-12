import { useContext } from 'react';
import { NotificationsContext } from './notificationsContext';

export const useNotifications = () => {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>');
  }
  return value;
};
