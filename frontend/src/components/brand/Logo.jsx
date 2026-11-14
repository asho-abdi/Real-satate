import { cn } from '../../utils/format.js';

const SOURCES = {
  full: { dark: '/brand/rjk-logo.png', light: '/brand/rjk-logo-light.png', ratio: 720 / 410 },
  mark: { dark: '/brand/rjk-mark.png', light: '/brand/rjk-mark-light.png', ratio: 256 / 172 },
};

/**
 * RJK Realty logo, rendered from the official artwork.
 * - variant: 'full' (mark + wordmark + tagline) | 'mark' (house + tower only)
 * - tone: 'auto' follows the app theme, 'onDark' forces the light-ink version
 *   for navy surfaces, 'onLight' forces the original colours.
 */
export default function Logo({ variant = 'full', tone = 'auto', className, alt = 'RJK Realty' }) {
  const src = SOURCES[variant] || SOURCES.full;

  if (tone === 'onDark') {
    return <img src={src.light} alt={alt} className={cn('select-none', className)} draggable="false" />;
  }
  if (tone === 'onLight') {
    return <img src={src.dark} alt={alt} className={cn('select-none', className)} draggable="false" />;
  }

  return (
    <>
      <img src={src.dark} alt={alt} className={cn('select-none dark:hidden', className)} draggable="false" />
      <img src={src.light} alt={alt} className={cn('hidden select-none dark:block', className)} draggable="false" />
    </>
  );
}

/** Wordmark rendered as type so it stays crisp at small sizes (sidebar, topbar). */
export function Wordmark({ className, onDark = false }) {
  return (
    <span className={cn('font-display font-extrabold leading-none tracking-[-0.02em]', className)}>
      <span className={onDark ? 'text-white' : 'text-[var(--navy)] dark:text-white'}>RJK</span>{' '}
      <span className="text-[var(--gold)]">REALTY</span>
    </span>
  );
}
