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
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]"
      >
        <MdMoreVert className="text-lg" />
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] w-[220px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-2xl"
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
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--surface-2)] disabled:cursor-not-allowed disabled:opacity-50',
                    item.danger ? 'text-rose-600 dark:text-rose-400' : 'text-[var(--text)]',
                  )}
                >
                  {item.icon ? <span className="text-base opacity-80">{item.icon}</span> : null}
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
