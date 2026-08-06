import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockOwners } from '../services/mockData.js';

export default function Owners() {
  return (
    <CrudPage
      title="Owners"
      subtitle="Asset owners and landlord contacts."
      breadcrumbs={[{ label: 'People' }, { label: 'Owners' }]}
      rows={mockOwners}
      searchKeys={['name', 'email', 'phone', 'company', 'city']}
      filters={[{ key: 'status', label: 'status', options: ['Active', 'Inactive'] }]}
      primaryAction={{ label: 'Add owner', onClick: () => toast('Owner form coming soon') }}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'company', label: 'Company' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        { key: 'propertyCount', label: 'Properties' },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <Badge status={row.status}>{row.status}</Badge>,
        },
      ]}
    />
  );
}
