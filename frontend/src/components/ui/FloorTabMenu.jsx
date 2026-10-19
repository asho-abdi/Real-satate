import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdDeleteOutline, MdEdit, MdMoreVert } from 'react-icons/md';
import { cn } from '../../utils/format.js';

/**
 * Three-dot action menu for floor navigation tabs.
 * Renders the dropdown in a portal so it is not clipped by horizontal scroll containers.
 */
export default function FloorTabMenu({
  floor,
  isSelected = false,
  isOpen = false,
  onOpenChange,
  onEdit,
  onDelete,
}) {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!isOpen) return undefined;

    const onDoc = (event) => {
      if (
        menuRef.current?.contains(event.target) ||
        buttonRef.current?.contains(event.target)
      ) {
        return;
      }
      onOpenChange?.(false);
    };

    const onKey = (event) => {
      if (event.key === 'Escape') onOpenChange?.(false);
    };

    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onOpenChange]);

  const toggle = (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 6, left: rect.left });
    }
    onOpenChange?.(!isOpen);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${floor.name}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={toggle}
        className={cn(
          'flex w-8 shrink-0 items-center justify-center border-l transition-all duration-150',
          'text-[#172033] hover:bg-black/10',
          isSelected ? 'border-white/25' : 'border-[#E2E8F0]',
        )}
      >
        <MdMoreVert className="h-4 w-4 text-[#172033]" />
      </button>

      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: coords.top, left: coords.left }}
              className="fixed z-[80] min-w-[10.75rem] animate-fade-in overflow-hidden rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenChange?.(false);
                  onEdit?.();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#172033] transition hover:bg-[#F5F7FA]"
              >
                <MdEdit className="h-4 w-4 text-[#F05A28]" />
                Edit Floor
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onOpenChange?.(false);
                  onDelete?.();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#EF4444] transition hover:bg-rose-50"
              >
                <MdDeleteOutline className="h-4 w-4" />
                Delete Floor
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
