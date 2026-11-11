import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar.jsx';
import TopNavbar from '../components/layout/TopNavbar.jsx';
import { PageLoader } from '../components/brand/BrandLoader.jsx';
import { useLayout } from '../context/LayoutContext.jsx';

export default function DashboardLayout() {
  const { isSidebar, sidebarCollapsed } = useLayout();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Close the mobile drawer and reset scroll on navigation
  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const offset = isSidebar
    ? sidebarCollapsed
      ? 'lg:pl-[var(--sidebar-w-collapsed)]'
      : 'lg:pl-[var(--sidebar-w)]'
    : undefined;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {isSidebar ? <Sidebar open onClose={() => {}} isMobile={false} /> : null}

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} isMobile />

      <div className={`app-shell-content transition-[padding] duration-200 ease-out ${offset || ''}`}>
        <TopNavbar onMenuClick={() => setMobileOpen(true)} search={search} onSearchChange={setSearch} />
        <main className="app-main mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-5 md:py-7 lg:px-8">
          <Suspense fallback={<PageLoader />}>
            {/* Opacity-only transition: no transform, so fixed-position modals inside pages stay anchored to the viewport */}
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Outlet context={{ globalSearch: search }} />
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
