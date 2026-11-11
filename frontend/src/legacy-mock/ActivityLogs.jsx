import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../components/ui/EntityListPage.jsx';
import { remActivityLogs } from '../services/remsData.js';
import { formatDate } from '../utils/format.js';

export default function ActivityLogs() {
  const [rows, setRows] = useState(
    remActivityLogs.map((l) => ({
      ...l,
      status: 'Logged',
      module: l.entity || l.module,
    })),
  );

  return (
    <EntityListPage
      title="Activity Logs"
      subtitle="Audit trail of system actions."
      breadcrumbs={[{ label: 'Operations' }, { label: 'Activity Logs' }]}
      rows={rows}
      setRows={setRows}
      entityLabel="log"
      exportFileName="activity-logs"
      statusOptions={['Logged']}
      statusKey="status"
      searchKeys={['action', 'module', 'entity', 'user', 'details']}
      filters={[
        {
          key: 'module',
          label: 'module',
          options: [...new Set(rows.map((l) => l.module).filter(Boolean))],
        },
        {
          key: 'action',
          label: 'action',
          options: [...new Set(rows.map((l) => l.action))],
        },
      ]}
      showArchive={false}
      showDuplicate={false}
      showRestore={false}
      onView={(row) => toast(row.details || row.action)}
      getWorkflowActions={(row, { toast: t }) => [
        {
          key: 'export-row',
          label: 'Export Entry',
          onClick: () => t.success(`Exported ${row.action}`),
        },
      ]}
      columns={[
        { key: 'action', label: 'Action' },
        { key: 'module', label: 'Module' },
        { key: 'user', label: 'User' },
        { key: 'details', label: 'Details' },
        {
          key: 'createdAt',
          label: 'When',
          render: (row) => formatDate(row.createdAt),
        },
      ]}
    />
  );
}
