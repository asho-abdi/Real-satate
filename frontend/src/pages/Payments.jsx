import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockPayments } from '../services/mockData.js';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function Payments() {
  return (
    <CrudPage
      title="Payments"
      subtitle="Incoming rent, deposits, and sale proceeds."
      breadcrumbs={[{ label: 'Operations' }, { label: 'Payments' }]}
      rows={mockPayments}
      searchKeys={['code', 'property', 'customer', 'status', 'method', 'description']}
      filters={[
        { key: 'status', label: 'status', options: ['Paid', 'Pending', 'Overdue'] },
        { key: 'method', label: 'method', options: [...new Set(mockPayments.map((p) => p.method).filter(Boolean))] },
      ]}
      primaryAction={{ label: 'Record payment', onClick: () => toast('Payment form coming soon') }}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'property', label: 'Property' },
        { key: 'customer', label: 'Customer' },
        {
          key: 'amount',
          label: 'Amount',
          render: (row) => formatCurrency(row.amount),
        },
        {
          key: 'dueDate',
          label: 'Due',
          render: (row) => formatDate(row.dueDate || row.date),
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
