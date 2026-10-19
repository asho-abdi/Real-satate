import axios from 'axios';

const STORAGE_KEY = 'estateops-auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

let refreshPromise = null;

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else localStorage.removeItem(STORAGE_KEY);
}

function clearSessionAndRedirect() {
  writeSession(null);
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

async function refreshAccessToken() {
  const session = readSession();
  if (!session?.refreshToken) {
    throw new Error('No refresh token');
  }

  const res = await axios.post(
    `${api.defaults.baseURL}/auth/refresh`,
    { refreshToken: session.refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 15000 },
  );
  const data = res.data?.data ?? res.data;
  const next = {
    ...session,
    id: data.user?.id || session.id,
    name: data.user?.name || session.name,
    email: data.user?.email || session.email,
    role: data.user?.role || data.user?.roleName || session.role,
    token: data.accessToken,
    refreshToken: data.refreshToken,
  };
  writeSession(next);
  return next.token;
}

api.interceptors.request.use(
  (config) => {
    const auth = readSession();
    if (auth?.token && !String(auth.token).startsWith('mock-')) {
      config.headers.Authorization = `Bearer ${auth.token}`;
    }
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config || {};
    const url = String(original.url || '');
    const isAuthRoute =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh') ||
      url.includes('/auth/forgot') ||
      url.includes('/auth/reset');

    if (error.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        refreshPromise = refreshPromise || refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        refreshPromise = null;
        clearSessionAndRedirect();
      }
    }

    return Promise.reject(normalizeApiError(error));
  },
);

/**
 * Normalize axios / network errors into a consistent shape.
 */
export function normalizeApiError(error) {
  if (error && typeof error === 'object' && 'message' in error && 'status' in error && 'original' in error) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    const data = error.response?.data ?? null;
    const message =
      (data && typeof data === 'object' && data.error?.message) ||
      (data && typeof data === 'object' && 'message' in data && data.message) ||
      error.message ||
      'An unexpected error occurred';

    return {
      message: String(message),
      status,
      data,
      original: error,
    };
  }

  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    status: null,
    data: null,
    original: error,
  };
}

export { STORAGE_KEY, readSession, writeSession };
export default api;
