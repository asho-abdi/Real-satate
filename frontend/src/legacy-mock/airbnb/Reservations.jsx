import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import { remReservations } from '../../services/remsData.js';
import { formatCurrency, formatDate } from '../../utils/format.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Reservations() {
  const [rows, setRows] = useState(remReservations);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    guest: '',
    unit: '',
    checkIn: '',
    checkOut: '',
    nights: '',
    total: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ guest: '', unit: '', checkIn: '', checkOut: '', nights: '', total: '' });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      guest: row.guest || '',
      unit: row.unit || '',
      checkIn: row.checkIn || '',
      checkOut: row.checkOut || '',
      nights: String(row.nights ?? ''),
      total: String(row.total ?? ''),
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    const payload = {
      ...form,
      nights: Number(form.nights) || 0,
      total: Number(form.total) || 0,
    };
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      toast.success('Reservation updated');
    } else {
      setRows((prev) => [
        {
          id: `rsv-${Date.now()}`,
          code: `RSV-A-${Math.floor(Math.random() * 9000 + 1000)}`,
          status: 'Pending',
          cleaningStatus: 'Clean',
          adults: 2,
          children: 0,
          ...payload,
        },
        ...prev,
      ]);
      toast.success('Reservation created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Reservations"
        subtitle="Airbnb bookings with check-in and check-out workflows."
        breadcrumbs={[{ label: 'Airbnb' }, { label: 'Reservations' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="reservation"
        exportFileName="reservations"
        statusOptions={['Pending', 'Confirmed', 'Checked In', 'Checked Out', 'Cancelled']}
        statusKey="status"
        searchKeys={['code', 'guest', 'unit', 'status']}
        filters={[
          { key: 'status', label: 'status', options: [...new Set(rows.map((r) => r.status))] },
        ]}
        primaryAction={{ label: 'New reservation', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.code}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, updateRows, toast: t }) => [
          {
            key: 'confirm',
            label: 'Confirm Booking',
            hidden: !['Pending'].includes(row.status),
            onClick: () => changeStatus('Confirmed'),
          },
          {
            key: 'cancel',
            label: 'Cancel Booking',
            hidden: ['Cancelled', 'Checked Out'].includes(row.status),
            onClick: () =>
              askConfirm({
                title: 'Cancel booking?',
                message: `Cancel ${row.code}?`,
                confirmLabel: 'Cancel booking',
                danger: true,
                action: () => changeStatus('Cancelled'),
              }),
          },
          {
            key: 'check-in',
            label: 'Check In',
            hidden: !['Confirmed', 'Pending'].includes(row.status),
            onClick: () => changeStatus('Checked In'),
          },
          {
            key: 'check-out',
            label: 'Check Out',
            hidden: row.status !== 'Checked In',
            onClick: () => changeStatus('Checked Out'),
          },
          {
            key: 'assign-cleaner',
            label: 'Assign Cleaner',
            onClick: () => {
              updateRows((prev) =>
                prev.map((r) =>
                  r.id === row.id
                    ? { ...r, cleaningStatus: 'In Progress', assignee: 'Cleaning Team' }
                    : r,
                ),
              );
              t.success(`Cleaner assigned for ${row.unit}`);
            },
          },
          {
            key: 'mark-clean',
            label: 'Mark Clean',
            onClick: () => {
              updateRows((prev) =>
                prev.map((r) =>
                  r.id === row.id ? { ...r, cleaningStatus: 'Clean' } : r,
                ),
              );
              t.success(`${row.unit} marked clean`);
            },
          },
        ]}
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'guest', label: 'Guest' },
          { key: 'unit', label: 'Unit' },
          {
            key: 'checkIn',
            label: 'Check-in',
            render: (row) => formatDate(row.checkIn),
          },
          {
            key: 'checkOut',
            label: 'Check-out',
            render: (row) => formatDate(row.checkOut),
          },
          { key: 'nights', label: 'Nights' },
          {
            key: 'total',
            label: 'Amount',
            render: (row) => formatCurrency(row.total),
          },
          {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge status={row.status}>{row.status}</Badge>,
          },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit reservation' : 'New reservation'}
        footer={
          <FormActionBar
            onCancel={() => setFormOpen(false)}
            onReset={() => toast('Form reset')}
            onSaveDraft={() => toast.success('Draft saved')}
            onSave={() => save(true)}
            onSaveAndNew={() => {
              save(false);
              setEditing(null);
              toast.success('Saved — ready for new');
            }}
            onSaveAndClose={() => save(true)}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Guest"
            value={form.guest}
            onChange={(e) => setForm({ ...form, guest: e.target.value })}
          />
          <Input
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <Input
            label="Check-in"
            type="date"
            value={form.checkIn}
            onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
          />
          <Input
            label="Check-out"
            type="date"
            value={form.checkOut}
            onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
          />
          <Input
            label="Nights"
            type="number"
            value={form.nights}
            onChange={(e) => setForm({ ...form, nights: e.target.value })}
          />
          <Input
            label="Total (AED)"
            type="number"
            value={form.total}
            onChange={(e) => setForm({ ...form, total: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
