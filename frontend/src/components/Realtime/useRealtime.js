import { useContext } from 'react';
import { RealtimeContext } from './realtimeContext';

export const useRealtime = () => {
  const value = useContext(RealtimeContext);
  if (!value) {
    throw new Error('useRealtime must be used inside <RealtimeProvider>');
  }
  return value;
};
