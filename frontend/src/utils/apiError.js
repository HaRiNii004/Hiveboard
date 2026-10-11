// Turns an axios error into a message to show the user.
//
// The backend answers with { error: "..." } or a field -> message map for
// validation errors. A 403 WITH a message means "your role can't do that";
// a bare 401/403 (no body) is Spring Security rejecting an expired login.
export const getApiErrorMessage = (err, fallback = 'Connection to backend failed. Please try again.') => {
  const data = err && err.response && err.response.data;
  const status = err && err.response && err.response.status;
  const hasMessage = data && typeof data === 'object' && Object.keys(data).length > 0;

  if (hasMessage) {
    return data.error || Object.values(data)[0];
  }
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please log in again.';
  }
  return fallback;
};
