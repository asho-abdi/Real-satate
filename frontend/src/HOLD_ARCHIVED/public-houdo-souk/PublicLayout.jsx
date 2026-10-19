import { Outlet } from 'react-router-dom';
import { PublicFooter, PublicHeader } from '../components/layout/PublicChrome.jsx';

export default function PublicLayout() {
  return (
    <div className="public-site min-h-screen bg-[#f5f7fb] text-[#1c2434]">
      <PublicHeader />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
