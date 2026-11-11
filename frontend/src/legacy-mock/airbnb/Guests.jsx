import { useState } from 'react';
import toast from 'react-hot-toast';
import EntityListPage from '../../components/ui/EntityListPage.jsx';
import Modal from '../../components/ui/Modal.jsx';
import FormActionBar from '../../components/ui/FormActionBar.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { remGuests } from '../../services/remsData.js';
import { ASSIGN_OPTIONS } from '../../utils/unitWorkflows.js';

export default function Guests() {
  const [rows, setRows] = useState(
    remGuests.map((g) => ({ ...g, status: g.status || 'Active' })),
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
    idType: 'Passport',
    idNumber: '',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      nationality: '',
      idType: 'Passport',
      idNumber: '',
    });
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      name: row.name || '',
      email: row.email || '',
      phone: row.phone || '',
      nationality: row.nationality || '',
      idType: row.idType || 'Passport',
      idNumber: row.idNumber || '',
    });
    setFormOpen(true);
  };

  const save = (close = true) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...form } : r)));
      toast.success('Guest updated');
    } else {
      setRows((prev) => [
        { id: `gst-${Date.now()}`, status: 'Active', ...form },
        ...prev,
      ]);
      toast.success('Guest created');
    }
    if (close) setFormOpen(false);
  };

  return (
    <>
      <EntityListPage
        title="Guests"
        subtitle="Airbnb guest directory."
        breadcrumbs={[{ label: 'Airbnb' }, { label: 'Guests' }]}
        rows={rows}
        setRows={setRows}
        entityLabel="guest"
        exportFileName="guests"
        statusOptions={['Active', 'Blocked', 'Inactive']}
        statusKey="status"
        searchKeys={['name', 'email', 'phone', 'nationality', 'idNumber']}
        filters={[
          {
            key: 'nationality',
            label: 'nationality',
            options: [...new Set(rows.map((g) => g.nationality))],
          },
        ]}
        primaryAction={{ label: 'Add guest', onClick: openCreate }}
        onEdit={openEdit}
        onView={(row) => toast(`Viewing ${row.name}`)}
        assignOptions={ASSIGN_OPTIONS}
        getWorkflowActions={(row, { changeStatus, askConfirm, toast: t }) => [
          {
            key: 'block',
            label: 'Block Guest',
            hidden: row.status === 'Blocked',
            onClick: () =>
              askConfirm({
                title: 'Block guest?',
                message: `Block ${row.name} from future bookings?`,
                confirmLabel: 'Block',
                danger: true,
                action: () => changeStatus('Blocked'),
              }),
          },
          {
            key: 'unblock',
            label: 'Unblock',
            hidden: row.status !== 'Blocked',
            onClick: () => changeStatus('Active'),
          },
          {
            key: 'verify-id',
            label: 'Verify ID',
            onClick: () => t.success(`ID verified for ${row.name}`),
          },
        ]}
        columns={[
          { key: 'name', label: 'Guest' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'nationality', label: 'Nationality' },
          { key: 'idType', label: 'ID type' },
          { key: 'idNumber', label: 'ID number' },
        ]}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit guest' : 'Add guest'}
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
            label="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Nationality"
            value={form.nationality}
            onChange={(e) => setForm({ ...form, nationality: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Select
            label="ID type"
            value={form.idType}
            onChange={(e) => setForm({ ...form, idType: e.target.value })}
          >
            <option>Passport</option>
            <option>Emirates ID</option>
            <option>National ID</option>
          </Select>
          <Input
            label="ID number"
            value={form.idNumber}
            onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
          />
        </div>
      </Modal>
    </>
  );
}
