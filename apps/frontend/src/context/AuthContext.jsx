import { createContext, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService.js';
import { STORAGE_KEY } from '../services/api.js';

const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!session?.token) return null;
    if (String(session.token).startsWith('mock-')) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readStoredSession());
  const [loading, setLoading] = useState(false);

  const persist = (nextUser) => {
    setUser(nextUser);
    if (nextUser) localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const login = async (credentials) => {
    setLoading(true);
    try {
      const session = await authService.login(credentials);
      persist(session);
      toast.success(`Welcome back, ${session.name}`);
      navigate('/dashboard');
      return session;
    } catch (error) {
      toast.error(error.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      persist(null);
      toast.success('Signed out');
      navigate('/login');
    }
  };

  const forgotPassword = async (email) => {
    await authService.forgotPassword(email);
    toast.success('Reset link sent if the account exists');
  };

  const resetPassword = async (payload) => {
    await authService.resetPassword(payload);
    toast.success('Password updated. Please sign in.');
    navigate('/login');
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
      forgotPassword,
      resetPassword,
      setUser: persist,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
