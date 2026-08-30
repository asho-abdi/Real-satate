import { Link } from 'react-router-dom';
import {
  MdDeleteOutline,
  MdDownload,
  MdEdit,
  MdHistory,
  MdNote,
  MdAttachFile,
  MdPrint,
  MdShare,
} from 'react-icons/md';
import PageHeader from './PageHeader.jsx';
import Button from './Button.jsx';
import Card from './Card.jsx';
import Badge from './Badge.jsx';
import toast from 'react-hot-toast';

/**
 * Shared details page chrome with standard actions.
 */
export default function DetailPageShell({
  title,
  subtitle,
  breadcrumbs,
  status,
  children,
  onEdit,
  onDelete,
  backTo,
}) {
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={
          <div className="flex flex-wrap gap-2">
            {backTo ? (
              <Link to={backTo}>
                <Button variant="secondary">Back</Button>
              </Link>
            ) : null}
            <Button variant="secondary" onClick={() => toast.success('Shared link copied')}>
              <MdShare /> Share
            </Button>
            <Button variant="secondary" onClick={() => window.print()}>
              <MdPrint /> Print
            </Button>
            <Button variant="secondary" onClick={() => toast.success('Download started')}>
              <MdDownload /> Download
            </Button>
            {onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                <MdEdit /> Edit
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="danger" onClick={onDelete}>
                <MdDeleteOutline /> Delete
              </Button>
            ) : null}
          </div>
        }
      />

      {status ? (
        <div className="mb-4">
          <Badge status={status}>{status}</Badge>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">{children}</div>
        <div className="space-y-4">
          <Card title="Notes">
            <textarea
              className="min-h-28 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm"
              placeholder="Add internal notes…"
              defaultValue=""
            />
            <Button
              className="mt-3"
              size="sm"
              variant="secondary"
              onClick={() => toast.success('Note saved')}
            >
              <MdNote /> Save note
            </Button>
          </Card>
          <Card title="Attachments">
            <input
              type="file"
              multiple
              className="block w-full text-sm text-[var(--text-muted)]"
              onChange={() => toast.success('Attachment uploaded')}
            />
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              <MdAttachFile className="mr-1 inline" />
              PDF, images, and office docs supported
            </p>
          </Card>
          <Card title="Activity History">
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li className="flex items-start gap-2">
                <MdHistory className="mt-0.5" /> Record created
              </li>
              <li className="flex items-start gap-2">
                <MdHistory className="mt-0.5" /> Status updated
              </li>
              <li className="flex items-start gap-2">
                <MdHistory className="mt-0.5" /> Document attached
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
