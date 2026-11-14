import { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes.jsx';
import { hideBootSplash } from './components/brand/BrandLoader.jsx';

export default function App() {
  useEffect(() => {
    hideBootSplash();
  }, []);

  return <AppRoutes />;
}
