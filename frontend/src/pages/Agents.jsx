import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockAgents } from '../services/mockData.js';

export default function Agents() {
  return (
    <CrudPage
      title="Agents"
      subtitle="Broker and leasing specialist roster."
      breadcrumbs={[{ label: 'People' }, { label: 'Agents' }]}
      rows={mockAgents}
      searchKeys={['name', 'email', 'phone', 'specialization', 'city']}
      filters={[{ key: 'status', label: 'status', options: ['Active', 'Inactive'] }]}
      primaryAction={{ label: 'Add agent', onClick: () => toast('Agent form coming soon') }}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'specialization', label: 'Specialization' },
        { key: 'city', label: 'City' },
        { key: 'dealsClosed', label: 'Deals' },
        { key: 'rating', label: 'Rating' },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <Badge status={row.status}>{row.status}</Badge>,
        },
      ]}
    />
  );
}
