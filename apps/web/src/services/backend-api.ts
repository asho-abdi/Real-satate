const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
};

export type DashboardKpis = {
  totalBuildings: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  residentialTenants: number;
  commercialTenants: number;
  airbnbBookings: number;
  maintenanceRequests: number;
  occupancyRate: number;
};

export type PropertyBootstrap = {
  properties: Array<{ id: string; name: string }>;
  buildings: Array<Record<string, unknown>>;
  floors: Array<Record<string, unknown>>;
  units: Array<Record<string, unknown>>;
  categories: Array<Record<string, unknown>>;
  amenities: Array<Record<string, unknown>>;
  images: Array<Record<string, unknown>>;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || !payload.success) {
    const message = !payload.success ? payload.error.message : "API request failed";
    throw new Error(message);
  }

  return payload.data;
}

export const backendApi = {
  health: () => apiFetch<{ status: string; database: string }>("/health"),
  dashboardKpis: () => apiFetch<DashboardKpis>("/dashboard/kpis"),
  propertyBootstrap: () => apiFetch<PropertyBootstrap>("/bootstrap/property-management"),
  listProperties: () => apiFetch<unknown[]>("/properties"),
  listBuildings: (propertyId?: string) =>
    apiFetch<unknown[]>(
      propertyId ? `/buildings?property_id=${encodeURIComponent(propertyId)}` : "/buildings",
    ),
  listUnits: (params?: { occupancy_mode?: string; status?: string }) => {
    const search = new URLSearchParams();
    if (params?.occupancy_mode) search.set("occupancy_mode", params.occupancy_mode);
    if (params?.status) search.set("status", params.status);
    const suffix = search.toString() ? `?${search}` : "";
    return apiFetch<unknown[]>(`/units${suffix}`);
  },
  listReservations: () => apiFetch<unknown[]>("/reservations"),
  checkInReservation: (id: string) =>
    apiFetch<unknown>(`/reservations/${id}/check-in`, { method: "POST" }),
  checkOutReservation: (id: string) =>
    apiFetch<unknown>(`/reservations/${id}/check-out`, { method: "POST" }),
};
