import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { settingsService } from '../services/settingsService.js';
import { APP_NAME } from '../utils/constants.js';
import { setAppCurrency, setAppName } from '../utils/format.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    companyName: APP_NAME,
    currency: 'USD',
    nightsNote: 'Guest stays are billed as nights × (monthly rent ÷ 30).',
  });
  const [loading, setLoading] = useState(false);

  const applySettings = useCallback((map = {}) => {
    const next = {
      companyName: map['app.name'] || APP_NAME,
      currency: map.currency || 'USD',
      nightsNote:
        map['billing.nightsNote'] ||
        'Guest stays are billed as nights × (monthly rent ÷ 30).',
    };
    setSettings(next);
    setAppName(next.companyName);
    setAppCurrency(next.currency);
    return next;
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    let cancelled = false;
    setLoading(true);

    settingsService
      .fetchSettings()
      .then((map) => {
        if (!cancelled) applySettings(map);
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, applySettings]);

  const saveSettings = async (nextSettings) => {
    await Promise.all([
      settingsService.updateSetting('app.name', nextSettings.companyName),
      settingsService.updateSetting('currency', nextSettings.currency),
      settingsService.updateSetting('billing.nightsNote', nextSettings.nightsNote),
    ]);
    applySettings({
      'app.name': nextSettings.companyName,
      currency: nextSettings.currency,
      'billing.nightsNote': nextSettings.nightsNote,
    });
  };

  const value = useMemo(
    () => ({
      settings,
      loading,
      saveSettings,
      currency: settings.currency,
      companyName: settings.companyName,
    }),
    [settings, loading],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
