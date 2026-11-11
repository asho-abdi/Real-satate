import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService.js';
import { readSession, writeSession } from '../services/api.js';

const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const session = readSession();
    if (!session?.token) return null;
    if (String(session.token).startsWith('mock-')) {
      writeSession(null);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persist = (nextUser) => {
    setUser(nextUser);
    writeSession(nextUser);
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSession() {
      const stored = readStoredSession();
      if (!stored) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const session = await authService.getMe();
        if (!cancelled) persist(session);
      } catch {
        if (!cancelled) persist(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const session = await authService.login(credentials);
      persist(session);
      toast.success(`Welcome back, ${session.name}`);
      navigate('/dashboard');
      return session;
    } catch (error) {
      if (error?.mfaRequired) throw error;
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
    try {
      await authService.forgotPassword(email);
      toast.success('Reset link sent if the account exists');
    } catch (error) {
      toast.error(error.message || 'Could not send reset email');
      throw error;
    }
  };

  const resetPassword = async (payload) => {
    try {
      await authService.resetPassword(payload);
      toast.success('Password updated. Please sign in.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Could not reset password');
      throw error;
    }
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
