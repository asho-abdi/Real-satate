import { useSearchParams } from 'react-router-dom';
import { ContactSection } from './sections.jsx';
import { useCatalog } from './useCatalog.js';

export default function ContactPage() {
  const [params] = useSearchParams();
  const { data } = useCatalog();
  return (
    <div className="pt-6">
      <ContactSection buildings={data?.buildings || []} preset={params.get('property') || ''} />
    </div>
  );
}
