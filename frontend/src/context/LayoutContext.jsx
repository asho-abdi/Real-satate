import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const LayoutContext = createContext(null);

export const NAV_LAYOUTS = [
  { value: 'topbar', label: 'Topbar' },
  { value: 'sidebar', label: 'Sidebar' },
];

export function LayoutProvider({ children }) {
  // Topbar is the default; Sidebar is the alternate option.
  const [navLayout, setNavLayout] = useLocalStorage('rjk-nav-layout-v2', 'topbar');

  const value = useMemo(
    () => ({
      navLayout: navLayout === 'sidebar' ? 'sidebar' : 'topbar',
      setNavLayout: (next) => setNavLayout(next === 'sidebar' ? 'sidebar' : 'topbar'),
      isSidebar: navLayout === 'sidebar',
      isTopbar: navLayout !== 'sidebar',
    }),
    [navLayout, setNavLayout],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
