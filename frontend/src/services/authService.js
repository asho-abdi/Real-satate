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
    allowedPages: Array.isArray(user.allowedPages) ? user.allowedPages : [],
    buildingIds: user.buildingIds === null ? null : user.buildingIds || [],
    buildings: user.buildings || [],
    mfaEnabled: Boolean(user.mfaEnabled),
    token: data.accessToken,
    refreshToken: data.refreshToken,
    avatar: user.avatar || null,
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
      allowedPages: Array.isArray(user.allowedPages)
        ? user.allowedPages
        : session.allowedPages || [],
      buildingIds: user.buildingIds === null ? null : user.buildingIds || session.buildingIds || [],
      buildings: user.buildings || session.buildings || [],
      mfaEnabled: Boolean(user.mfaEnabled ?? session.mfaEnabled),
      token: session.token,
      refreshToken: session.refreshToken,
      avatar: user.avatar || session.avatar || null,
    };
  } catch (error) {
    const normalized = normalizeApiError(error);
    throw new Error(normalized.message || 'Session expired');
  }
}

export async function login({ email, password, mfaCode, recoveryCode }) {
  try {
    const res = await api.post('/auth/login', {
      email,
      password,
      ...(mfaCode ? { mfaCode } : {}),
      ...(recoveryCode ? { recoveryCode } : {}),
    });
    const data = res.data?.data ?? res.data;
    if (data?.mfaRequired) {
      const err = new Error('Authenticator code required');
      err.status = 200;
      err.mfaRequired = true;
      err.pendingUser = data.user || null;
      throw err;
    }
    if (!data?.accessToken) {
      throw new Error('Login succeeded but no access token was returned');
    }
    return mapSession(data);
  } catch (error) {
    if (error?.mfaRequired) throw error;
    const normalized = normalizeApiError(error);
    const err = new Error(normalized.message || 'Invalid email or password');
    err.status = normalized.status || 401;
    err.code = normalized.code;
    throw err;
  }
}

export async function logout() {
  const session = readSession();
  try {
    await api.post(
      '/auth/logout',
      session?.refreshToken ? { refreshToken: session.refreshToken } : {},
    );
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
      mfaEnabled: Boolean(user.mfaEnabled ?? session.mfaEnabled),
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

export async function getMfaStatus() {
  const res = await api.get('/auth/mfa/status');
  return res.data?.data ?? res.data;
}

export async function enrollMfa() {
  const res = await api.post('/auth/mfa/enroll');
  return res.data?.data ?? res.data;
}

export async function confirmMfa(code) {
  const res = await api.post('/auth/mfa/confirm', { code });
  return res.data?.data ?? res.data;
}

export async function disableMfa({ code, recoveryCode } = {}) {
  const res = await api.post('/auth/mfa/disable', { code, recoveryCode });
  return res.data?.data ?? res.data;
}

export const authService = {
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
  forgotPassword,
  resetPassword,
  getMfaStatus,
  enrollMfa,
  confirmMfa,
  disableMfa,
};

export default authService;
