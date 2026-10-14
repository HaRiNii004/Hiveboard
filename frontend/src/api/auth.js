import api from './axiosClient';

// rememberMe: a 30-day login instead of 1 day
export const login = (email, password, rememberMe = false) => {
  return api.post('/auth/login', { email, password, rememberMe });
};

export const signup = (fullName, email, password) => {
  return api.post('/auth/register', { fullName, email, password });
};

// --- Forgot password ---

// Same answer whether or not the email has an account
export const requestPasswordReset = (email) => {
  return api.post('/auth/forgot-password', { email });
};

// { email } if the reset link is still good, 400 if not
export const checkResetToken = (token) => {
  return api.get(`/auth/reset-password/${encodeURIComponent(token)}`);
};

export const resetPassword = (token, newPassword) => {
  return api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { newPassword });
};

// --- Continue with Google ---

// { enabled, clientId }
export const getGoogleConfig = () => {
  return api.get('/auth/google/config');
};

// code: from Google's sign-in popup
export const googleLogin = (code, rememberMe = false) => {
  return api.post('/auth/google', { code, rememberMe });
};
