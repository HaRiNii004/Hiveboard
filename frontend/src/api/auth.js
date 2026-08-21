import api from './axiosClient';

export const login = (email, password) => {
  return api.post('/auth/login', { email, password });
};

export const signup = (fullName, email, password) => {
  return api.post('/auth/register', { fullName, email, password });
};
