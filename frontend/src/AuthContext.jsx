// src/AuthContext.jsx
//
// Holds the current logged-in user (or null) and exposes login/register/
// logout. On first load, if a token is already saved in the browser, it
// asks the backend "who am I?" to restore the session automatically.

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, getToken, setToken, clearToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // becomes true once we've checked for a saved session

  useEffect(() => {
    const token = getToken();
    if (!token) { setReady(true); return; }

    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setReady(true));
  }, []);

  const applySession = useCallback(({ token, user }) => {
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, applySession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
