import { Link } from 'react-router-dom';
import { mediaUrl } from '../../services/publicApi.js';

export default function CategoryCard({ title, description, count, image, to, featured = false }) {
  return (
    <Link
      to={to}
      className="group relative block h-full overflow-hidden rounded-[1.75rem] bg-[var(--primary-dark)] shadow-[var(--shadow)]"
    >
      <div className={featured ? 'h-72 md:h-[28rem]' : 'aspect-[4/5] sm:aspect-[5/6]'}>
        {image ? (
          <img src={mediaUrl(image)} alt="" className="img-zoom h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)]" />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#161332]/85 via-[#161332]/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="text-xs font-medium text-white/75">{count}</p>
        <h3 className="page-title mt-1 text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-white/80">{description}</p>
      </div>
    </Link>
  );
}
