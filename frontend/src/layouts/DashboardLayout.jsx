import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import TopNavbar from '../components/layout/TopNavbar.jsx';
import { useLayout } from '../context/LayoutContext.jsx';

export default function DashboardLayout() {
  const { isSidebar } = useLayout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {isSidebar ? (
        <Sidebar open onClose={() => {}} isMobile={false} />
      ) : null}

      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} isMobile />

      <div className={isSidebar ? 'lg:pl-[272px]' : undefined}>
        <TopNavbar
          onMenuClick={() => setMobileOpen(true)}
          search={search}
          onSearchChange={setSearch}
        />
        <main className="px-4 py-5 md:px-6 md:py-6 lg:px-7">
          <Outlet context={{ globalSearch: search }} />
        </main>
      </div>
    </div>
  );
}
