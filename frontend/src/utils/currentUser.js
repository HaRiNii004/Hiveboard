import { getStoredUser } from './authSession';

// The logged-in user's email (lowercased); '' if unknown
export const currentUserEmail = () => {
  const user = getStoredUser();
  return user && user.email ? user.email.toLowerCase() : '';
};
