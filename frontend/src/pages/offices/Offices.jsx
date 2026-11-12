import { Navigate } from 'react-router-dom';

/** @deprecated Use /commercial-spaces — kept for bookmarks. */
export default function Offices() {
  return <Navigate to="/commercial-spaces?type=OFFICE" replace />;
}
