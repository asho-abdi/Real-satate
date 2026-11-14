import { MdHelpOutline, MdWarningAmber } from 'react-icons/md';
import Modal from './Modal.jsx';
import Button from './Button.jsx';
import { cn } from '../../utils/format.js';

/**
 * Confirmation dialog for destructive / important actions.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
}) {
  const Icon = danger ? MdWarningAmber : MdHelpOutline;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            danger
              ? 'bg-rose-50 text-rose-600 ring-4 ring-rose-50/60 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/10'
              : 'bg-[var(--gold-soft)] text-[var(--accent)] ring-4 ring-[var(--gold-soft)]/60',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="pt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{message}</div>
      </div>
    </Modal>
  );
}
