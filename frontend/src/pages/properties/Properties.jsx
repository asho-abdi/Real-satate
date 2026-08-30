import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MdDeleteOutline, MdEdit } from 'react-icons/md';
import CrudPage from '../../components/ui/CrudPage.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  listProperties,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../../services/dataService.js';
import { formatCurrency } from '../../utils/format.js';
import PropertyFormModal from './PropertyFormModal.jsx';

const STATUS_OPTIONS = ['Available', 'Occupied', 'Pending', 'Sold', 'Rented'];
const CATEGORY_OPTIONS = ['Residential', 'Commercial', 'Land', 'Hospitality', 'Industrial', 'Mixed-Use'];
const TYPE_OPTIONS = [
  'Apartment',
  'Villa',
  'Townhouse',
  'Studio',
  'Penthouse',
  'Office',
  'Shop',
  'Warehouse',
  'Plot',
  'Hotel Suite',
  'Duplex',
  'Showroom',
];

export default function Properties() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const res = await listProperties({ sortBy: 'createdAt', sortDir: 'desc' });
      setRows(res.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    setSaving(true);
    try {
      if (editing?.id) {
        await updateProperty(editing.id, payload);
        toast.success('Property updated');
      } else {
        await createProperty(payload);
        toast.success('Property created');
      }
      setModalOpen(false);
      setEditing(null);
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to save property');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row) {
    if (!window.confirm(`Delete “${row.title}”?`)) return;
    try {
      await deleteProperty(row.id);
      toast.success('Property deleted');
      await refresh();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  }

  const columns = [
    {
      key: 'title',
      label: 'Property',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.images?.[0]}
            alt=""
            className="h-10 w-14 rounded-lg object-cover"
          />
          <div>
            <div>{row.title}</div>
            <div className="text-xs text-[var(--text-muted)]">{row.code}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', label: 'Category' },
    { key: 'type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => <Badge status={row.status}>{row.status}</Badge>,
    },
    {
      key: 'price',
      label: 'Price',
      render: (row) => formatCurrency(row.price),
    },
    { key: 'city', label: 'City' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)} aria-label="Edit">
            <MdEdit />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} aria-label="Delete">
            <MdDeleteOutline className="text-rose-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <CrudPage
        title="Properties"
        subtitle="Browse, filter, and manage the property inventory."
        breadcrumbs={[{ label: 'Inventory', to: '/properties' }, { label: 'Properties' }]}
        columns={columns}
        rows={rows}
        loading={loading}
        searchKeys={['title', 'code', 'city', 'address', 'owner', 'agent']}
        filters={[
          { key: 'status', label: 'Status', options: STATUS_OPTIONS },
          { key: 'category', label: 'Category', options: CATEGORY_OPTIONS },
          { key: 'type', label: 'Type', options: TYPE_OPTIONS },
        ]}
        primaryAction={{ label: 'Add property', onClick: openCreate }}
        onRowClickPath={(row) => `/properties/${row.id}`}
      />

      <PropertyFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        property={editing}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </>
  );
}
