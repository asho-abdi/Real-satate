export const APP_NAME = import.meta.env.VITE_APP_NAME || 'RJK REALTY';

export const UNIT_TYPES = [
  'Commercial Shop',
  'Commercial Office',
  'Apartment',
  'Studio Apartment',
  '1 Bedroom',
  '2 Bedroom',
  '3 Bedroom',
];

/** Display labels — OCCUPIED is shown as Rented */
export const UNIT_STATUSES = ['Available', 'Rented', 'Sold', 'Reserved', 'Maintenance'];

export const TRANSACTION_TYPES = [
  { label: 'For Sale', value: 'FOR_SALE' },
  { label: 'For Rent', value: 'FOR_RENT' },
  { label: 'Sale & Rent', value: 'BOTH' },
];

export const BOOKING_PERIODS = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
];

export const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Cleaning',
  'Utilities',
  'Repairs',
  'Supplies',
  'Security',
  'Marketing',
  'Taxes',
  'Insurance',
  'Other',
];

export const WORK_STATUSES = [
  { label: 'Not Started', value: 'NOT_STARTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'On Hold', value: 'ON_HOLD' },
];

/** Admin chooses how each room is used — not tied to a building. */
export const UNIT_USAGES = [
  { label: 'Commercial shop', value: 'shop' },
  { label: 'Commercial office', value: 'office' },
  { label: 'Residential apartment', value: 'apartment' },
  { label: 'Guest / Airbnb', value: 'guest' },
];

/** Controlled payment methods — do not treat as free text. */
export const PAYMENT_METHODS = [
  'Cash',
  'MPESA – Office Number',
  'Agent – Withdrawal from Office Agent',
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'MPESA – Office Number' },
  { value: 'AGENT', label: 'Agent – Withdrawal from Office Agent' },
];

export const PAYMENT_STATUSES = ['Paid', 'Unpaid', 'Partial'];

export const STATUS_COLORS = {
  Available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Occupied: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  Rented: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  Sold: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  Reserved: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Maintenance: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  Paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Unpaid: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  Partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Outstanding: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  Due: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  'Check-in': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  'Check-out': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  Active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  CheckedIn: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  CheckedOut: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  Cancelled: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  Rent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  'Owner monthly': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  'Other charge': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'Guest booking': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  'For Sale': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  'For Rent': 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  Both: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  'Sale & Rent': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
  'Not Started': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  'In Progress': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  Completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  'On Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
};

export const MONEY_TXN_TYPES = [
  { label: 'Bank Deposit', value: 'BANK_DEPOSIT' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Cash Withdrawal', value: 'CASH_WITHDRAWAL' },
  { label: 'Currency Exchange', value: 'CURRENCY_EXCHANGE' },
  { label: 'Supplier Payment', value: 'SUPPLIER_PAYMENT' },
  { label: 'Transfer to Another Account', value: 'ACCOUNT_TRANSFER' },
  { label: 'Cash', value: 'CASH' },
  { label: 'Revenue Received', value: 'REVENUE_RECEIVED' },
  { label: 'Property Maintenance', value: 'MAINTENANCE' },
  { label: 'Other', value: 'OTHER' },
];

export const MAINTENANCE_STATUSES = [
  { label: 'Planned', value: 'PLANNED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const PROJECT_STATUSES = [
  { label: 'Planning', value: 'PLANNING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
];

export const DISCOUNT_TYPES = [
  { label: 'Fixed amount', value: 'FIXED' },
  { label: 'Percentage', value: 'PERCENT' },
];

export const SHOP_DEAL_TYPES = [
  { label: 'Sold shop', value: 'SALE' },
  { label: 'Rental shop', value: 'RENTAL' },
];

export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: 'MdDashboard' },
      { label: 'Today', to: '/today', icon: 'MdToday' },
    ],
  },
  {
    title: 'Portfolio',
    items: [
      { label: 'Buildings', to: '/buildings', icon: 'MdBusiness' },
      { label: 'Availability', to: '/availability', icon: 'MdDoorFront' },
      { label: 'Apartments', to: '/apartments', icon: 'MdApartment' },
      { label: 'Shops', to: '/shops', icon: 'MdStorefront' },
      { label: 'Guest Bookings', to: '/bookings', icon: 'MdHotel' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Money Movements', to: '/expenses', icon: 'MdSwapHoriz' },
      { label: 'Payments', to: '/payments', icon: 'MdPayments' },
      { label: 'Outstanding', to: '/outstanding', icon: 'MdWarningAmber' },
      { label: 'Reports', to: '/reports', icon: 'MdAnalytics' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Maintenance', to: '/maintenance', icon: 'MdBuild' },
      { label: 'Working Progress', to: '/work-progress', icon: 'MdConstruction' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users & Access', to: '/users', icon: 'MdManageAccounts' },
      { label: 'Settings', to: '/settings', icon: 'MdSettings' },
    ],
  },
];
