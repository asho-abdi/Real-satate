import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/format.js';
import { openIdentityDocument } from '../../services/rentalApi.js';

/**
 * File picker for ID / passport / license attachments.
 * Controlled via `value` ({ identityDocument, identityDocumentName }) and
 * `file` (pending File before upload).
 */
export default function IdentityDocumentField({
  label = 'Identity document',
  hint = 'PDF or image of ID / passport / license',
  value = null,
  file = null,
  onFileChange,
  onClear,
  readOnly = false,
  className,
}) {
  const inputRef = useRef(null);
  const [opening, setOpening] = useState(false);

  const displayName = file?.name || value?.identityDocumentName || value?.identityDocument || '';
  const canView = Boolean(value?.identityDocument) && !file;

  const onPick = (e) => {
    const next = e.target.files?.[0] || null;
    onFileChange?.(next);
    e.target.value = '';
  };

  const onView = async () => {
    if (!value?.identityDocument) return;
    setOpening(true);
    try {
      await openIdentityDocument(value.identityDocument, value.identityDocumentName);
    } catch (err) {
      toast.error(err.message || 'Could not open document');
    } finally {
      setOpening(false);
    }
  };

  if (readOnly) {
    if (!displayName && !canView) {
      return (
        <div className={cn(className)}>
          {label ? <span className="block text-sm text-[var(--text-muted)]">{label}: —</span> : null}
        </div>
      );
    }
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        {label ? <span className="text-sm text-[var(--text-muted)]">{label}</span> : null}
        <span className="max-w-[12rem] truncate text-sm font-medium text-[var(--text)]" title={displayName}>
          {displayName}
        </span>
        {canView ? (
          <button
            type="button"
            onClick={onView}
            disabled={opening}
            className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {opening ? 'Opening…' : 'View'}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? <span className="block text-sm font-medium text-[var(--text)]">{label}</span> : null}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition hover:bg-[var(--surface-2)]"
        >
          {displayName ? 'Replace file' : 'Choose file'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={onPick}
        />
        {displayName ? (
          <span className="max-w-[14rem] truncate text-sm text-[var(--text-muted)]" title={displayName}>
            {displayName}
          </span>
        ) : null}
        {canView ? (
          <button
            type="button"
            onClick={onView}
            disabled={opening}
            className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            {opening ? 'Opening…' : 'View'}
          </button>
        ) : null}
        {displayName && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="text-sm text-[var(--text-muted)] hover:text-rose-600"
          >
            Remove
          </button>
        ) : null}
      </div>
      {hint ? <span className="block text-xs text-[var(--text-muted)]">{hint}</span> : null}
    </div>
  );
}
