// Where the login (JWT + who you are) is kept in the browser.
//
// "Remember me": localStorage, so you stay logged in after closing the browser
// (the token itself lasts 30 days). Otherwise sessionStorage, which the browser
// forgets when the tab is closed (and the token lasts 1 day).

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Storage can throw (e.g. blocked site data); treat that as "nothing stored"
const read = (key) => {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getToken = () => read(TOKEN_KEY);

export const isLoggedIn = () => Boolean(getToken());

// { email, fullName } or null
export const getStoredUser = () => {
  try {
    return JSON.parse(read(USER_KEY)) || null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    [sessionStorage, localStorage].forEach(store => {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    });
  } catch {
    // nothing stored, nothing to clear
  }
};

// auth: the backend's AuthResponse ({ token, email, fullName })
export const saveSession = ({ token, email, fullName }, rememberMe) => {
  clearSession(); // never leave an older login behind in the other storage
  const store = rememberMe ? localStorage : sessionStorage;
  store.setItem(TOKEN_KEY, token);
  store.setItem(USER_KEY, JSON.stringify({ email, fullName }));
};
