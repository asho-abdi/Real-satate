import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  timeout: 20000,
});

function unwrap(response) {
  const body = response?.data;
  if (body && typeof body === 'object' && 'data' in body) return body.data;
  return body;
}

async function get(path, params) {
  try {
    return unwrap(await client.get(path, { params }));
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'Could not load properties';
    throw new Error(message);
  }
}

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  const origin = String(client.defaults.baseURL || '').replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getCatalog() {
  return get('/public/catalog');
}

export function getPublicProperty(id) {
  return get(`/public/catalog/${id}`);
}
