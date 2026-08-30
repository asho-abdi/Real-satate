import toast from 'react-hot-toast';
import CrudPage from '../components/ui/CrudPage.jsx';
import Badge from '../components/ui/Badge.jsx';
import { mockAppointments } from '../services/mockData.js';
import { formatDate } from '../utils/format.js';

export default function Appointments() {
  return (
    <CrudPage
      title="Appointments"
      subtitle="Viewings, inspections, and client meetings."
      breadcrumbs={[{ label: 'Operations' }, { label: 'Appointments' }]}
      rows={mockAppointments}
      searchKeys={['title', 'property', 'clientName', 'agent', 'type', 'status']}
      filters={[
        { key: 'status', label: 'status', options: ['Active', 'Pending', 'Closed'] },
        { key: 'type', label: 'type', options: [...new Set(mockAppointments.map((a) => a.type))] },
      ]}
      primaryAction={{ label: 'Schedule', onClick: () => toast('Appointment form coming soon') }}
      columns={[
        { key: 'title', label: 'Appointment' },
        { key: 'property', label: 'Property' },
        { key: 'clientName', label: 'Client' },
        { key: 'agent', label: 'Agent' },
        {
          key: 'date',
          label: 'When',
          render: (row) => formatDate(row.date || row.scheduledAt),
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
