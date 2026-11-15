import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { settingsService } from '../services/settingsService.js';
import { APP_NAME } from '../utils/constants.js';
import {
  DEFAULT_USD_KES_RATE,
  setAppCurrency,
  setAppName,
  setUsdKesRate,
} from '../utils/format.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    companyName: APP_NAME,
    currency: 'KES',
    usdKesRate: DEFAULT_USD_KES_RATE,
    nightsNote: 'Guest stays are billed as nights × (monthly rent ÷ 30).',
  });
  const [loading, setLoading] = useState(false);

  const applySettings = useCallback((map = {}) => {
    const rateRaw = map['currency.usdKesRate'];
    const rate = Number(rateRaw);
    const next = {
      companyName: map['app.name'] || APP_NAME,
      currency: 'KES',
      usdKesRate: Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_KES_RATE,
      nightsNote:
        map['billing.nightsNote'] ||
        'Guest stays are billed as nights × (monthly rent ÷ 30).',
    };
    setSettings(next);
    setAppName(next.companyName);
    setAppCurrency(next.currency);
    setUsdKesRate(next.usdKesRate);
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
    const rate = Number(nextSettings.usdKesRate);
    const safeRate = Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_KES_RATE;
    await Promise.all([
      settingsService.updateSetting('app.name', nextSettings.companyName),
      settingsService.updateSetting('currency', 'KES'),
      settingsService.updateSetting('currency.usdKesRate', String(safeRate)),
      settingsService.updateSetting('billing.nightsNote', nextSettings.nightsNote),
    ]);
    applySettings({
      'app.name': nextSettings.companyName,
      currency: 'KES',
      'currency.usdKesRate': String(safeRate),
      'billing.nightsNote': nextSettings.nightsNote,
    });
  };

  const value = useMemo(
    () => ({
      settings,
      loading,
      saveSettings,
      currency: settings.currency,
      usdKesRate: settings.usdKesRate,
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
