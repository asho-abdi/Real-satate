import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MdContentCopy,
  MdDeleteOutline,
  MdDownload,
  MdEdit,
  MdHistory,
  MdPictureAsPdf,
  MdPrint,
  MdRestore,
  MdVisibility,
  MdArchive,
} from 'react-icons/md';
import { downloadBlob, toCsv } from '../../utils/format.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import ActionMenu from './ActionMenu.jsx';
import BulkActionBar from './BulkActionBar.jsx';
import Button from './Button.jsx';
import CrudPage from './CrudPage.jsx';

/**
 * High-level entity list with actions, bulk ops, export, and confirmations.
 */
export default function EntityListPage({
  title,
  subtitle,
  breadcrumbs,
  rows,
  setRows,
  columns,
  searchKeys,
  filters = [],
  primaryAction,
  statusKey = 'status',
  statusOptions = [],
  getWorkflowActions,
  onView,
  onEdit,
  entityLabel = 'record',
  exportFileName = 'export',
  assignOptions = [],
  showArchive = true,
  showDuplicate = true,
  showRestore = true,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirm, setConfirm] = useState(null);

  const visibleRows = useMemo(
    () => rows.filter((row) => !row.archived || row._showArchived),
    [rows],
  );

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = (pageRows) => {
    const ids = pageRows.map((r) => r.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((prev) =>
      allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
    );
  };

  const updateRows = (updater) => {
    if (typeof setRows === 'function') setRows(updater);
  };

  const softDelete = (ids) => {
    updateRows((prev) =>
      prev.map((row) =>
        ids.includes(row.id)
          ? { ...row, deletedAt: new Date().toISOString(), archived: true, status: row.status }
          : row,
      ),
    );
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    toast.success(`${ids.length} ${entityLabel}(s) deleted`);
  };

  const restore = (ids) => {
    updateRows((prev) =>
      prev.map((row) =>
        ids.includes(row.id) ? { ...row, deletedAt: null, archived: false } : row,
      ),
    );
    toast.success(`${ids.length} ${entityLabel}(s) restored`);
  };

  const archive = (ids) => {
    updateRows((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, archived: true } : row)),
    );
    toast.success(`${ids.length} ${entityLabel}(s) archived`);
  };

  const duplicate = (row) => {
    const copy = {
      ...row,
      id: `${row.id}-copy-${Date.now()}`,
      code: row.code ? `${row.code}-COPY` : undefined,
      name: row.name ? `${row.name} (Copy)` : undefined,
      title: row.title ? `${row.title} (Copy)` : undefined,
      deletedAt: null,
      archived: false,
    };
    updateRows((prev) => [copy, ...prev]);
    toast.success('Duplicated');
  };

  const changeStatus = (ids, status) => {
    updateRows((prev) =>
      prev.map((row) => (ids.includes(row.id) ? { ...row, [statusKey]: status } : row)),
    );
    toast.success(`Status updated to ${status}`);
  };

  const exportExcel = (list) => {
    const csv = toCsv(list);
    downloadBlob(`${exportFileName}.csv`, csv, 'text/csv;charset=utf-8');
    toast.success('Excel/CSV exported');
  };

  const exportPdf = () => {
    window.print();
    toast.success('Print / PDF dialog opened');
  };

  const askConfirm = (payload) => setConfirm(payload);

  const runConfirm = () => {
    if (!confirm) return;
    confirm.action?.();
    setConfirm(null);
  };

  const buildActions = (row) => {
    const deleted = Boolean(row.deletedAt || row.archived);
    const workflow = getWorkflowActions?.(row, {
      changeStatus: (status) => changeStatus([row.id], status),
      askConfirm,
      updateRows,
      toast,
    }) || [];

    return [
      {
        key: 'view',
        label: 'View',
        icon: <MdVisibility />,
        onClick: () => (onView ? onView(row) : toast(`View ${entityLabel}`)),
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: <MdEdit />,
        hidden: deleted,
        onClick: () => (onEdit ? onEdit(row) : toast(`Edit ${entityLabel}`)),
      },
      ...workflow,
      {
        key: 'duplicate',
        label: 'Duplicate',
        icon: <MdContentCopy />,
        hidden: !showDuplicate || deleted,
        onClick: () => duplicate(row),
      },
      {
        key: 'print',
        label: 'Print',
        icon: <MdPrint />,
        onClick: () => {
          window.print();
          toast.success('Print dialog opened');
        },
      },
      {
        key: 'export-pdf',
        label: 'Export PDF',
        icon: <MdPictureAsPdf />,
        onClick: exportPdf,
      },
      {
        key: 'export-excel',
        label: 'Export Excel',
        icon: <MdDownload />,
        onClick: () => exportExcel([row]),
      },
      {
        key: 'history',
        label: 'Activity History',
        icon: <MdHistory />,
        onClick: () => toast('Activity history panel'),
      },
      {
        key: 'archive',
        label: 'Archive',
        icon: <MdArchive />,
        hidden: !showArchive || deleted,
        onClick: () =>
          askConfirm({
            title: 'Archive record?',
            message: `Archive this ${entityLabel}?`,
            confirmLabel: 'Archive',
            action: () => archive([row.id]),
          }),
      },
      {
        key: 'restore',
        label: 'Restore',
        icon: <MdRestore />,
        hidden: !showRestore || !deleted,
        onClick: () =>
          askConfirm({
            title: 'Restore record?',
            message: `Restore this ${entityLabel}?`,
            confirmLabel: 'Restore',
            action: () => restore([row.id]),
          }),
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <MdDeleteOutline />,
        danger: true,
        hidden: deleted,
        onClick: () =>
          askConfirm({
            title: 'Delete record?',
            message: `Soft-delete this ${entityLabel}? You can restore later.`,
            confirmLabel: 'Delete',
            danger: true,
            action: () => softDelete([row.id]),
          }),
      },
    ];
  };

  const tableColumns = [
    {
      key: '_select',
      label: (
        <input
          type="checkbox"
          aria-label="Select page"
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedIds(visibleRows.map((r) => r.id));
            } else {
              setSelectedIds([]);
            }
          }}
          checked={visibleRows.length > 0 && visibleRows.every((r) => selectedIds.includes(r.id))}
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.id}`}
          checked={selectedIds.includes(row.id)}
          onChange={() => toggleSelect(row.id)}
        />
      ),
    },
    ...columns,
    {
      key: '_actions',
      label: 'Actions',
      render: (row) => <ActionMenu items={buildActions(row)} />,
    },
  ];

  const applyBulk = (value) => {
    const ids = selectedIds;
    if (!ids.length) return;

    if (value === 'delete') {
      askConfirm({
        title: 'Delete selected?',
        message: `Soft-delete ${ids.length} ${entityLabel}(s)?`,
        confirmLabel: 'Delete',
        danger: true,
        action: () => softDelete(ids),
      });
      return;
    }
    if (value === 'archive') {
      askConfirm({
        title: 'Archive selected?',
        message: `Archive ${ids.length} ${entityLabel}(s)?`,
        confirmLabel: 'Archive',
        action: () => archive(ids),
      });
      return;
    }
    if (value === 'restore') {
      restore(ids);
      return;
    }
    if (value === 'export') {
      exportExcel(rows.filter((r) => ids.includes(r.id)));
      return;
    }
    if (value === 'print') {
      window.print();
      return;
    }
    if (value.startsWith('status:')) {
      const status = value.slice('status:'.length);
      askConfirm({
        title: 'Change status?',
        message: `Set ${ids.length} ${entityLabel}(s) to “${status}”?`,
        confirmLabel: 'Update',
        action: () => changeStatus(ids, status),
      });
      return;
    }
    if (value.startsWith('assign:')) {
      const user = value.slice('assign:'.length);
      updateRows((prev) =>
        prev.map((row) => (ids.includes(row.id) ? { ...row, assignee: user } : row)),
      );
      toast.success(`Assigned to ${user}`);
    }
  };

  const headerExtras = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => exportExcel(visibleRows)}
      >
        Export Excel
      </Button>
      <Button variant="secondary" size="sm" onClick={exportPdf}>
        Export PDF
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        Print
      </Button>
      {primaryAction ? (
        <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
      ) : null}
    </div>
  );

  return (
    <>
      <CrudPage
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        rows={visibleRows.filter((r) => !r.deletedAt)}
        searchKeys={searchKeys}
        filters={filters}
        columns={tableColumns}
        primaryAction={null}
        headerActions={headerExtras}
        toolbar={
          <BulkActionBar
            selectedCount={selectedIds.length}
            onClear={() => setSelectedIds([])}
            onApply={applyBulk}
            statusOptions={statusOptions}
            assignOptions={assignOptions}
          />
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
      />
    </>
  );
}
