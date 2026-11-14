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
  Held: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  Returned: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Deducted: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/20',
  Void: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  Available: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Occupied: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  Rented: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  Sold: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/20',
  Reserved: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/20',
  Maintenance: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/20',
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Unpaid: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Partial: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/20',
  Outstanding: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Due: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/20',
  'Check-in': 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  'Check-out': 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/20',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  CheckedIn: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  CheckedOut: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  Confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Cancelled: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Rent: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  'Owner monthly': 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/20',
  'Other charge': 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  'Guest booking': 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  'For Sale': 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/12 dark:text-violet-300 dark:ring-violet-400/20',
  'For Rent': 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  Both: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  'Sale & Rent': 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  'Not Started': 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  'In Progress': 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  'On Hold': 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/12 dark:text-orange-300 dark:ring-orange-400/20',
  Pending: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/12 dark:text-amber-300 dark:ring-amber-400/20',
  Overdue: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Inactive: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  Planned: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  Planning: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  Vacant: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Expired: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Draft: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  Approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/12 dark:text-rose-300 dark:ring-rose-400/20',
  Open: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/12 dark:text-sky-300 dark:ring-sky-400/20',
  Closed: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
  Admin: 'bg-[#eaf0f7] text-[#002b50] ring-[#002b50]/12 dark:bg-[#6b9bd0]/15 dark:text-[#b7cbe2] dark:ring-[#6b9bd0]/25',
  Shop: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/12 dark:text-emerald-300 dark:ring-emerald-400/20',
  Office: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-400/20',
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

export const OFFICE_DEAL_TYPES = [
  { label: 'Sold office', value: 'SALE' },
  { label: 'Rental office', value: 'RENTAL' },
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
      { label: 'Guest Bookings', to: '/bookings', icon: 'MdHotel' },
    ],
  },
  {
    title: 'Commercial Spaces',
    items: [
      { label: 'Commercial Spaces', to: '/commercial-spaces', icon: 'MdStorefront' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Money Movements', to: '/expenses', icon: 'MdSwapHoriz' },
      { label: 'Payments', to: '/payments', icon: 'MdPayments' },
      { label: 'Outstanding', to: '/outstanding', icon: 'MdWarningAmber' },
      { label: 'Security Deposits', to: '/deposits', icon: 'MdAccountBalanceWallet' },
      { label: 'Statements', to: '/statements', icon: 'MdDescription' },
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
