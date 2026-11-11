import { Navigate } from 'react-router-dom';

/** @deprecated Use /commercial-spaces — kept for bookmarks. */
export default function Shops() {
  return <Navigate to="/commercial-spaces?type=SHOP" replace />;
}
