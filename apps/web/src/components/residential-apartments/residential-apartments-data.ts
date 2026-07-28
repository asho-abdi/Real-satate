export type OccupancyStatus =
  | "Occupied"
  | "Vacant"
  | "Notice"
  | "Maintenance";

export type LeaseStatus = "Active" | "Expiring" | "Draft" | "Ended";

export type ApartmentRecord = {
  id: string;
  code: string;
  building: string;
  floor: string;
  category: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
  occupancyStatus: OccupancyStatus;
  leaseStatus: LeaseStatus;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStart: string;
  leaseEnd: string;
  securityDeposit: string;
};

export const occupancyStatusOptions = [
  "All",
  "Occupied",
  "Vacant",
  "Notice",
  "Maintenance",
] as const;

export const leaseStatusOptions = [
  "All",
  "Active",
  "Expiring",
  "Draft",
  "Ended",
] as const;

export const initialApartments: ApartmentRecord[] = [
  {
    id: "apt-1",
    code: "A-1204",
    building: "Skyline Tower A",
    floor: "12",
    category: "2 Bedroom Deluxe",
    bedrooms: "2",
    bathrooms: "2",
    monthlyRent: "$1,850",
    occupancyStatus: "Occupied",
    leaseStatus: "Active",
    tenantName: "Nadia Hassan",
    tenantPhone: "+1 555-920-1401",
    tenantEmail: "nadia.hassan@example.com",
    leaseStart: "2026-02-01",
    leaseEnd: "2027-01-31",
    securityDeposit: "$1,850",
  },
  {
    id: "apt-2",
    code: "A-1502",
    building: "Skyline Tower A",
    floor: "15",
    category: "Studio Executive",
    bedrooms: "1",
    bathrooms: "1",
    monthlyRent: "$1,200",
    occupancyStatus: "Vacant",
    leaseStatus: "Draft",
    tenantName: "Unassigned",
    tenantPhone: "-",
    tenantEmail: "-",
    leaseStart: "-",
    leaseEnd: "-",
    securityDeposit: "$1,200",
  },
  {
    id: "apt-3",
    code: "M-0806",
    building: "Marina Suites West",
    floor: "8",
    category: "1 Bedroom Waterfront",
    bedrooms: "1",
    bathrooms: "1",
    monthlyRent: "$1,540",
    occupancyStatus: "Notice",
    leaseStatus: "Expiring",
    tenantName: "James Cooper",
    tenantPhone: "+1 555-331-4420",
    tenantEmail: "j.cooper@example.com",
    leaseStart: "2025-09-01",
    leaseEnd: "2026-08-31",
    securityDeposit: "$1,540",
  },
  {
    id: "apt-4",
    code: "H-0403",
    building: "Harbor Point Residences",
    floor: "4",
    category: "3 Bedroom Family",
    bedrooms: "3",
    bathrooms: "2",
    monthlyRent: "$2,200",
    occupancyStatus: "Maintenance",
    leaseStatus: "Ended",
    tenantName: "Unassigned",
    tenantPhone: "-",
    tenantEmail: "-",
    leaseStart: "-",
    leaseEnd: "-",
    securityDeposit: "$2,200",
  },
];
