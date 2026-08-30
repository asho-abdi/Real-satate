import Button from './Button.jsx';

/**
 * Standard form footer actions.
 */
export default function FormActionBar({
  onSave,
  onSaveDraft,
  onSaveAndNew,
  onSaveAndClose,
  onReset,
  onCancel,
  saving = false,
  showDraft = true,
  showSaveAndNew = true,
  showSaveAndClose = true,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {onReset ? (
          <Button type="button" variant="ghost" onClick={onReset} disabled={saving}>
            Reset
          </Button>
        ) : null}
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {showDraft && onSaveDraft ? (
          <Button type="button" variant="secondary" onClick={onSaveDraft} disabled={saving}>
            Save Draft
          </Button>
        ) : null}
        {showSaveAndNew && onSaveAndNew ? (
          <Button type="button" variant="secondary" onClick={onSaveAndNew} disabled={saving}>
            Save & New
          </Button>
        ) : null}
        {showSaveAndClose && onSaveAndClose ? (
          <Button type="button" variant="secondary" onClick={onSaveAndClose} disabled={saving}>
            Save & Close
          </Button>
        ) : null}
        {onSave ? (
          <Button type="button" loading={saving} onClick={onSave}>
            Save
          </Button>
        ) : null}
      </div>
    </div>
  );
}
