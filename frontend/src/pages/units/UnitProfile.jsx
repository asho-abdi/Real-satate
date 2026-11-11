import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../../components/ui/PageHeader.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import UnitImageGallery from '../../components/ui/UnitImageGallery.jsx';
import { APP_NAME, PAYMENT_METHODS } from '../../utils/constants.js';
import { formatCurrency, formatDate, cn } from '../../utils/format.js';
import { rentalApi } from '../../services/rentalApi.js';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lease', label: 'Lease' },
  { id: 'payments', label: 'Payments' },
  { id: 'charges', label: 'Other Charges' },
  { id: 'tenant', label: 'Tenant' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
];

const CHARGE_CATEGORIES = [
  { value: 'MONTHLY_CHARGE', label: 'Monthly charge' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'LATE_FEE', label: 'Late fee' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'SERVICE', label: 'Service fee' },
  { value: 'OTHER', label: 'Other' },
];

const DOC_CATEGORIES = [
  { value: 'LEASE_AGREEMENT', label: 'Lease agreement' },
  { value: 'RENEWAL_AGREEMENT', label: 'Renewal agreement' },
  { value: 'TERMINATION_AGREEMENT', label: 'Termination agreement' },
  { value: 'PAYMENT_RECEIPT', label: 'Payment receipt' },
  { value: 'IDENTITY', label: 'Identity' },
  { value: 'OTHER', label: 'Other' },
];

function moneyCards(items) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            {item.label}
          </p>
          <p className="mt-1 text-xl font-semibold text-[var(--text)]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function paymentTone(status, balance) {
  const s = String(status || '').toUpperCase();
  if (s === 'PAID' || status === 'Paid') return 'Paid';
  if (s === 'PARTIAL' || status === 'Partial' || (balance > 0 && balance < Infinity)) return 'Partial';
  return 'Unpaid';
}

export default function UnitProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [payOpen, setPayOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargePay, setChargePay] = useState(null);
  const [chargePayAmount, setChargePayAmount] = useState('');
  const [termOpen, setTermOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [leaseOpen, setLeaseOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [payForm, setPayForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    rentDue: '',
    otherCharges: '0',
    amountPaid: '',
    paymentDate: new Date().toISOString().slice(0, 10),
    method: 'Cash',
    notes: '',
  });
  const [chargeForm, setChargeForm] = useState({
    category: 'UTILITIES',
    description: '',
    amountDue: '',
    amountPaid: '0',
    chargeDate: new Date().toISOString().slice(0, 10),
    month: new Date().toISOString().slice(0, 7),
    notes: '',
  });
  const [termForm, setTermForm] = useState({
    leaseEnd: new Date().toISOString().slice(0, 10),
    reason: '',
  });
  const [renewForm, setRenewForm] = useState({
    leaseStart: '',
    leaseEnd: '',
    monthlyRent: '',
    securityDeposit: '',
    notes: '',
  });
  const [leaseForm, setLeaseForm] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    idNumber: '',
    monthlyRent: '',
    securityDeposit: '',
    leaseStart: new Date().toISOString().slice(0, 10),
    leaseEnd: '',
    paymentFrequency: 'MONTHLY',
    gracePeriodDays: 0,
    notes: '',
  });
  const [docForm, setDocForm] = useState({ category: 'LEASE_AGREEMENT', notes: '', file: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalApi.getUnitProfile(id);
      setProfile(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const unit = profile?.unit;
  const lease = profile?.activeLease;
  const actions = profile?.availableActions || [];
  const financial = profile?.financialSummary;

  const visibleTabs = useMemo(() => {
    if (!profile) return TABS;
    if (profile.profileMode === 'GUEST') {
      return TABS.filter((t) => !['lease', 'tenant', 'charges'].includes(t.id)).concat([
        { id: 'bookings', label: 'Bookings' },
      ]);
    }
    if (profile.profileMode === 'SOLD') {
      return TABS
        .filter((t) => t.id !== 'tenant')
        .map((t) => (t.id === 'lease' ? { id: 'ownership', label: 'Ownership' } : t));
    }
    return TABS;
  }, [profile]);

  const openPay = () => {
    const rent = lease?.netMonthlyRent || unit?.monthlyRent || 0;
    setPayForm({
      month: profile?.currentMonth || new Date().toISOString().slice(0, 7),
      rentDue: String(rent),
      otherCharges: '0',
      amountPaid: String(rent),
      paymentDate: new Date().toISOString().slice(0, 10),
      method: 'Cash',
      notes: '',
    });
    setPayOpen(true);
  };

  const openCharge = () => {
    const month = profile?.currentMonth || new Date().toISOString().slice(0, 7);
    const sale = profile?.profileMode === 'SOLD' ? profile?.activeSale : null;
    setChargeForm({
      category: sale ? 'MONTHLY_CHARGE' : 'UTILITIES',
      description: sale ? `Monthly charge ${month}` : '',
      amountDue: sale ? String(sale.monthlyMaintenance || '') : '',
      amountPaid: '0',
      chargeDate: new Date().toISOString().slice(0, 10),
      month,
      notes: '',
    });
    setChargeOpen(true);
  };

  const payTotalDue = useMemo(() => {
    const rent = Number(payForm.rentDue) || 0;
    const other = Number(payForm.otherCharges) || 0;
    return Math.round((rent + other) * 100) / 100;
  }, [payForm.rentDue, payForm.otherCharges]);

  const openRenew = () => {
    const start = lease?.leaseEnd
      ? new Date(lease.leaseEnd)
      : new Date();
    if (lease?.leaseEnd) start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    setRenewForm({
      leaseStart: start.toISOString().slice(0, 10),
      leaseEnd: end.toISOString().slice(0, 10),
      monthlyRent: String(lease?.monthlyRent || ''),
      securityDeposit: String(lease?.securityDeposit || ''),
      notes: '',
    });
    setRenewOpen(true);
  };

  const openCreateLease = () => {
    setLeaseForm({
      businessName: '',
      contactName: '',
      phone: '',
      idNumber: '',
      monthlyRent: String(unit?.monthlyRent || ''),
      securityDeposit: '',
      leaseStart: new Date().toISOString().slice(0, 10),
      leaseEnd: '',
      paymentFrequency: 'MONTHLY',
      gracePeriodDays: 0,
      notes: '',
    });
    setLeaseOpen(true);
  };

  const savePayment = async () => {
    if (!lease) return;
    const rentDue = Number(payForm.rentDue) || 0;
    const otherCharges = Number(payForm.otherCharges) || 0;
    const amountDue = Math.round((rentDue + otherCharges) * 100) / 100;
    const amountPaid = Number(payForm.amountPaid);
    if (!(amountDue > 0) || !payForm.month) {
      toast.error('Month and total due are required');
      return;
    }
    if (amountPaid < 0) {
      toast.error('Amount paid cannot be negative');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.createPayment({
        businessId: lease.kind === 'BUSINESS' ? lease.id : undefined,
        tenantId: lease.kind === 'TENANT' ? lease.id : undefined,
        month: payForm.month,
        rentDue,
        otherCharges,
        amountDue,
        amountPaid,
        paymentDate: payForm.paymentDate,
        method: payForm.method,
        notes: payForm.notes || null,
      });
      toast.success('Payment recorded');
      setPayOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  const saveCharge = async () => {
    const sold = profile?.profileMode === 'SOLD';
    if (!sold && !lease) return;
    if (!chargeForm.description.trim() || !(Number(chargeForm.amountDue) > 0)) {
      toast.error('Description and amount due are required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.createLeaseCharge({
        businessId: !sold && lease?.kind === 'BUSINESS' ? lease.id : undefined,
        tenantId: !sold && lease?.kind === 'TENANT' ? lease.id : undefined,
        unitId: unit.id,
        category: chargeForm.category,
        description: chargeForm.description.trim(),
        amountDue: Number(chargeForm.amountDue),
        amountPaid: Number(chargeForm.amountPaid) || 0,
        chargeDate: chargeForm.chargeDate,
        month: chargeForm.month,
        notes: chargeForm.notes || null,
      });
      toast.success('Other charge added');
      setChargeOpen(false);
      setTab('charges');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not add charge');
    } finally {
      setSaving(false);
    }
  };

  const saveChargePayment = async () => {
    if (!chargePay) return;
    const amount = Number(chargePayAmount);
    if (!(amount > 0)) {
      toast.error('Enter the amount paid');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.updateLeaseCharge(chargePay.id, { addPayment: amount });
      toast.success('Payment recorded');
      setChargePay(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not record payment');
    } finally {
      setSaving(false);
    }
  };

  const terminateLease = async () => {
    if (!lease) return;
    setSaving(true);
    try {
      if (lease.kind === 'BUSINESS') {
        await rentalApi.terminateBusiness(lease.id, {
          leaseEnd: termForm.leaseEnd,
          reason: termForm.reason,
        });
      } else {
        await rentalApi.terminateTenant(lease.id, {
          leaseEnd: termForm.leaseEnd,
          notes: termForm.reason,
        });
      }
      toast.success('Lease terminated — history preserved');
      setTermOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not terminate lease');
    } finally {
      setSaving(false);
    }
  };

  const renewLease = async () => {
    if (!lease || lease.kind !== 'BUSINESS') {
      toast.error('Renewal is currently available for shop leases');
      return;
    }
    if (!renewForm.leaseStart || !renewForm.leaseEnd) {
      toast.error('Start and end dates are required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.renewBusiness(lease.id, renewForm);
      toast.success('Lease renewed — previous term kept in history');
      setRenewOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not renew lease');
    } finally {
      setSaving(false);
    }
  };

  const createLease = async () => {
    if (!leaseForm.businessName.trim() || !leaseForm.contactName.trim() || !leaseForm.phone.trim()) {
      toast.error('Business, contact, and phone are required');
      return;
    }
    setSaving(true);
    try {
      await rentalApi.createBusiness({
        ...leaseForm,
        unitId: unit.id,
        roomId: unit.id,
      });
      toast.success('Lease created');
      setLeaseOpen(false);
      setTab('lease');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not create lease');
    } finally {
      setSaving(false);
    }
  };

  const uploadDoc = async () => {
    if (!docForm.file) {
      toast.error('Choose a file');
      return;
    }
    setSaving(true);
    try {
      const entityType = lease ? lease.kind : 'UNIT';
      const entityId = lease ? lease.id : unit.id;
      await rentalApi.uploadEntityDocument({
        entityType,
        entityId,
        unitId: unit.id,
        category: docForm.category,
        notes: docForm.notes,
        file: docForm.file,
      });
      toast.success('Document uploaded');
      setDocOpen(false);
      setDocForm({ category: 'LEASE_AGREEMENT', notes: '', file: null });
      setTab('documents');
      await load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading profile…" />
      </div>
    );
  }

  if (!profile || !unit) {
    return (
      <div>
        <PageHeader title="Profile not found" />
        <Button onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const statusLabel =
    profile.profileMode === 'LEASED_SHOP' || profile.profileMode === 'LEASED_APARTMENT'
      ? 'Leased'
      : profile.profileMode === 'SOLD'
        ? 'Sold'
        : profile.profileMode === 'GUEST'
          ? 'Guest unit'
          : unit.status === 'AVAILABLE'
            ? 'Available'
            : unit.status;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${unit.usage === 'SHOP' ? 'Shop' : 'Unit'} ${unit.roomNumber}`}
        subtitle={`${unit.building?.name || '—'} · ${unit.floor?.name || '—'} · ${profile.ownershipType}`}
        breadcrumbs={[
          { label: APP_NAME, to: '/dashboard' },
          { label: unit.building?.name || 'Building', to: `/buildings/${unit.building?.id}` },
          { label: `Unit ${unit.roomNumber}` },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {actions.includes('RECORD_PAYMENT') ? (
              <Button onClick={openPay}>Record Payment</Button>
            ) : null}
            {actions.includes('ADD_CHARGE') ? (
              <Button variant="secondary" onClick={openCharge}>Add Charge</Button>
            ) : null}
            {actions.includes('CREATE_LEASE') && unit.usage === 'SHOP' ? (
              <Button onClick={openCreateLease}>Create Lease</Button>
            ) : null}
            {actions.includes('RENEW_LEASE') ? (
              <Button variant="secondary" onClick={openRenew}>Renew Lease</Button>
            ) : null}
            {actions.includes('TERMINATE_LEASE') ? (
              <Button variant="secondary" onClick={() => setTermOpen(true)}>
                Terminate Lease
              </Button>
            ) : null}
            {actions.includes('UPLOAD_DOCUMENT') ? (
              <Button variant="secondary" onClick={() => setDocOpen(true)}>
                Upload Document
              </Button>
            ) : null}
            {actions.includes('CREATE_BOOKING') ? (
              <Link to="/bookings?tab=new">
                <Button variant="secondary">New Booking</Button>
              </Link>
            ) : null}
            <Link to={`/buildings/${unit.building?.id}`}>
              <Button variant="secondary">Edit in Building</Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge status={statusLabel}>{statusLabel}</Badge>
        {lease?.displayStatus ? <Badge status={lease.displayStatus}>{lease.displayStatus}</Badge> : null}
        {lease?.daysUntilExpiry != null && lease.daysUntilExpiry >= 0 && lease.daysUntilExpiry <= 30 ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Lease expires in {lease.daysUntilExpiry} day{lease.daysUntilExpiry === 1 ? '' : 's'}
          </span>
        ) : null}
        {lease?.daysUntilExpiry != null && lease.daysUntilExpiry < 0 && lease.status === 'ACTIVE' ? (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
            Lease expired {Math.abs(lease.daysUntilExpiry)} days ago
          </span>
        ) : null}
      </div>

      {financial
        ? moneyCards(
            profile.profileMode === 'SOLD'
              ? [
                  { label: 'Sale price', value: formatCurrency(financial.salePrice || 0) },
                  { label: 'Paid', value: formatCurrency(financial.amountPaid || 0) },
                  { label: 'Balance', value: formatCurrency(financial.balance || 0) },
                  {
                    label: 'Monthly payment',
                    value: formatCurrency(financial.monthlyMaintenance || 0),
                  },
                  {
                    label: 'Charges outstanding',
                    value: formatCurrency(financial.chargesOutstanding || 0),
                  },
                ]
              : [
                  { label: 'Monthly rent', value: formatCurrency(financial.monthlyRent || 0) },
                  { label: 'Other charges', value: formatCurrency(financial.otherChargesDue || 0) },
                  { label: 'Total due', value: formatCurrency(financial.totalDue || 0) },
                  { label: 'Total paid', value: formatCurrency(financial.totalPaid || 0) },
                  { label: 'Outstanding', value: formatCurrency(financial.outstanding || 0) },
                ],
          )
        : null}

      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-2">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-10 rounded-lg px-4 text-sm font-semibold transition-colors',
              tab === t.id
                ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-ink-950'
                : 'bg-[var(--surface)] text-[var(--text-secondary)] shadow-xs ring-1 ring-[var(--border)] hover:text-[var(--text)] hover:ring-[var(--border-strong)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Photos" className="lg:col-span-3">
            <UnitImageGallery unitId={unit.id} images={unit.images || []} readOnly onChange={load} />
            <Button variant="secondary" className="mt-3" onClick={() => navigate(`/buildings/${unit.building?.id}`)}>
              Manage photos
            </Button>
          </Card>
          <Card title="Unit details" className="lg:col-span-3">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-[var(--text-muted)]">Unit number</dt><dd className="font-medium">{unit.roomNumber}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Type</dt><dd className="font-medium">{unit.unitType}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Usage</dt><dd className="font-medium">{unit.usage}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Status</dt><dd className="font-medium">{unit.status}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Building</dt><dd className="font-medium">{unit.building?.name}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Floor</dt><dd className="font-medium">{unit.floor?.name}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Monthly rate</dt><dd className="font-medium">{formatCurrency(unit.monthlyRent)}</dd></div>
              {unit.areaSqm != null ? (
                <div><dt className="text-[var(--text-muted)]">Area</dt><dd className="font-medium">{unit.areaSqm} m²</dd></div>
              ) : null}
            </dl>
            {unit.description || unit.notes ? (
              <p className="mt-4 text-sm text-[var(--text-muted)]">{unit.description || unit.notes}</p>
            ) : null}
          </Card>
          {lease ? (
            <Card title="Lease overview" className="lg:col-span-3">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div><dt className="text-[var(--text-muted)]">Tenant</dt><dd className="font-medium">{lease.name}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Lease status</dt><dd className="font-medium">{lease.displayStatus}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Lease start</dt><dd className="font-medium">{formatDate(lease.leaseStart)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Lease end</dt><dd className="font-medium">{lease.leaseEnd ? formatDate(lease.leaseEnd) : 'Open-ended'}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Monthly rent</dt><dd className="font-medium">{formatCurrency(lease.netMonthlyRent)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Security deposit</dt><dd className="font-medium">{formatCurrency(lease.securityDeposit)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Next payment</dt><dd className="font-medium">{lease.financials.nextPaymentMonth || '—'}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Outstanding</dt><dd className="font-medium">{formatCurrency(lease.financials.outstanding)}</dd></div>
              </dl>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab === 'lease' || tab === 'ownership' ? (
        <div className="space-y-4">
          {lease ? (
            <Card title="Active lease">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                <div><dt className="text-[var(--text-muted)]">Tenant / business</dt><dd className="font-medium">{lease.name}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Contact</dt><dd className="font-medium">{lease.contactName}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Phone</dt><dd className="font-medium">{lease.phone}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Start</dt><dd className="font-medium">{formatDate(lease.leaseStart)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">End</dt><dd className="font-medium">{lease.leaseEnd ? formatDate(lease.leaseEnd) : '—'}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Frequency</dt><dd className="font-medium">{lease.paymentFrequency}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Grace period</dt><dd className="font-medium">{lease.gracePeriodDays} days</dd></div>
                <div className="sm:col-span-2"><dt className="text-[var(--text-muted)]">Notes</dt><dd className="font-medium">{lease.notes || '—'}</dd></div>
              </dl>
            </Card>
          ) : profile.activeSale ? (
            <Card title="Ownership">
              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div><dt className="text-[var(--text-muted)]">Owner</dt><dd className="font-medium">{profile.activeSale.buyerName}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Sale date</dt><dd className="font-medium">{formatDate(profile.activeSale.saleDate)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Sale price</dt><dd className="font-medium">{formatCurrency(profile.activeSale.salePrice)}</dd></div>
                <div><dt className="text-[var(--text-muted)]">Balance</dt><dd className="font-medium">{formatCurrency(profile.activeSale.balance)}</dd></div>
              </dl>
            </Card>
          ) : (
            <Card>
              <p className="text-sm text-[var(--text-muted)]">No active lease on this unit.</p>
              {actions.includes('CREATE_LEASE') && unit.usage === 'SHOP' ? (
                <Button className="mt-3" onClick={openCreateLease}>Create Lease</Button>
              ) : null}
            </Card>
          )}

          <Card title="Lease history">
            {(profile.leaseHistory || []).length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No lease history yet.</p>
            ) : (
              <ul className="space-y-3">
                {profile.leaseHistory.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3 text-sm">
                    <div>
                      <p className="font-medium text-[var(--text)]">{h.name}</p>
                      <p className="text-[var(--text-muted)]">
                        {formatDate(h.leaseStart)} – {h.leaseEnd ? formatDate(h.leaseEnd) : 'Open'}
                        {h.endReason ? ` · ${h.endReason}` : ''}
                      </p>
                    </div>
                    <Badge status={h.displayStatus}>{h.displayStatus}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'payments' && profile.profileMode === 'SOLD' ? (
        <div className="space-y-4">
          <Card title="Owner & sale">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Owner</dt>
                <dd className="font-medium">{profile.activeSale?.buyerName || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Phone</dt>
                <dd className="font-medium">{profile.activeSale?.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Sale date</dt>
                <dd className="font-medium">{formatDate(profile.activeSale?.saleDate)}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Sale price</dt>
                <dd className="font-medium">{formatCurrency(profile.activeSale?.salePrice || 0)}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Sale paid</dt>
                <dd className="font-medium">{formatCurrency(profile.activeSale?.amountPaid || 0)}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Sale balance</dt>
                <dd className="font-medium">{formatCurrency(profile.activeSale?.balance || 0)}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Monthly charge</dt>
                <dd className="font-medium">{formatCurrency(profile.activeSale?.monthlyMaintenance || 0)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Sale payments">
            {!(profile.activeSale?.salePayments || []).length ? (
              <p className="text-sm text-[var(--text-muted)]">No sale payments recorded yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {profile.activeSale.salePayments.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-2">
                    <span>{formatDate(p.paymentDate)} · {p.method || p.paymentMethod || '—'}</span>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Monthly charges"
            action={
              actions.includes('ADD_CHARGE') ? (
                <Button onClick={openCharge}>Add monthly charge</Button>
              ) : null
            }
          >
            <p className="mb-3 text-sm text-[var(--text-muted)]">
              Owner monthly payments use Other Charges. Sale price and sale balance stay separate.
            </p>
            {!(profile.ownerCharges || []).length ? (
              <p className="text-sm text-[var(--text-muted)]">No monthly charges yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                      <th className="pb-2 pr-3 font-medium">Month</th>
                      <th className="pb-2 pr-3 font-medium">Description</th>
                      <th className="pb-2 pr-3 font-medium">Due</th>
                      <th className="pb-2 pr-3 font-medium">Paid</th>
                      <th className="pb-2 pr-3 font-medium">Balance</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.ownerCharges.map((c) => (
                      <tr key={c.id} className="border-b border-[var(--border)]/60">
                        <td className="py-2.5 pr-3 font-medium">{c.month || '—'}</td>
                        <td className="py-2.5 pr-3">{c.description}</td>
                        <td className="py-2.5 pr-3">{formatCurrency(c.amountDue)}</td>
                        <td className="py-2.5 pr-3">{formatCurrency(c.amountPaid)}</td>
                        <td className="py-2.5 pr-3">{formatCurrency(c.balance)}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Badge status={paymentTone(c.status, c.balance)}>
                              {paymentTone(c.status, c.balance)}
                            </Badge>
                            {c.balance > 0 ? (
                              <button
                                type="button"
                                className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                                onClick={() => {
                                  setChargePay(c);
                                  setChargePayAmount(String(c.balance));
                                }}
                              >
                                Record payment
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {(profile.activeSale?.maintenancePayments || []).length ? (
              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Legacy maintenance history (read-only)
                </p>
                <ul className="space-y-1 text-sm text-[var(--text-muted)]">
                  {profile.activeSale.maintenancePayments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-1">
                      <span>{p.month} · {p.status}</span>
                      <span>{formatCurrency(p.amountPaid)} / {formatCurrency(p.amountDue)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === 'payments' && profile.profileMode !== 'SOLD' ? (
        <Card
          title="Payment history"
          action={
            actions.includes('RECORD_PAYMENT') ? (
              <Button onClick={openPay}>Record Payment</Button>
            ) : null
          }
        >
          {!lease?.payments?.length ? (
            <p className="text-sm text-[var(--text-muted)]">No payments recorded for the active lease.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="pb-2 pr-3 font-medium">Month</th>
                    <th className="pb-2 pr-3 font-medium">Rent</th>
                    <th className="pb-2 pr-3 font-medium">Other</th>
                    <th className="pb-2 pr-3 font-medium">Total due</th>
                    <th className="pb-2 pr-3 font-medium">Paid</th>
                    <th className="pb-2 pr-3 font-medium">Balance</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lease.payments.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--border)]/60">
                      <td className="py-2.5 pr-3 font-medium">{p.month}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(p.rentDue ?? (p.amountDue - (p.otherCharges || 0)))}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(p.otherCharges || 0)}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(p.amountDue)}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(p.amountPaid)}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(p.balance)}</td>
                      <td className="py-2.5">
                        <Badge status={paymentTone(p.status, p.balance)}>
                          {paymentTone(p.status, p.balance)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {lease ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-[var(--text-muted)]">Rent due</p>
                <p className="font-semibold">{formatCurrency(lease.financials.rentDue)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-[var(--text-muted)]">Other charges due</p>
                <p className="font-semibold">{formatCurrency(lease.financials.otherChargesDue)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-[var(--text-muted)]">Total paid</p>
                <p className="font-semibold">{formatCurrency(lease.financials.totalPaid)}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-2)] p-3">
                <p className="text-[var(--text-muted)]">Outstanding</p>
                <p className="font-semibold">{formatCurrency(lease.financials.outstanding)}</p>
              </div>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'charges' ? (
        <Card
          title="Other charges"
          action={
            actions.includes('ADD_CHARGE') ? (
              <Button onClick={openCharge}>Add Charge</Button>
            ) : null
          }
        >
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            {profile.profileMode === 'SOLD'
              ? `Owner monthly charges live here (not under Maintenance repairs). Monthly amount: ${formatCurrency(profile.activeSale?.monthlyMaintenance || 0)}. Sale balance stays separate.`
              : 'Utilities, late fees, parking, service fees, and other billable items. These are included in Total Due and Outstanding. Repair work belongs under Maintenance.'}
          </p>
          {!(profile.profileMode === 'SOLD' ? profile.ownerCharges : lease?.charges)?.length ? (
            <p className="text-sm text-[var(--text-muted)]">No other charges yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 font-medium">Category</th>
                    <th className="pb-2 pr-3 font-medium">Description</th>
                    <th className="pb-2 pr-3 font-medium">Due</th>
                    <th className="pb-2 pr-3 font-medium">Paid</th>
                    <th className="pb-2 pr-3 font-medium">Balance</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.profileMode === 'SOLD' ? profile.ownerCharges : lease.charges).map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border)]/60">
                      <td className="py-2.5 pr-3">{formatDate(c.chargeDate)}</td>
                      <td className="py-2.5 pr-3">{String(c.category || '').replace(/_/g, ' ')}</td>
                      <td className="py-2.5 pr-3">{c.description}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(c.amountDue)}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(c.amountPaid)}</td>
                      <td className="py-2.5 pr-3">{formatCurrency(c.balance)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <Badge status={paymentTone(c.status, c.balance)}>
                            {paymentTone(c.status, c.balance)}
                          </Badge>
                          {c.balance > 0 ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                              onClick={() => {
                                setChargePay(c);
                                setChargePayAmount(String(c.balance));
                              }}
                            >
                              Record payment
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'tenant' ? (
        <Card title="Tenant / customer">
          {!lease ? (
            <p className="text-sm text-[var(--text-muted)]">No active tenant on this unit.</p>
          ) : (
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><dt className="text-[var(--text-muted)]">Name</dt><dd className="font-medium">{lease.name}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Contact</dt><dd className="font-medium">{lease.contactName}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Phone</dt><dd className="font-medium">{lease.phone}</dd></div>
              <div><dt className="text-[var(--text-muted)]">ID / license</dt><dd className="font-medium">{lease.idNumber || '—'}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Current unit</dt><dd className="font-medium">{unit.roomNumber}</dd></div>
              <div><dt className="text-[var(--text-muted)]">Lease status</dt><dd className="font-medium">{lease.displayStatus}</dd></div>
            </dl>
          )}
          {(profile.leaseHistory || []).length > 1 ? (
            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-[var(--text)]">Lease history for this unit</p>
              <ul className="space-y-2 text-sm">
                {profile.leaseHistory.map((h) => (
                  <li key={h.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-2">
                    <span>{h.name}</span>
                    <span className="text-[var(--text-muted)]">{h.displayStatus}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === 'expenses' ? (
        <Card title="Unit expenses / money movements">
          {(profile.expenses || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No expenses linked to this unit.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {profile.expenses.map((e) => (
                <li key={e.id} className="flex justify-between gap-3 border-b border-[var(--border)] py-2">
                  <span>
                    {formatDate(e.expenseDate)} · {e.category}
                    {e.comment ? ` — ${e.comment}` : ''}
                  </span>
                  <span className="font-medium">{formatCurrency(e.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/expenses" className="mt-3 inline-block text-sm text-brand-500 hover:underline">
            Open Money Movements
          </Link>
        </Card>
      ) : null}

      {tab === 'maintenance' ? (
        <Card
          title="Maintenance history"
          action={
            <Link to="/maintenance" className="text-sm text-brand-500 hover:underline">
              Open Maintenance
            </Link>
          }
        >
          <p className="mb-3 text-sm text-[var(--text-muted)]">
            Total unit maintenance:{' '}
            <span className="font-semibold text-rose-600">
              {formatCurrency(profile.maintenanceTotal || 0)}
            </span>
          </p>
          {(profile.maintenance || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No maintenance records for this unit.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Cost</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.maintenance.map((m) => (
                    <tr key={m.id} className="border-b border-[var(--border)]/60">
                      <td className="py-2 font-medium">{m.subject}</td>
                      <td className="py-2">{formatDate(m.workDate)}</td>
                      <td className="py-2 text-rose-600">{formatCurrency(m.amount)}</td>
                      <td className="py-2">
                        <Badge status={m.status}>{String(m.status || '').replace(/_/g, ' ')}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'documents' ? (
        <Card
          title="Documents"
          action={<Button onClick={() => setDocOpen(true)}>Upload</Button>}
        >
          {(profile.documents || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No documents attached yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {profile.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-2">
                  <div>
                    <p className="font-medium">{d.originalName || d.filename}</p>
                    <p className="text-[var(--text-muted)]">
                      {d.category?.replace(/_/g, ' ')} · {formatDate(d.createdAt)}
                    </p>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}${String(d.url || '').replace(/^\/api\/v1/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-500 hover:underline"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === 'activity' ? (
        <Card title="Activity">
          {(profile.activity || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No activity recorded yet.</p>
          ) : (
            <ol className="space-y-4">
              {profile.activity.map((a) => (
                <li key={a.id} className="border-l-2 border-brand-500 pl-4">
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDate(a.createdAt)} · {a.actor}
                  </p>
                  <p className="text-sm font-medium text-[var(--text)]">{a.summary}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ) : null}

      {tab === 'bookings' ? (
        <Card title="Guest bookings">
          {(profile.bookings || []).length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No bookings yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {profile.bookings.map((b) => (
                <li key={b.id} className="flex justify-between gap-2 border-b border-[var(--border)] py-2">
                  <span>
                    {b.fullName} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)}
                  </span>
                  <span>{formatCurrency(b.totalAmount)} · {b.paymentStatus || b.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {/* Modals */}
      <Modal
        open={payOpen}
        onClose={() => !saving && setPayOpen(false)}
        title="Record payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPayOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={savePayment} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Month" type="month" value={payForm.month} onChange={(e) => setPayForm({ ...payForm, month: e.target.value })} />
          <Input label="Rent due" type="number" value={payForm.rentDue} onChange={(e) => setPayForm({ ...payForm, rentDue: e.target.value })} />
          <Input label="Other charges (this month)" type="number" value={payForm.otherCharges} onChange={(e) => setPayForm({ ...payForm, otherCharges: e.target.value })} />
          <Input label="Total due (auto)" value={String(payTotalDue)} readOnly />
          <Input label="Amount paid" type="number" value={payForm.amountPaid} onChange={(e) => setPayForm({ ...payForm, amountPaid: e.target.value })} />
          <Input label="Payment date" type="date" value={payForm.paymentDate} onChange={(e) => setPayForm({ ...payForm, paymentDate: e.target.value })} />
          <Select label="Method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Input label="Reference / comment" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={chargeOpen}
        onClose={() => !saving && setChargeOpen(false)}
        title="Add other charge"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setChargeOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveCharge} disabled={saving}>{saving ? 'Saving…' : 'Add charge'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Category" value={chargeForm.category} onChange={(e) => setChargeForm({ ...chargeForm, category: e.target.value })}>
            {CHARGE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input label="Amount due" type="number" value={chargeForm.amountDue} onChange={(e) => setChargeForm({ ...chargeForm, amountDue: e.target.value })} />
          <Input className="sm:col-span-2" label="Description" value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} placeholder="e.g. October electricity" />
          <Input label="Amount paid now" type="number" value={chargeForm.amountPaid} onChange={(e) => setChargeForm({ ...chargeForm, amountPaid: e.target.value })} />
          <Input label="Charge date" type="date" value={chargeForm.chargeDate} onChange={(e) => setChargeForm({ ...chargeForm, chargeDate: e.target.value })} />
          <Input label="Billing month" type="month" value={chargeForm.month} onChange={(e) => setChargeForm({ ...chargeForm, month: e.target.value })} />
          <Input label="Notes" value={chargeForm.notes} onChange={(e) => setChargeForm({ ...chargeForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={Boolean(chargePay)}
        onClose={() => !saving && setChargePay(null)}
        title="Record charge payment"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setChargePay(null)} disabled={saving}>Cancel</Button>
            <Button onClick={saveChargePayment} disabled={saving}>{saving ? 'Saving…' : 'Save payment'}</Button>
          </div>
        }
      >
        {chargePay ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Charge" value={chargePay.description} readOnly />
            <Input label="Balance" value={formatCurrency(chargePay.balance)} readOnly />
            <Input label="Amount paid now" type="number" value={chargePayAmount} onChange={(e) => setChargePayAmount(e.target.value)} />
          </div>
        ) : null}
      </Modal>

      <Modal
        onClose={() => !saving && setTermOpen(false)}
        title="Terminate lease"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTermOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={terminateLease} disabled={saving}>{saving ? 'Terminating…' : 'Confirm termination'}</Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          This ends the active lease but keeps all payments, tenant history, and documents. The unit will become available for a new lease.
        </p>
        <div className="grid gap-4">
          <Input label="Termination date" type="date" value={termForm.leaseEnd} onChange={(e) => setTermForm({ ...termForm, leaseEnd: e.target.value })} />
          <Input label="Reason / comment" value={termForm.reason} onChange={(e) => setTermForm({ ...termForm, reason: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={renewOpen}
        onClose={() => !saving && setRenewOpen(false)}
        title="Renew lease"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRenewOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={renewLease} disabled={saving}>{saving ? 'Saving…' : 'Renew'}</Button>
          </div>
        }
      >
        <p className="mb-4 text-sm text-[var(--text-muted)]">
          The current lease term is closed and kept in history. A new active lease is created with the details below.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="New start" type="date" value={renewForm.leaseStart} onChange={(e) => setRenewForm({ ...renewForm, leaseStart: e.target.value })} />
          <Input label="New end" type="date" value={renewForm.leaseEnd} onChange={(e) => setRenewForm({ ...renewForm, leaseEnd: e.target.value })} />
          <Input label="Monthly rent" type="number" value={renewForm.monthlyRent} onChange={(e) => setRenewForm({ ...renewForm, monthlyRent: e.target.value })} />
          <Input label="Security deposit" type="number" value={renewForm.securityDeposit} onChange={(e) => setRenewForm({ ...renewForm, securityDeposit: e.target.value })} />
          <Input className="sm:col-span-2" label="Notes" value={renewForm.notes} onChange={(e) => setRenewForm({ ...renewForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={leaseOpen}
        onClose={() => !saving && setLeaseOpen(false)}
        title="Create lease"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setLeaseOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={createLease} disabled={saving}>{saving ? 'Saving…' : 'Create lease'}</Button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Business / tenant name" value={leaseForm.businessName} onChange={(e) => setLeaseForm({ ...leaseForm, businessName: e.target.value })} />
          <Input label="Contact name" value={leaseForm.contactName} onChange={(e) => setLeaseForm({ ...leaseForm, contactName: e.target.value })} />
          <Input label="Phone" value={leaseForm.phone} onChange={(e) => setLeaseForm({ ...leaseForm, phone: e.target.value })} />
          <Input label="ID / license" value={leaseForm.idNumber} onChange={(e) => setLeaseForm({ ...leaseForm, idNumber: e.target.value })} />
          <Input label="Monthly rent" type="number" value={leaseForm.monthlyRent} onChange={(e) => setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })} />
          <Input label="Security deposit" type="number" value={leaseForm.securityDeposit} onChange={(e) => setLeaseForm({ ...leaseForm, securityDeposit: e.target.value })} />
          <Input label="Lease start" type="date" value={leaseForm.leaseStart} onChange={(e) => setLeaseForm({ ...leaseForm, leaseStart: e.target.value })} />
          <Input label="Lease end" type="date" value={leaseForm.leaseEnd} onChange={(e) => setLeaseForm({ ...leaseForm, leaseEnd: e.target.value })} />
          <Select label="Payment frequency" value={leaseForm.paymentFrequency} onChange={(e) => setLeaseForm({ ...leaseForm, paymentFrequency: e.target.value })}>
            <option value="MONTHLY">Monthly</option>
            <option value="QUARTERLY">Quarterly</option>
            <option value="YEARLY">Yearly</option>
          </Select>
          <Input label="Grace period (days)" type="number" value={leaseForm.gracePeriodDays} onChange={(e) => setLeaseForm({ ...leaseForm, gracePeriodDays: e.target.value })} />
          <Input className="sm:col-span-2" label="Notes" value={leaseForm.notes} onChange={(e) => setLeaseForm({ ...leaseForm, notes: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={docOpen}
        onClose={() => !saving && setDocOpen(false)}
        title="Upload document"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDocOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={uploadDoc} disabled={saving}>{saving ? 'Uploading…' : 'Upload'}</Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <Select label="Category" value={docForm.category} onChange={(e) => setDocForm({ ...docForm, category: e.target.value })}>
            {DOC_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <Input label="Notes" value={docForm.notes} onChange={(e) => setDocForm({ ...docForm, notes: e.target.value })} />
          <Input label="File" type="file" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} />
        </div>
      </Modal>
    </div>
  );
}
