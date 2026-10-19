import SectionHeader from '../../components/realty/SectionHeader.jsx';
import { AboutSection } from './sections.jsx';
import { useCatalog } from './useCatalog.js';

export default function AboutPage() {
  const { data, error } = useCatalog();
  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 pt-12 md:px-6">
        <SectionHeader
          eyebrow="About"
          title="Houdo Souk"
          text="One building in Nairobi. Guest stays lead the way, with apartments and shops in the same address."
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
      <AboutSection data={data} />
    </div>
  );
}
