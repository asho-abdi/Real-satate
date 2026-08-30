export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Property Rentals';

export const UNIT_TYPES = [
  'Commercial Shop',
  'Apartment',
  'Studio Apartment',
  '1 Bedroom',
  '2 Bedroom',
  '3 Bedroom',
];

export const UNIT_STATUSES = ['Available', 'Occupied', 'Reserved'];

/** Admin chooses how each room is used — not tied to a building. */
export const UNIT_USAGES = [
  { label: 'Commercial shop', value: 'shop' },
  { label: 'Residential apartment', value: 'apartment' },
  { label: 'Guest / Airbnb', value: 'guest' },
];

export const PAYMENT_METHODS = ['Cash', 'E-besa'];

export const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Partial'];

export const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Occupied: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  Reserved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Unpaid: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  Partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  CheckedIn: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  CheckedOut: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
};

export const NAV_SECTIONS = [
  {
    title: 'Home',
    items: [{ label: 'Dashboard', to: '/dashboard', icon: 'MdDashboard' }],
  },
  {
    title: 'Setup',
    items: [
      { label: 'Buildings', to: '/buildings', icon: 'MdBusiness' },
      { label: 'Availability', to: '/rooms', icon: 'MdDoorFront' },
    ],
  },
  {
    title: 'Rentals',
    items: [
      { label: 'Guest Bookings', to: '/bookings', icon: 'MdHotel' },
      { label: 'Apartments', to: '/apartments', icon: 'MdApartment' },
      { label: 'Shops', to: '/shops', icon: 'MdStorefront' },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Payments', to: '/payments', icon: 'MdPayments' },
      { label: 'Outstanding', to: '/outstanding', icon: 'MdWarningAmber' },
      { label: 'Reports', to: '/reports', icon: 'MdAnalytics' },
    ],
  },
  {
    title: 'Account',
    items: [{ label: 'Settings', to: '/settings', icon: 'MdSettings' }],
  },
];
