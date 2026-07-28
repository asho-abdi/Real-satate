export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Checked In"
  | "Checked Out"
  | "Cancelled";

export type CleaningStatus =
  | "Clean"
  | "Dirty"
  | "Cleaning In Progress"
  | "Inspected";

export type AirbnbReservationRecord = {
  id: string;
  reservationCode: string;
  room: string;
  property: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: BookingStatus;
  cleaningStatus: CleaningStatus;
  checkIn: string;
  checkOut: string;
  nights: string;
  amount: string;
  adults: string;
};

export const bookingStatusOptions = [
  "All",
  "Pending",
  "Confirmed",
  "Checked In",
  "Checked Out",
  "Cancelled",
] as const;

export const cleaningStatusOptions = [
  "All",
  "Clean",
  "Dirty",
  "Cleaning In Progress",
  "Inspected",
] as const;

export const calendarDays = [
  { label: "Mon", date: "Jul 28" },
  { label: "Tue", date: "Jul 29" },
  { label: "Wed", date: "Jul 30" },
  { label: "Thu", date: "Jul 31" },
  { label: "Fri", date: "Aug 1" },
  { label: "Sat", date: "Aug 2" },
  { label: "Sun", date: "Aug 3" },
];

export const roomInventory = [
  { room: "MS-101", property: "Marina Suites", availability: "Occupied", cleaningStatus: "Inspected" },
  { room: "MS-204", property: "Marina Suites", availability: "Available", cleaningStatus: "Clean" },
  { room: "HB-301", property: "Harbor Stay", availability: "Arrival Today", cleaningStatus: "Clean" },
  { room: "HB-406", property: "Harbor Stay", availability: "Turnover", cleaningStatus: "Dirty" },
];

export const initialReservations: AirbnbReservationRecord[] = [
  {
    id: "air-1",
    reservationCode: "RSV-10429",
    room: "MS-101",
    property: "Marina Suites",
    guestName: "Claire Watson",
    guestEmail: "claire.watson@example.com",
    guestPhone: "+1 555-210-8034",
    status: "Checked In",
    cleaningStatus: "Inspected",
    checkIn: "2026-07-28",
    checkOut: "2026-08-01",
    nights: "4",
    amount: "$580",
    adults: "2",
  },
  {
    id: "air-2",
    reservationCode: "RSV-10430",
    room: "MS-204",
    property: "Marina Suites",
    guestName: "Luca Moretti",
    guestEmail: "luca.moretti@example.com",
    guestPhone: "+1 555-520-9912",
    status: "Confirmed",
    cleaningStatus: "Clean",
    checkIn: "2026-07-30",
    checkOut: "2026-08-03",
    nights: "4",
    amount: "$640",
    adults: "2",
  },
  {
    id: "air-3",
    reservationCode: "RSV-10431",
    room: "HB-301",
    property: "Harbor Stay",
    guestName: "Fatima Noor",
    guestEmail: "fatima.noor@example.com",
    guestPhone: "+1 555-403-2257",
    status: "Pending",
    cleaningStatus: "Clean",
    checkIn: "2026-08-01",
    checkOut: "2026-08-04",
    nights: "3",
    amount: "$390",
    adults: "1",
  },
  {
    id: "air-4",
    reservationCode: "RSV-10432",
    room: "HB-406",
    property: "Harbor Stay",
    guestName: "David Kim",
    guestEmail: "david.kim@example.com",
    guestPhone: "+1 555-889-1034",
    status: "Checked Out",
    cleaningStatus: "Dirty",
    checkIn: "2026-07-26",
    checkOut: "2026-07-29",
    nights: "3",
    amount: "$455",
    adults: "2",
  },
];
