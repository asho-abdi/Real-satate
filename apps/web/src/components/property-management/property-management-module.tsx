"use client";

import { useMemo, useState } from "react";
import styles from "./property-management.module.css";
import {
  availabilityOptions,
  buildingStatusOptions,
  categoryModeOptions,
  floorStatusOptions,
  imageStatusOptions,
  initialAmenities,
  initialBuildings as initialBuildingsData,
  initialCategories as initialCategoriesData,
  initialFloors as initialFloorsData,
  initialImages as initialImagesData,
  initialUnits as initialUnitsData,
  tabLabels,
  unitStatusOptions,
  amenityScopeOptions,
  type AmenityRecord,
  type BuildingRecord,
  type CategoryRecord,
  type FloorRecord,
  type ImageRecord,
  type ModuleTab,
  type UnitRecord,
} from "./property-management-data";

type ModalMode = "create" | "edit";
type FormField = {
  name: string;
  label: string;
  type: "text" | "select" | "textarea" | "url";
  options?: string[];
};

type AnyRecord =
  | BuildingRecord
  | FloorRecord
  | UnitRecord
  | CategoryRecord
  | AmenityRecord
  | ImageRecord;

const defaultTab: ModuleTab = "buildings";
const singularLabels: Record<ModuleTab, string> = {
  buildings: "Building",
  floors: "Floor",
  units: "Unit",
  categories: "Unit Category",
  amenities: "Amenity",
  images: "Image",
};

export function PropertyManagementModule({
  initialBuildings = initialBuildingsData,
  initialFloors = initialFloorsData,
  initialUnits = initialUnitsData,
  initialCategories = initialCategoriesData,
  initialAmenities = initialAmenitiesData,
  initialImages = initialImagesData,
  dataSourceLabel = "Demo data",
}: {
  initialBuildings?: BuildingRecord[];
  initialFloors?: FloorRecord[];
  initialUnits?: UnitRecord[];
  initialCategories?: CategoryRecord[];
  initialAmenities?: AmenityRecord[];
  initialImages?: ImageRecord[];
  dataSourceLabel?: string;
} = {}) {
  const [activeTab, setActiveTab] = useState<ModuleTab>(defaultTab);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [buildingFilter, setBuildingFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [modeFilter, setModeFilter] = useState("All");
  const [scopeFilter, setScopeFilter] = useState("All");
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const [buildings, setBuildings] = useState(initialBuildings);
  const [floors, setFloors] = useState(initialFloors);
  const [units, setUnits] = useState(initialUnits);
  const [categories, setCategories] = useState(initialCategories);
  const [amenities, setAmenities] = useState(initialAmenities);
  const [images, setImages] = useState(initialImages);

  const buildingOptions = useMemo(
    () => ["All", ...new Set(buildings.map((building) => building.name))],
    [buildings],
  );

  const summaryCards = useMemo(
    () => [
      { label: "Buildings", value: String(buildings.length), tone: "blue" },
      { label: "Units", value: String(units.length), tone: "green" },
      {
        label: "Vacant Units",
        value: String(units.filter((unit) => unit.status === "Vacant").length),
        tone: "amber",
      },
      {
        label: "Published Images",
        value: String(images.filter((image) => image.status === "Published").length),
        tone: "purple",
      },
    ],
    [buildings, images, units],
  );

  const dataset = useMemo(() => {
    switch (activeTab) {
      case "buildings":
        return buildings;
      case "floors":
        return floors;
      case "units":
        return units;
      case "categories":
        return categories;
      case "amenities":
        return amenities;
      case "images":
        return images;
      default:
        return buildings;
    }
  }, [activeTab, amenities, buildings, categories, floors, images, units]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dataset.filter((row) => {
      const haystack = Object.values(row).join(" ").toLowerCase();
      if (query && !haystack.includes(query)) {
        return false;
      }

      if (activeTab === "buildings") {
        const record = row as BuildingRecord;
        return statusFilter === "All" || record.status === statusFilter;
      }

      if (activeTab === "floors") {
        const record = row as FloorRecord;
        const matchesStatus = statusFilter === "All" || record.status === statusFilter;
        const matchesBuilding =
          buildingFilter === "All" || record.building === buildingFilter;
        return matchesStatus && matchesBuilding;
      }

      if (activeTab === "units") {
        const record = row as UnitRecord;
        const matchesStatus = statusFilter === "All" || record.status === statusFilter;
        const matchesBuilding =
          buildingFilter === "All" || record.building === buildingFilter;
        const matchesAvailability =
          availabilityFilter === "All" || record.availability === availabilityFilter;
        return matchesStatus && matchesBuilding && matchesAvailability;
      }

      if (activeTab === "categories") {
        const record = row as CategoryRecord;
        const matchesStatus = statusFilter === "All" || record.status === statusFilter;
        const matchesMode = modeFilter === "All" || record.occupancyMode === modeFilter;
        return matchesStatus && matchesMode;
      }

      if (activeTab === "amenities") {
        const record = row as AmenityRecord;
        const matchesStatus = statusFilter === "All" || record.status === statusFilter;
        const matchesScope = scopeFilter === "All" || record.scope === scopeFilter;
        return matchesStatus && matchesScope;
      }

      const record = row as ImageRecord;
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      const matchesBuilding =
        buildingFilter === "All" || record.building === buildingFilter;
      return matchesStatus && matchesBuilding;
    });
  }, [
    activeTab,
    availabilityFilter,
    buildingFilter,
    dataset,
    modeFilter,
    scopeFilter,
    search,
    statusFilter,
  ]);

  const tableColumns = getColumns(activeTab);
  const formFields = getFormFields(activeTab, buildingOptions);

  function resetFilters(nextTab: ModuleTab) {
    setActiveTab(nextTab);
    setSearch("");
    setStatusFilter("All");
    setBuildingFilter("All");
    setAvailabilityFilter("All");
    setModeFilter("All");
    setScopeFilter("All");
  }

  function openCreateModal() {
    setModalMode("create");
    setEditingId(null);
    setFormValues(getDefaultValues(activeTab));
    setIsModalOpen(true);
  }

  function openEditModal(record: AnyRecord) {
    setModalMode("edit");
    setEditingId(record.id);
    setFormValues(recordToFormValues(activeTab, record));
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = buildRecordFromValues(activeTab, formValues, editingId);

    switch (activeTab) {
      case "buildings":
        setBuildings((current) => upsertRecord(current, payload as BuildingRecord, modalMode));
        break;
      case "floors":
        setFloors((current) => upsertRecord(current, payload as FloorRecord, modalMode));
        break;
      case "units":
        setUnits((current) => upsertRecord(current, payload as UnitRecord, modalMode));
        break;
      case "categories":
        setCategories((current) =>
          upsertRecord(current, payload as CategoryRecord, modalMode),
        );
        break;
      case "amenities":
        setAmenities((current) =>
          upsertRecord(current, payload as AmenityRecord, modalMode),
        );
        break;
      case "images":
        setImages((current) => upsertRecord(current, payload as ImageRecord, modalMode));
        break;
      default:
        break;
    }

    closeModal();
  }

  function deleteRecord(id: string) {
    switch (activeTab) {
      case "buildings":
        setBuildings((current) => current.filter((record) => record.id !== id));
        break;
      case "floors":
        setFloors((current) => current.filter((record) => record.id !== id));
        break;
      case "units":
        setUnits((current) => current.filter((record) => record.id !== id));
        break;
      case "categories":
        setCategories((current) => current.filter((record) => record.id !== id));
        break;
      case "amenities":
        setAmenities((current) => current.filter((record) => record.id !== id));
        break;
      case "images":
        setImages((current) => current.filter((record) => record.id !== id));
        break;
      default:
        break;
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Admin Property Operations</span>
          <h1>Property Management Module</h1>
          <p>
            Manage buildings, floors, units, categories, statuses, availability,
            images, and amenities from one responsive admin workspace.
          </p>
          <p className={styles.heroMeta}>Data source: {dataSourceLabel}</p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateModal} type="button">
          Add {singularLabels[activeTab]}
        </button>
      </section>

      <section className={styles.summaryGrid}>
        {summaryCards.map((card) => (
          <article key={card.label} className={`${styles.summaryCard} ${styles[card.tone]}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className={styles.workspace}>
        <div className={styles.tabBar}>
          {(Object.keys(tabLabels) as ModuleTab[]).map((tab) => (
            <button
              key={tab}
              className={tab === activeTab ? styles.tabActive : styles.tabButton}
              onClick={() => resetFilters(tab)}
              type="button"
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder={`Search ${tabLabels[activeTab].toLowerCase()}`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className={styles.filters}>
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={getStatusOptions(activeTab)}
            />
            {(activeTab === "floors" || activeTab === "units" || activeTab === "images") && (
              <FilterSelect
                label="Building"
                value={buildingFilter}
                onChange={setBuildingFilter}
                options={buildingOptions}
              />
            )}
            {activeTab === "units" && (
              <FilterSelect
                label="Availability"
                value={availabilityFilter}
                onChange={setAvailabilityFilter}
                options={[...availabilityOptions]}
              />
            )}
            {activeTab === "categories" && (
              <FilterSelect
                label="Occupancy"
                value={modeFilter}
                onChange={setModeFilter}
                options={[...categoryModeOptions]}
              />
            )}
            {activeTab === "amenities" && (
              <FilterSelect
                label="Scope"
                value={scopeFilter}
                onChange={setScopeFilter}
                options={[...amenityScopeOptions]}
              />
            )}
          </div>
        </div>

        <div className={styles.tablePanel}>
          <div className={styles.tableHeader}>
            <div>
              <span className={styles.panelLabel}>{tabLabels[activeTab]}</span>
              <h2>Searchable, filterable, responsive administration table</h2>
            </div>
            <span className={styles.panelMeta}>{filteredRows.length} records</span>
          </div>

          <div className={styles.desktopTableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {tableColumns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    {tableColumns.map((column) => (
                      <td key={`${row.id}-${column.key}`}>
                        {renderCell(row, column.key)}
                      </td>
                    ))}
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          className={styles.ghostButton}
                          onClick={() => openEditModal(row)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={styles.dangerButton}
                          onClick={() => deleteRecord(row.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.mobileCards}>
            {filteredRows.map((row) => (
              <article key={row.id} className={styles.recordCard}>
                <div className={styles.recordCardTop}>
                  <div>
                    <strong>{getPrimaryLabel(activeTab, row)}</strong>
                    <p>{getSecondaryLabel(activeTab, row)}</p>
                  </div>
                  <div className={styles.badgeWrap}>{getBadge(activeTab, row)}</div>
                </div>
                <div className={styles.recordGrid}>
                  {tableColumns.slice(1).map((column) => (
                    <div key={`${row.id}-mobile-${column.key}`}>
                      <span>{column.label}</span>
                      <strong>{getPlainCellValue(row, column.key)}</strong>
                    </div>
                  ))}
                </div>
                <div className={styles.actionGroup}>
                  <button
                    className={styles.ghostButton}
                    onClick={() => openEditModal(row)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={styles.dangerButton}
                    onClick={() => deleteRecord(row.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelLabel}>
                  {modalMode === "create" ? "Create" : "Update"} {tabLabels[activeTab]}
                </span>
                <h3>{modalMode === "create" ? "Add new record" : "Edit existing record"}</h3>
              </div>
              <button className={styles.iconButton} onClick={closeModal} type="button">
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitForm}>
              {formFields.map((field) => (
                <label
                  key={field.name}
                  className={field.type === "textarea" ? styles.fullWidth : undefined}
                >
                  <span>{field.label}</span>
                  {field.type === "select" ? (
                    <select
                      value={formValues[field.name] ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    >
                      {(field.options ?? []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      rows={4}
                      value={formValues[field.name] ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formValues[field.name] ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.name]: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              ))}

              <div className={styles.modalActions}>
                <button className={styles.ghostButton} onClick={closeModal} type="button">
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit">
                  {modalMode === "create" ? "Create record" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className={styles.filterLabel}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function upsertRecord<T extends { id: string }>(
  current: T[],
  payload: T,
  mode: ModalMode,
) {
  if (mode === "create") {
    return [payload, ...current];
  }

  return current.map((record) => (record.id === payload.id ? payload : record));
}

function getColumns(tab: ModuleTab) {
  switch (tab) {
    case "buildings":
      return [
        { key: "name", label: "Building" },
        { key: "property", label: "Property" },
        { key: "manager", label: "Manager" },
        { key: "status", label: "Status" },
        { key: "floors", label: "Floors" },
        { key: "units", label: "Units" },
      ];
    case "floors":
      return [
        { key: "name", label: "Floor" },
        { key: "building", label: "Building" },
        { key: "level", label: "Level" },
        { key: "status", label: "Status" },
        { key: "units", label: "Units" },
      ];
    case "units":
      return [
        { key: "code", label: "Unit" },
        { key: "building", label: "Building" },
        { key: "floor", label: "Floor" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status" },
        { key: "availability", label: "Availability" },
        { key: "rate", label: "Rate" },
        { key: "images", label: "Images" },
        { key: "amenities", label: "Amenities" },
      ];
    case "categories":
      return [
        { key: "name", label: "Category" },
        { key: "occupancyMode", label: "Occupancy Mode" },
        { key: "baseRate", label: "Base Rate" },
        { key: "status", label: "Status" },
        { key: "description", label: "Description" },
      ];
    case "amenities":
      return [
        { key: "name", label: "Amenity" },
        { key: "scope", label: "Scope" },
        { key: "status", label: "Status" },
        { key: "unitsAssigned", label: "Assigned Units" },
      ];
    case "images":
      return [
        { key: "title", label: "Image" },
        { key: "building", label: "Building" },
        { key: "unit", label: "Unit" },
        { key: "category", label: "Category" },
        { key: "status", label: "Status" },
        { key: "url", label: "Source" },
      ];
    default:
      return [];
  }
}

function getStatusOptions(tab: ModuleTab) {
  switch (tab) {
    case "buildings":
      return [...buildingStatusOptions];
    case "floors":
      return [...floorStatusOptions];
    case "units":
      return [...unitStatusOptions];
    case "categories":
      return ["All", "Active", "Draft"];
    case "amenities":
      return ["All", "Active", "Hidden"];
    case "images":
      return [...imageStatusOptions];
    default:
      return ["All"];
  }
}

function getFormFields(tab: ModuleTab, buildingOptions: string[]): FormField[] {
  switch (tab) {
    case "buildings":
      return [
        { name: "name", label: "Building Name", type: "text" },
        { name: "property", label: "Property", type: "text" },
        { name: "manager", label: "Manager", type: "text" },
        { name: "status", label: "Status", type: "select", options: [...buildingStatusOptions].slice(1) },
        { name: "floors", label: "Floor Count", type: "text" },
        { name: "units", label: "Unit Count", type: "text" },
      ];
    case "floors":
      return [
        { name: "name", label: "Floor Name", type: "text" },
        { name: "building", label: "Building", type: "select", options: buildingOptions.slice(1) },
        { name: "level", label: "Level", type: "text" },
        { name: "status", label: "Status", type: "select", options: [...floorStatusOptions].slice(1) },
        { name: "units", label: "Unit Count", type: "text" },
      ];
    case "units":
      return [
        { name: "code", label: "Unit Code", type: "text" },
        { name: "building", label: "Building", type: "select", options: buildingOptions.slice(1) },
        { name: "floor", label: "Floor", type: "text" },
        { name: "category", label: "Category", type: "text" },
        { name: "status", label: "Unit Status", type: "select", options: [...unitStatusOptions].slice(1) },
        { name: "availability", label: "Availability", type: "select", options: [...availabilityOptions].slice(1) },
        { name: "rate", label: "Rate", type: "text" },
        { name: "images", label: "Image Count", type: "text" },
        { name: "amenities", label: "Amenities Count", type: "text" },
      ];
    case "categories":
      return [
        { name: "name", label: "Category Name", type: "text" },
        { name: "occupancyMode", label: "Occupancy Mode", type: "select", options: [...categoryModeOptions].slice(1) },
        { name: "baseRate", label: "Base Rate", type: "text" },
        { name: "status", label: "Status", type: "select", options: ["Active", "Draft"] },
        { name: "description", label: "Description", type: "textarea" },
      ];
    case "amenities":
      return [
        { name: "name", label: "Amenity Name", type: "text" },
        { name: "scope", label: "Scope", type: "select", options: [...amenityScopeOptions].slice(1) },
        { name: "status", label: "Status", type: "select", options: ["Active", "Hidden"] },
        { name: "unitsAssigned", label: "Assigned Units", type: "text" },
      ];
    case "images":
      return [
        { name: "title", label: "Image Title", type: "text" },
        { name: "building", label: "Building", type: "select", options: buildingOptions.slice(1) },
        { name: "unit", label: "Unit", type: "text" },
        { name: "category", label: "Image Category", type: "select", options: ["Exterior", "Interior", "Amenity", "Floor Plan"] },
        { name: "status", label: "Status", type: "select", options: ["Published", "Draft"] },
        { name: "url", label: "Image URL", type: "url" },
      ];
    default:
      return [];
  }
}

function getDefaultValues(tab: ModuleTab) {
  switch (tab) {
    case "buildings":
      return { name: "", property: "", manager: "", status: "Active", floors: "", units: "" };
    case "floors":
      return { name: "", building: "", level: "", status: "Active", units: "" };
    case "units":
      return {
        code: "",
        building: "",
        floor: "",
        category: "",
        status: "Vacant",
        availability: "Immediate",
        rate: "",
        images: "0",
        amenities: "0",
      };
    case "categories":
      return {
        name: "",
        occupancyMode: "Residential",
        baseRate: "",
        description: "",
        status: "Active",
      };
    case "amenities":
      return { name: "", scope: "Building", status: "Active", unitsAssigned: "0" };
    case "images":
      return {
        title: "",
        building: "",
        unit: "",
        category: "Interior",
        status: "Draft",
        url: "",
      };
    default:
      return {};
  }
}

function recordToFormValues(tab: ModuleTab, record: AnyRecord) {
  switch (tab) {
    case "buildings":
      return { ...(record as BuildingRecord) };
    case "floors":
      return { ...(record as FloorRecord) };
    case "units":
      return { ...(record as UnitRecord) };
    case "categories":
      return { ...(record as CategoryRecord) };
    case "amenities":
      return { ...(record as AmenityRecord) };
    case "images":
      return { ...(record as ImageRecord) };
    default:
      return {};
  }
}

function buildRecordFromValues(
  tab: ModuleTab,
  values: Record<string, string>,
  editingId: string | null,
) {
  const id = editingId ?? `${tab}-${crypto.randomUUID()}`;

  switch (tab) {
    case "buildings":
      return {
        id,
        name: values.name,
        property: values.property,
        manager: values.manager,
        status: values.status as BuildingRecord["status"],
        floors: values.floors,
        units: values.units,
      };
    case "floors":
      return {
        id,
        name: values.name,
        building: values.building,
        level: values.level,
        status: values.status as FloorRecord["status"],
        units: values.units,
      };
    case "units":
      return {
        id,
        code: values.code,
        building: values.building,
        floor: values.floor,
        category: values.category,
        status: values.status as UnitRecord["status"],
        availability: values.availability as UnitRecord["availability"],
        rate: values.rate,
        images: values.images,
        amenities: values.amenities,
      };
    case "categories":
      return {
        id,
        name: values.name,
        occupancyMode: values.occupancyMode as CategoryRecord["occupancyMode"],
        baseRate: values.baseRate,
        description: values.description,
        status: values.status as CategoryRecord["status"],
      };
    case "amenities":
      return {
        id,
        name: values.name,
        scope: values.scope as AmenityRecord["scope"],
        status: values.status as AmenityRecord["status"],
        unitsAssigned: values.unitsAssigned,
      };
    case "images":
      return {
        id,
        title: values.title,
        building: values.building,
        unit: values.unit,
        category: values.category as ImageRecord["category"],
        status: values.status as ImageRecord["status"],
        url: values.url,
      };
    default:
      return { id };
  }
}

function renderCell(row: AnyRecord, key: string) {
  if (key === "status") {
    return getBadgeFromValue(getPlainCellValue(row, key));
  }

  if (key === "availability") {
    return getBadgeFromValue(getPlainCellValue(row, key), "availability");
  }

  if (key === "url") {
    const image = row as ImageRecord;
    return (
      <a href={image.url} rel="noreferrer" target="_blank" className={styles.link}>
        Preview image
      </a>
    );
  }

  return <span>{getPlainCellValue(row, key)}</span>;
}

function getPlainCellValue(row: AnyRecord, key: string) {
  return String((row as Record<string, string>)[key] ?? "");
}

function getPrimaryLabel(tab: ModuleTab, row: AnyRecord) {
  switch (tab) {
    case "buildings":
      return (row as BuildingRecord).name;
    case "floors":
      return (row as FloorRecord).name;
    case "units":
      return (row as UnitRecord).code;
    case "categories":
      return (row as CategoryRecord).name;
    case "amenities":
      return (row as AmenityRecord).name;
    case "images":
      return (row as ImageRecord).title;
    default:
      return row.id;
  }
}

function getSecondaryLabel(tab: ModuleTab, row: AnyRecord) {
  switch (tab) {
    case "buildings":
      return `${(row as BuildingRecord).property} · ${(row as BuildingRecord).manager}`;
    case "floors":
      return `${(row as FloorRecord).building} · Level ${(row as FloorRecord).level}`;
    case "units":
      return `${(row as UnitRecord).building} · ${(row as UnitRecord).category}`;
    case "categories":
      return `${(row as CategoryRecord).occupancyMode} · ${(row as CategoryRecord).baseRate}`;
    case "amenities":
      return `${(row as AmenityRecord).scope} scope · ${(row as AmenityRecord).unitsAssigned} units`;
    case "images":
      return `${(row as ImageRecord).building} · ${(row as ImageRecord).unit}`;
    default:
      return row.id;
  }
}

function getBadge(tab: ModuleTab, row: AnyRecord) {
  if (tab === "units") {
    const unit = row as UnitRecord;
    return (
      <div className={styles.dualBadge}>
        {getBadgeFromValue(unit.status)}
        {getBadgeFromValue(unit.availability, "availability")}
      </div>
    );
  }

  return getBadgeFromValue(getPlainCellValue(row, "status"));
}

function getBadgeFromValue(value: string, variant: "status" | "availability" = "status") {
  const tone =
    value === "Active" ||
    value === "Occupied" ||
    value === "Published" ||
    value === "Immediate"
      ? styles.badgeGreen
      : value === "Maintenance" ||
          value === "Reserved" ||
          value === "Partial" ||
          value === "In 7 Days" ||
          value === "In 30 Days"
        ? styles.badgeAmber
        : value === "Archived" ||
            value === "Closed" ||
            value === "Hidden" ||
            value === "Draft" ||
            value === "Unavailable"
          ? styles.badgeSlate
          : styles.badgeBlue;

  return (
    <span className={`${styles.badge} ${tone} ${variant === "availability" ? styles.badgeThin : ""}`}>
      {value}
    </span>
  );
}
