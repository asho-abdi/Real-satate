import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockLeads } from '../services/mockData.js';

export default function Leads() {
  return (
    <CrudPage
      title="Leads"
      subtitle="Inbound interest and pipeline stages."
      breadcrumbs={[{ label: 'People' }, { label: 'Leads' }]}
      rows={mockLeads}
      searchKeys={['name', 'email', 'phone', 'source', 'status', 'interest', 'city']}
      filters={[
        { key: 'status', label: 'status', options: ['New', 'Qualified', 'Pending', 'Inactive'] },
        { key: 'source', label: 'source', options: [...new Set(mockLeads.map((l) => l.source))] },
      ]}
      primaryAction={{ label: 'Add lead', onClick: () => toast('Lead form coming soon') }}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'interest', label: 'Interest' },
        { key: 'source', label: 'Source' },
        { key: 'city', label: 'City' },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <Badge status={row.status}>{row.status}</Badge>,
        },
      ]}
    />
  );
}
