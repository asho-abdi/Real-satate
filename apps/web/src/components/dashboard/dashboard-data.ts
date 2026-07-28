export type Kpi = {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  note: string;
};

export type OccupancyPoint = {
  month: string;
  occupied: number;
  vacant: number;
};

export type RevenuePoint = {
  month: string;
  value: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  category: "lease" | "payment" | "maintenance" | "reservation";
};

export type QuickAction = {
  title: string;
  description: string;
  accent: string;
};

export const dashboardKpis: Kpi[] = [
  { label: "Total Buildings", value: "128", change: "+6.2%", trend: "up", note: "Across all active properties" },
  { label: "Total Units", value: "4,860", change: "+3.8%", trend: "up", note: "Residential, commercial, and short-term" },
  { label: "Occupied Units", value: "4,142", change: "+5.1%", trend: "up", note: "Active leases and current stays" },
  { label: "Vacant Units", value: "718", change: "-2.7%", trend: "down", note: "Available or offline inventory" },
  { label: "Residential Tenants", value: "3,286", change: "+4.4%", trend: "up", note: "Active long-term residents" },
  { label: "Commercial Tenants", value: "412", change: "+1.5%", trend: "up", note: "Registered business occupancies" },
  { label: "Airbnb Bookings", value: "246", change: "+12.9%", trend: "up", note: "Confirmed bookings this month" },
  { label: "Monthly Revenue", value: "$482,900", change: "+8.6%", trend: "up", note: "Collected and booked this month" },
  { label: "Annual Revenue", value: "$5.74M", change: "+11.2%", trend: "up", note: "Rolling twelve-month performance" },
  { label: "Maintenance Requests", value: "93", change: "-9.4%", trend: "down", note: "Open and in-progress tasks" },
  { label: "Occupancy Rate", value: "85.2%", change: "+2.1%", trend: "up", note: "Occupied units over available stock" },
];

export const occupancySeries: OccupancyPoint[] = [
  { month: "Jan", occupied: 3450, vacant: 980 },
  { month: "Feb", occupied: 3525, vacant: 930 },
  { month: "Mar", occupied: 3615, vacant: 885 },
  { month: "Apr", occupied: 3742, vacant: 831 },
  { month: "May", occupied: 3898, vacant: 792 },
  { month: "Jun", occupied: 4024, vacant: 756 },
  { month: "Jul", occupied: 4142, vacant: 718 },
];

export const revenueSeries: RevenuePoint[] = [
  { month: "Jan", value: 401000 },
  { month: "Feb", value: 419000 },
  { month: "Mar", value: 431500 },
  { month: "Apr", value: 446200 },
  { month: "May", value: 459800 },
  { month: "Jun", value: 471300 },
  { month: "Jul", value: 482900 },
];

export const recentActivities: ActivityItem[] = [
  {
    id: "activity-1",
    title: "New residential lease activated",
    description: "Unit B-1204 at Skyline Heights was assigned to a new tenant with a 12-month contract.",
    time: "12 minutes ago",
    category: "lease",
  },
  {
    id: "activity-2",
    title: "Commercial payment posted",
    description: "A quarterly payment of $14,800 was allocated to the Downtown Plaza commercial invoice.",
    time: "34 minutes ago",
    category: "payment",
  },
  {
    id: "activity-3",
    title: "Urgent maintenance escalated",
    description: "HVAC failure in Building 7 was reassigned to the engineering lead and external vendor.",
    time: "1 hour ago",
    category: "maintenance",
  },
  {
    id: "activity-4",
    title: "Short-term booking confirmed",
    description: "A four-night reservation was confirmed for Marina Suites with prepaid check-in details.",
    time: "2 hours ago",
    category: "reservation",
  },
  {
    id: "activity-5",
    title: "Vacancy converted to occupied",
    description: "Unit C-804 moved from vacant to occupied after final tenant onboarding approval.",
    time: "Today",
    category: "lease",
  },
];

export const quickActions: QuickAction[] = [
  {
    title: "Add Property",
    description: "Register a new property, building, or unit inventory block.",
    accent: "blue",
  },
  {
    title: "Create Lease",
    description: "Start a residential or commercial lease workflow.",
    accent: "green",
  },
  {
    title: "New Booking",
    description: "Create a short-term reservation and assign availability.",
    accent: "purple",
  },
  {
    title: "Log Maintenance",
    description: "Open a maintenance request and assign its priority.",
    accent: "amber",
  },
];

export const portfolioHighlights = [
  { label: "Best Performing Property", value: "Harbor Point Residences" },
  { label: "Highest Occupancy Building", value: "Skyline Tower B" },
  { label: "Top Revenue Segment", value: "Residential Leasing" },
  { label: "Average Resolution Time", value: "18.4 hours" },
];
