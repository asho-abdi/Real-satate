import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import TopNavbar from '../components/layout/TopNavbar.jsx';

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Sidebar open={false} onClose={() => {}} isMobile={false} />
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} isMobile />

      <div className="lg:pl-[260px]">
        <TopNavbar
          onMenuClick={() => setMobileOpen(true)}
          search={search}
          onSearchChange={setSearch}
        />
        <main className="px-4 py-5 md:px-5 md:py-6">
          <Outlet context={{ globalSearch: search }} />
        </main>
      </div>
    </div>
  );
}
