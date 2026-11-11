import { createContext, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const LayoutContext = createContext(null);

export const NAV_LAYOUTS = [
  { value: 'sidebar', label: 'Sidebar' },
  { value: 'topbar', label: 'Topbar' },
];

export function LayoutProvider({ children }) {
  // Sidebar is the default chrome for the property-management UI.
  const [navLayout, setNavLayout] = useLocalStorage('rjk-nav-layout-v3', 'sidebar');
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage('rjk-sidebar-collapsed', false);

  const value = useMemo(
    () => ({
      navLayout: navLayout === 'sidebar' ? 'sidebar' : 'topbar',
      setNavLayout: (next) => setNavLayout(next === 'sidebar' ? 'sidebar' : 'topbar'),
      isSidebar: navLayout === 'sidebar',
      isTopbar: navLayout !== 'sidebar',
      sidebarCollapsed: Boolean(sidebarCollapsed),
      setSidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed(!sidebarCollapsed),
    }),
    [navLayout, setNavLayout, sidebarCollapsed, setSidebarCollapsed],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error('useLayout must be used within LayoutProvider');
  return ctx;
}
