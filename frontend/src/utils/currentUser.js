// The logged-in user's email (lowercased), from what the login page stored; '' if unknown
export const currentUserEmail = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user && user.email ? user.email.toLowerCase() : '';
  } catch {
    return '';
  }
};
