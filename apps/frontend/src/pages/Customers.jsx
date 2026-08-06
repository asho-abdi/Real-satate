import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockCustomers } from '../services/mockData.js';
import { formatCurrency } from '../utils/format.js';

export default function Customers() {
  return (
    <CrudPage
      title="Customers"
      subtitle="Buyers, tenants, and corporate clients."
      breadcrumbs={[{ label: 'People' }, { label: 'Customers' }]}
      rows={mockCustomers}
      searchKeys={['name', 'email', 'phone', 'type', 'city']}
      filters={[
        { key: 'status', label: 'status', options: ['Active', 'Inactive'] },
        { key: 'type', label: 'type', options: ['Buyer', 'Tenant', 'Investor', 'Corporate Tenant'] },
      ]}
      primaryAction={{ label: 'Add customer', onClick: () => toast('Customer form coming soon') }}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'type', label: 'Type' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        {
          key: 'budget',
          label: 'Budget',
          render: (row) => formatCurrency(row.budget),
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
