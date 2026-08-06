/** Static notifications only — all rental data comes from the API. */

export const simpleNotifications = [
  {
    id: 'n1',
    title: 'Welcome',
    message: 'Add your buildings under Setup, then register rooms with the usage you need.',
    time: new Date().toISOString(),
    read: false,
  },
];

export function getSimpleDashboardStats() {
  return {
    totalBuildings: 0,
    totalRooms: 0,
    occupiedRooms: 0,
    availableRooms: 0,
    currentGuests: 0,
    currentTenants: 0,
    commercialShops: 0,
    monthlyRevenue: 0,
    outstandingPayments: 0,
    todayCheckIns: 0,
    todayCheckOuts: 0,
  };
}

export const simpleBuildings = [];
export const simpleFloors = [];
export const simpleRooms = [];
export const simpleTenants = [];
export const simpleBusinesses = [];
export const simpleBookings = [];
export const simpleMonthlyPayments = [];
