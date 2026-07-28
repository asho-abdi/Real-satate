export type OccupancyStatus = "Occupied" | "Vacant" | "Fit-Out" | "Under Review";
export type ContractStatus = "Active" | "Negotiation" | "Expiring" | "Ended";
export type SpaceType = "Shop" | "Office" | "Business Suite";

export type CommercialSpaceRecord = {
  id: string;
  code: string;
  building: string;
  floor: string;
  spaceType: SpaceType;
  businessName: string;
  businessCategory: string;
  contactPerson: string;
  phone: string;
  email: string;
  rentAmount: string;
  occupancyStatus: OccupancyStatus;
  contractStatus: ContractStatus;
  leaseAgreement: string;
  contractStart: string;
  contractEnd: string;
  contractDuration: string;
  areaSqm: string;
};

export const occupancyOptions = ["All", "Occupied", "Vacant", "Fit-Out", "Under Review"] as const;
export const contractStatusOptions = ["All", "Active", "Negotiation", "Expiring", "Ended"] as const;
export const spaceTypeOptions = ["Shop", "Office", "Business Suite"] as const;

export const initialCommercialSpaces: CommercialSpaceRecord[] = [
  {
    id: "com-1",
    code: "DP-S01",
    building: "Downtown Plaza",
    floor: "Ground",
    spaceType: "Shop",
    businessName: "Urban Coffee Lab",
    businessCategory: "Food & Beverage",
    contactPerson: "Lina Grant",
    phone: "+1 555-120-8040",
    email: "ops@urbancoffeelab.com",
    rentAmount: "$4,800",
    occupancyStatus: "Occupied",
    contractStatus: "Active",
    leaseAgreement: "Retail lease with service charge rider",
    contractStart: "2026-01-01",
    contractEnd: "2028-12-31",
    contractDuration: "36 months",
    areaSqm: "118",
  },
  {
    id: "com-2",
    code: "DP-402",
    building: "Downtown Plaza",
    floor: "4",
    spaceType: "Office",
    businessName: "Vertex Legal Advisors",
    businessCategory: "Professional Services",
    contactPerson: "Brian Woods",
    phone: "+1 555-894-1200",
    email: "admin@vertexlegal.com",
    rentAmount: "$6,950",
    occupancyStatus: "Occupied",
    contractStatus: "Expiring",
    leaseAgreement: "Office lease with annual escalation clause",
    contractStart: "2024-09-01",
    contractEnd: "2026-08-31",
    contractDuration: "24 months",
    areaSqm: "210",
  },
  {
    id: "com-3",
    code: "HB-B12",
    building: "Harbor Business Center",
    floor: "1",
    spaceType: "Business Suite",
    businessName: "Unassigned",
    businessCategory: "-",
    contactPerson: "-",
    phone: "-",
    email: "-",
    rentAmount: "$3,900",
    occupancyStatus: "Vacant",
    contractStatus: "Negotiation",
    leaseAgreement: "Suite package pending final business approval",
    contractStart: "-",
    contractEnd: "-",
    contractDuration: "12 months",
    areaSqm: "95",
  },
  {
    id: "com-4",
    code: "HB-S08",
    building: "Harbor Business Center",
    floor: "Ground",
    spaceType: "Shop",
    businessName: "Northshore Pharmacy",
    businessCategory: "Healthcare Retail",
    contactPerson: "Sara El-Masry",
    phone: "+1 555-230-7721",
    email: "manager@northshorepharmacy.com",
    rentAmount: "$5,200",
    occupancyStatus: "Fit-Out",
    contractStatus: "Active",
    leaseAgreement: "Retail fit-out agreement with handover schedule",
    contractStart: "2026-05-15",
    contractEnd: "2029-05-14",
    contractDuration: "36 months",
    areaSqm: "124",
  },
];
