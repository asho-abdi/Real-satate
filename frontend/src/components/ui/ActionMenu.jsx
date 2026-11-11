import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdMoreVert } from 'react-icons/md';
import { cn } from '../../utils/format.js';

/**
 * Three-dot action dropdown for table rows.
 * @param {{ items: Array<{ key: string, label: string, icon?: React.ReactNode, onClick: () => void, danger?: boolean, hidden?: boolean, disabled?: boolean }>, align?: 'left'|'right' }} props
 */
export default function ActionMenu({ items = [], align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return undefined;

    const onDoc = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        buttonRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!visible.length) return null;

  const toggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const width = 220;
      const left =
        align === 'right'
          ? Math.min(rect.right - width, window.innerWidth - width - 8)
          : Math.max(8, rect.left);
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(8, left),
      });
    }
    setOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[var(--text-muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]', open ? 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)]' : 'border-transparent')}
      >
        <MdMoreVert className="text-lg" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="animate-fade-in fixed z-[80] w-[220px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-pop)]"
            >
              {visible.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                    item.danger ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10' : 'text-[var(--text)] hover:bg-[var(--surface-2)]',
                  )}
                >
                  {item.icon ? <span className="text-base opacity-70">{item.icon}</span> : null}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
