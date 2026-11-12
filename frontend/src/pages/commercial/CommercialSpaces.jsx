import { useSearchParams } from 'react-router-dom';
import CommercialRentals from '../shops/CommercialRentals.jsx';

/** Single Commercial Spaces management page (Shop + Office). */
export default function CommercialSpaces() {
  const [params] = useSearchParams();
  const raw = String(params.get('type') || 'ALL').toUpperCase();
  const initialFilter = raw === 'SHOP' || raw === 'OFFICE' ? raw : 'ALL';
  return <CommercialRentals key={initialFilter} initialFilter={initialFilter} />;
}
