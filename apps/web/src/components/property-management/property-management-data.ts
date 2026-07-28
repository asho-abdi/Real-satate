export type BuildingRecord = {
  id: string;
  name: string;
  property: string;
  manager: string;
  status: "Active" | "Maintenance" | "Archived";
  floors: string;
  units: string;
};

export type FloorRecord = {
  id: string;
  building: string;
  name: string;
  level: string;
  status: "Active" | "Partial" | "Closed";
  units: string;
};

export type UnitRecord = {
  id: string;
  building: string;
  floor: string;
  code: string;
  category: string;
  status: "Occupied" | "Vacant" | "Reserved" | "Maintenance";
  availability: "Immediate" | "In 7 Days" | "In 30 Days" | "Unavailable";
  rate: string;
  images: string;
  amenities: string;
};

export type CategoryRecord = {
  id: string;
  name: string;
  occupancyMode: "Residential" | "Commercial" | "Short-Term";
  baseRate: string;
  description: string;
  status: "Active" | "Draft";
};

export type AmenityRecord = {
  id: string;
  name: string;
  scope: "Building" | "Unit" | "Shared";
  status: "Active" | "Hidden";
  unitsAssigned: string;
};

export type ImageRecord = {
  id: string;
  title: string;
  building: string;
  unit: string;
  category: "Exterior" | "Interior" | "Amenity" | "Floor Plan";
  status: "Published" | "Draft";
  url: string;
};

export const tabLabels = {
  buildings: "Buildings",
  floors: "Floors",
  units: "Units",
  categories: "Unit Categories",
  amenities: "Amenities",
  images: "Images",
} as const;

export type ModuleTab = keyof typeof tabLabels;

export const buildingStatusOptions = ["All", "Active", "Maintenance", "Archived"] as const;
export const floorStatusOptions = ["All", "Active", "Partial", "Closed"] as const;
export const unitStatusOptions = ["All", "Occupied", "Vacant", "Reserved", "Maintenance"] as const;
export const availabilityOptions = ["All", "Immediate", "In 7 Days", "In 30 Days", "Unavailable"] as const;
export const categoryModeOptions = ["All", "Residential", "Commercial", "Short-Term"] as const;
export const amenityScopeOptions = ["All", "Building", "Unit", "Shared"] as const;
export const imageStatusOptions = ["All", "Published", "Draft"] as const;

export const initialBuildings: BuildingRecord[] = [
  {
    id: "bld-1",
    name: "Skyline Tower A",
    property: "Skyline Heights",
    manager: "Mariam Yusuf",
    status: "Active",
    floors: "18",
    units: "132",
  },
  {
    id: "bld-2",
    name: "Harbor View Plaza",
    property: "Harbor Point",
    manager: "David Brown",
    status: "Maintenance",
    floors: "10",
    units: "64",
  },
  {
    id: "bld-3",
    name: "Marina Suites West",
    property: "Marina Suites",
    manager: "Aisha Kareem",
    status: "Active",
    floors: "12",
    units: "88",
  },
];

export const initialFloors: FloorRecord[] = [
  {
    id: "flr-1",
    building: "Skyline Tower A",
    name: "Floor 12",
    level: "12",
    status: "Active",
    units: "8",
  },
  {
    id: "flr-2",
    building: "Skyline Tower A",
    name: "Floor 15",
    level: "15",
    status: "Partial",
    units: "6",
  },
  {
    id: "flr-3",
    building: "Harbor View Plaza",
    name: "Floor 3",
    level: "3",
    status: "Closed",
    units: "5",
  },
];

export const initialUnits: UnitRecord[] = [
  {
    id: "unt-1",
    building: "Skyline Tower A",
    floor: "Floor 12",
    code: "A-1204",
    category: "2 Bedroom Deluxe",
    status: "Occupied",
    availability: "Unavailable",
    rate: "$1,850",
    images: "8",
    amenities: "5",
  },
  {
    id: "unt-2",
    building: "Skyline Tower A",
    floor: "Floor 15",
    code: "A-1502",
    category: "Studio Executive",
    status: "Vacant",
    availability: "Immediate",
    rate: "$1,200",
    images: "6",
    amenities: "4",
  },
  {
    id: "unt-3",
    building: "Marina Suites West",
    floor: "Floor 7",
    code: "MW-0708",
    category: "Short-Stay Premium",
    status: "Reserved",
    availability: "In 7 Days",
    rate: "$145 / night",
    images: "12",
    amenities: "7",
  },
  {
    id: "unt-4",
    building: "Harbor View Plaza",
    floor: "Floor 3",
    code: "HVP-305",
    category: "Commercial Corner",
    status: "Maintenance",
    availability: "In 30 Days",
    rate: "$3,600",
    images: "4",
    amenities: "3",
  },
];

export const initialCategories: CategoryRecord[] = [
  {
    id: "cat-1",
    name: "2 Bedroom Deluxe",
    occupancyMode: "Residential",
    baseRate: "$1,850",
    description: "Premium family apartment with balcony.",
    status: "Active",
  },
  {
    id: "cat-2",
    name: "Commercial Corner",
    occupancyMode: "Commercial",
    baseRate: "$3,600",
    description: "Retail-ready commercial unit with storefront access.",
    status: "Active",
  },
  {
    id: "cat-3",
    name: "Short-Stay Premium",
    occupancyMode: "Short-Term",
    baseRate: "$145 / night",
    description: "Furnished hospitality-ready unit for short stays.",
    status: "Draft",
  },
];

export const initialAmenities: AmenityRecord[] = [
  {
    id: "amn-1",
    name: "Rooftop Pool",
    scope: "Building",
    status: "Active",
    unitsAssigned: "132",
  },
  {
    id: "amn-2",
    name: "Smart Lock",
    scope: "Unit",
    status: "Active",
    unitsAssigned: "44",
  },
  {
    id: "amn-3",
    name: "Coworking Lounge",
    scope: "Shared",
    status: "Hidden",
    unitsAssigned: "88",
  },
];

export const initialImages: ImageRecord[] = [
  {
    id: "img-1",
    title: "Skyline Lobby Hero",
    building: "Skyline Tower A",
    unit: "A-1204",
    category: "Interior",
    status: "Published",
    url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img-2",
    title: "Harbor Exterior Sunset",
    building: "Harbor View Plaza",
    unit: "HVP-305",
    category: "Exterior",
    status: "Draft",
    url: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "img-3",
    title: "Marina Suite Floor Plan",
    building: "Marina Suites West",
    unit: "MW-0708",
    category: "Floor Plan",
    status: "Published",
    url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=600&q=80",
  },
];
