import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockContracts } from '../services/mockData.js';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function Contracts() {
  return (
    <CrudPage
      title="Contracts"
      subtitle="Leases, sales, and active agreements."
      breadcrumbs={[{ label: 'Operations' }, { label: 'Contracts' }]}
      rows={mockContracts}
      searchKeys={['code', 'property', 'customer', 'type', 'status']}
      filters={[
        { key: 'status', label: 'status', options: ['Active', 'Pending', 'Closed', 'Draft'] },
        { key: 'type', label: 'type', options: [...new Set(mockContracts.map((c) => c.type))] },
      ]}
      primaryAction={{ label: 'New contract', onClick: () => toast('Contract form coming soon') }}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'property', label: 'Property' },
        { key: 'customer', label: 'Customer' },
        { key: 'type', label: 'Type' },
        {
          key: 'value',
          label: 'Value',
          render: (row) => formatCurrency(row.value),
        },
        {
          key: 'endDate',
          label: 'Ends',
          render: (row) => formatDate(row.endDate),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <Badge status={row.status}>{row.status}</Badge>,
        },
      ]}
    />
  );
}
