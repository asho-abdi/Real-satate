import api, { normalizeApiError, writeSession, readSession } from './api.js';

function mapSession(data) {
  const user = data?.user || {};
  return {
    id: user.id,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    email: user.email,
    phone: user.phone || '',
    role: user.role || user.roleName || 'ADMIN',
    roleName: user.roleName || user.role || 'ADMIN',
    isAdmin: Boolean(user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'),
    permissions: user.permissions || [],
    buildingIds: user.buildingIds === null ? null : user.buildingIds || [],
    buildings: user.buildings || [],
    token: data.accessToken,
    refreshToken: data.refreshToken,
    avatar:
      user.avatar ||
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
  };
}

export async function getMe() {
  try {
    const res = await api.get('/auth/me');
    const data = res.data?.data ?? res.data;
    const user = data?.user || data;
    const session = readSession() || {};
    return {
      ...session,
      id: user.id || session.id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email || session.email,
      phone: user.phone || session.phone || '',
      role: user.role || user.roleName || session.role,
      roleName: user.roleName || user.role || session.roleName,
      isAdmin: Boolean(user.isAdmin || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'),
      permissions: user.permissions || session.permissions || [],
      buildingIds: user.buildingIds === null ? null : user.buildingIds || session.buildingIds || [],
      buildings: user.buildings || session.buildings || [],
      token: session.token,
      refreshToken: session.refreshToken,
      avatar:
        user.avatar ||
        session.avatar ||
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    };
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Session expired');
  }
}

export async function login({ email, password }) {
  try {
    const res = await api.post('/auth/login', { email, password });
    const data = res.data?.data ?? res.data;
    if (!data?.accessToken) {
      throw new Error('Login succeeded but no access token was returned');
    }
    return mapSession(data);
  } catch (error) {
    const normalized = normalizeApiError(error);
    const err = new Error(normalized.message || 'Invalid email or password');
    err.status = normalized.status || 401;
    throw err;
  }
}

export async function logout() {
  const session = readSession();
  try {
    if (session?.refreshToken) {
      await api.post('/auth/logout', { refreshToken: session.refreshToken });
    }
  } catch {
    // still clear local session
  } finally {
    writeSession(null);
  }
  return { success: true };
}

export async function changePassword({ currentPassword, newPassword }) {
  try {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data?.data ?? res.data ?? { success: true };
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Could not change password');
  }
}

export async function updateProfile(payload) {
  try {
    const res = await api.patch('/auth/me', payload);
    const data = res.data?.data ?? res.data;
    const user = data?.user || data;
    const session = readSession() || {};
    const next = {
      ...session,
      id: user.id || session.id,
      name: user.name || session.name,
      email: user.email || session.email,
      phone: user.phone || '',
      role: user.role || user.roleName || session.role,
    };
    writeSession(next);
    return next;
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Could not update profile');
  }
}

export async function forgotPassword(email) {
  try {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data?.data ?? res.data ?? { success: true };
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Could not send reset email');
  }
}

export async function resetPassword({ password, token }) {
  try {
    const res = await api.post('/auth/reset-password', { password, token });
    return res.data?.data ?? res.data ?? { success: true };
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Could not reset password');
  }
}

export const authService = {
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
  forgotPassword,
  resetPassword,
};

export default authService;
