import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockExpenses } from '../services/mockData.js';
import { formatCurrency, formatDate } from '../utils/format.js';

export default function Expenses() {
  return (
    <CrudPage
      title="Expenses"
      subtitle="Maintenance, insurance, and operating costs."
      breadcrumbs={[{ label: 'Operations' }, { label: 'Expenses' }]}
      rows={mockExpenses}
      searchKeys={['code', 'property', 'category', 'vendor', 'status', 'description']}
      filters={[
        { key: 'status', label: 'status', options: [...new Set(mockExpenses.map((e) => e.status))] },
        { key: 'category', label: 'category', options: [...new Set(mockExpenses.map((e) => e.category))] },
      ]}
      primaryAction={{ label: 'Add expense', onClick: () => toast('Expense form coming soon') }}
      columns={[
        { key: 'code', label: 'Code' },
        { key: 'property', label: 'Property' },
        { key: 'category', label: 'Category' },
        { key: 'vendor', label: 'Vendor' },
        {
          key: 'amount',
          label: 'Amount',
          render: (row) => formatCurrency(row.amount),
        },
        {
          key: 'date',
          label: 'Date',
          render: (row) => formatDate(row.date || row.createdAt),
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
