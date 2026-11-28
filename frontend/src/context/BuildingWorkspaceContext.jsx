import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { rentalApi } from '../services/rentalApi.js';
import { useAuth } from './AuthContext.jsx';
import {
  BUILDING_PROPERTY_TYPES,
  buildingHasFeature,
  normalizePropertyTypes,
  shortBuildingLabel,
} from '../utils/buildingFeatures.js';

const STORAGE_KEY = 'rjk-selected-building-id';

const BuildingWorkspaceContext = createContext(null);

export function BuildingWorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const refreshBuildings = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    if (!isAuthenticated) {
      setBuildings([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await rentalApi.listBuildings();
        if (cancelled) return;
        const mapped = (rows || []).map((b) => ({
          ...b,
          propertyTypes: normalizePropertyTypes(b.propertyTypes),
        }));
        setBuildings(mapped);
        setSelectedBuildingIdState((prev) => {
          if (prev && mapped.some((b) => b.id === prev)) return prev;
          return mapped[0]?.id || '';
        });
      } catch {
        if (!cancelled) setBuildings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, reloadToken]);

  const setSelectedBuildingId = (id) => {
    const next = id || '';
    setSelectedBuildingIdState(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) || null,
    [buildings, selectedBuildingId],
  );

  const value = useMemo(() => {
    // Until a building is selected, do not hide portfolio modules.
    const has = (type) =>
      !selectedBuilding ? true : buildingHasFeature(selectedBuilding, type);
    return {
      buildings,
      loading,
      selectedBuildingId,
      selectedBuilding,
      setSelectedBuildingId,
      refreshBuildings,
      shortLabel: shortBuildingLabel(selectedBuilding),
      hasApartments: has(BUILDING_PROPERTY_TYPES.APARTMENTS),
      hasGuestBookings: has(BUILDING_PROPERTY_TYPES.GUEST_BOOKINGS),
      hasCommercial: has(BUILDING_PROPERTY_TYPES.COMMERCIAL),
      // null when no building → nav shows all feature-tagged items
      hasFeature: selectedBuilding ? has : null,
      BUILDING_PROPERTY_TYPES,
    };
  }, [buildings, loading, selectedBuildingId, selectedBuilding, refreshBuildings]);

  return (
    <BuildingWorkspaceContext.Provider value={value}>
      {children}
    </BuildingWorkspaceContext.Provider>
  );
}

export function useBuildingWorkspace() {
  const ctx = useContext(BuildingWorkspaceContext);
  if (!ctx) {
    throw new Error('useBuildingWorkspace must be used within BuildingWorkspaceProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (e.g. auth pages). */
export function useBuildingWorkspaceOptional() {
  return useContext(BuildingWorkspaceContext);
}
