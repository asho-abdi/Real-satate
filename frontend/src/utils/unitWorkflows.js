/**
 * Status-based workflow actions for property units.
 */
export function getUnitWorkflowActions(row, { changeStatus, askConfirm, updateRows, toast }) {
  const actions = [];
  const s = row.status;

  if (s !== 'Available') {
    actions.push({
      key: 'mark-available',
      label: 'Mark Available',
      onClick: () =>
        askConfirm({
          title: 'Mark available?',
          message: `Set ${row.code} to Available?`,
          confirmLabel: 'Mark Available',
          action: () => changeStatus('Available'),
        }),
    });
  }
  if (s === 'Available') {
    actions.push({
      key: 'reserve',
      label: 'Reserve',
      onClick: () => changeStatus('Reserved'),
    });
  }
  if (s === 'Reserved') {
    actions.push({
      key: 'release',
      label: 'Release Reservation',
      onClick: () =>
        askConfirm({
          title: 'Release reservation?',
          message: `Release reservation on ${row.code}?`,
          confirmLabel: 'Release',
          action: () => changeStatus('Available'),
        }),
    });
  }
  if (s === 'Available' || s === 'Reserved') {
    actions.push({
      key: 'occupy',
      label: 'Mark Occupied',
      onClick: () => changeStatus('Occupied'),
    });
  }
  if (s === 'Occupied') {
    actions.push({
      key: 'move-out',
      label: 'Move Out',
      onClick: () =>
        askConfirm({
          title: 'Move out?',
          message: `Mark ${row.code} as Available after move-out?`,
          confirmLabel: 'Move Out',
          action: () => changeStatus('Available'),
        }),
    });
  }
  if (s !== 'Maintenance') {
    actions.push({
      key: 'maintenance',
      label: 'Put Under Maintenance',
      onClick: () =>
        askConfirm({
          title: 'Put under maintenance?',
          message: `Set ${row.code} to Maintenance?`,
          confirmLabel: 'Confirm',
          action: () => changeStatus('Maintenance'),
        }),
    });
  }
  if (s === 'Maintenance') {
    actions.push({
      key: 'complete-maint',
      label: 'Complete Maintenance',
      onClick: () => changeStatus('Available'),
    });
  }

  if (row.occupancyMode === 'Airbnb' || row.cleaningStatus) {
    if (row.cleaningStatus !== 'Clean') {
      actions.push({
        key: 'mark-clean',
        label: 'Mark Clean',
        onClick: () => {
          updateRows((prev) =>
            prev.map((u) => (u.id === row.id ? { ...u, cleaningStatus: 'Clean' } : u)),
          );
          toast.success(`${row.code} marked clean`);
        },
      });
    }
    if (row.cleaningStatus !== 'In Progress') {
      actions.push({
        key: 'assign-cleaner',
        label: 'Assign Cleaner',
        onClick: () => {
          updateRows((prev) =>
            prev.map((u) =>
              u.id === row.id
                ? { ...u, cleaningStatus: 'In Progress', assignee: 'Cleaning Team' }
                : u,
            ),
          );
          toast.success(`Cleaner assigned to ${row.code}`);
        },
      });
    }
  }

  return actions;
}

export const UNIT_STATUS_OPTIONS = ['Available', 'Reserved', 'Occupied', 'Maintenance'];
export const ASSIGN_OPTIONS = ['Admin User', 'Property Manager', 'Ops Lead'];
