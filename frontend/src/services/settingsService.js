import api, { normalizeApiError } from './api.js';

export async function fetchSettings() {
  try {
    const res = await api.get('/settings');
    return res.data?.data ?? res.data ?? {};
  } catch (error) {
    throw new Error(normalizeApiError(error).message || 'Could not load settings');
  }
}

export async function updateSetting(key, value) {
  try {
    const res = await api.put(`/settings/${encodeURIComponent(key)}`, { value });
    return res.data?.data ?? res.data;
  } catch (error) {
    throw new Error(normalizeApiError(error).message || 'Could not save setting');
  }
}

export const settingsService = {
  fetchSettings,
  updateSetting,
};

export default settingsService;
