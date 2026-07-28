"use client";

import { useMemo, useState } from "react";
import styles from "./commercial-properties.module.css";
import {
  contractStatusOptions,
  initialCommercialSpaces,
  occupancyOptions,
  spaceTypeOptions,
  type CommercialSpaceRecord,
  type ContractStatus,
  type OccupancyStatus,
  type SpaceType,
} from "./commercial-properties-data";

type SpaceForm = {
  code: string;
  building: string;
  floor: string;
  spaceType: SpaceType;
  rentAmount: string;
  occupancyStatus: OccupancyStatus;
  contractStatus: ContractStatus;
  leaseAgreement: string;
  contractDuration: string;
  areaSqm: string;
};

type BusinessForm = {
  businessName: string;
  businessCategory: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd: string;
  rentAmount: string;
  contractDuration: string;
  leaseAgreement: string;
};

export function CommercialPropertiesModule() {
  const [spaces, setSpaces] = useState(initialCommercialSpaces);
  const [search, setSearch] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("All");
  const [contractFilter, setContractFilter] = useState("All");
  const [spaceTypeFilter, setSpaceTypeFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(initialCommercialSpaces[0]?.id ?? "");
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [editingSpaceId, setEditingSpaceId] = useState<string | null>(null);
  const [assigningSpaceId, setAssigningSpaceId] = useState<string | null>(null);
  const [spaceForm, setSpaceForm] = useState<SpaceForm>(getSpaceDefaults());
  const [businessForm, setBusinessForm] = useState<BusinessForm>(getBusinessDefaults());

  const filteredSpaces = useMemo(() => {
    const query = search.trim().toLowerCase();

    return spaces.filter((space) => {
      const matchesSearch = query
        ? Object.values(space).join(" ").toLowerCase().includes(query)
        : true;
      const matchesOccupancy =
        occupancyFilter === "All" || space.occupancyStatus === occupancyFilter;
      const matchesContract =
        contractFilter === "All" || space.contractStatus === contractFilter;
      const matchesType = spaceTypeFilter === "All" || space.spaceType === spaceTypeFilter;

      return matchesSearch && matchesOccupancy && matchesContract && matchesType;
    });
  }, [contractFilter, occupancyFilter, search, spaceTypeFilter, spaces]);

  const selectedSpace =
    spaces.find((space) => space.id === selectedId) ??
    filteredSpaces[0] ??
    spaces[0] ??
    null;

  const summaryCards = useMemo(() => {
    const occupied = spaces.filter((space) => space.occupancyStatus === "Occupied").length;
    const expiring = spaces.filter((space) => space.contractStatus === "Expiring").length;
    const rentRoll = spaces.reduce((sum, space) => sum + parseMoney(space.rentAmount), 0);

    return [
      { label: "Commercial Spaces", value: String(spaces.length), tone: "blue" },
      { label: "Occupied Spaces", value: String(occupied), tone: "green" },
      { label: "Expiring Contracts", value: String(expiring), tone: "amber" },
      { label: "Monthly Rent Roll", value: formatMoney(rentRoll), tone: "purple" },
    ];
  }, [spaces]);

  function openCreateSpace() {
    setEditingSpaceId(null);
    setSpaceForm(getSpaceDefaults());
    setIsSpaceModalOpen(true);
  }

  function openEditSpace(space: CommercialSpaceRecord) {
    setEditingSpaceId(space.id);
    setSpaceForm({
      code: space.code,
      building: space.building,
      floor: space.floor,
      spaceType: space.spaceType,
      rentAmount: space.rentAmount,
      occupancyStatus: space.occupancyStatus,
      contractStatus: space.contractStatus,
      leaseAgreement: space.leaseAgreement,
      contractDuration: space.contractDuration,
      areaSqm: space.areaSqm,
    });
    setIsSpaceModalOpen(true);
  }

  function closeSpaceEditor() {
    setIsSpaceModalOpen(false);
    setEditingSpaceId(null);
    setSpaceForm(getSpaceDefaults());
  }

  function submitSpace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const existing = spaces.find((space) => space.id === editingSpaceId);
    const nextRecord: CommercialSpaceRecord = {
      id: editingSpaceId ?? `commercial-${crypto.randomUUID()}`,
      code: spaceForm.code,
      building: spaceForm.building,
      floor: spaceForm.floor,
      spaceType: spaceForm.spaceType,
      businessName: existing?.businessName ?? "Unassigned",
      businessCategory: existing?.businessCategory ?? "-",
      contactPerson: existing?.contactPerson ?? "-",
      phone: existing?.phone ?? "-",
      email: existing?.email ?? "-",
      rentAmount: spaceForm.rentAmount,
      occupancyStatus: spaceForm.occupancyStatus,
      contractStatus: spaceForm.contractStatus,
      leaseAgreement: spaceForm.leaseAgreement,
      contractStart: existing?.contractStart ?? "-",
      contractEnd: existing?.contractEnd ?? "-",
      contractDuration: spaceForm.contractDuration,
      areaSqm: spaceForm.areaSqm,
    };

    setSpaces((current) => {
      if (editingSpaceId === null) {
        return [nextRecord, ...current];
      }

      return current.map((space) => (space.id === editingSpaceId ? nextRecord : space));
    });

    setSelectedId(nextRecord.id);
    closeSpaceEditor();
  }

  function deleteSpace(id: string) {
    setSpaces((current) => {
      const next = current.filter((space) => space.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function openBusinessAssignment(space: CommercialSpaceRecord) {
    setAssigningSpaceId(space.id);
    setSelectedId(space.id);
    setBusinessForm({
      businessName: space.businessName === "Unassigned" ? "" : space.businessName,
      businessCategory: space.businessCategory === "-" ? "" : space.businessCategory,
      contactPerson: space.contactPerson === "-" ? "" : space.contactPerson,
      phone: space.phone === "-" ? "" : space.phone,
      email: space.email === "-" ? "" : space.email,
      contractStart: space.contractStart === "-" ? "" : space.contractStart,
      contractEnd: space.contractEnd === "-" ? "" : space.contractEnd,
      rentAmount: space.rentAmount,
      contractDuration: space.contractDuration,
      leaseAgreement: space.leaseAgreement,
    });
  }

  function submitBusinessAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningSpaceId) {
      return;
    }

    setSpaces((current) =>
      current.map((space) =>
        space.id === assigningSpaceId
          ? {
              ...space,
              businessName: businessForm.businessName || "Unassigned",
              businessCategory: businessForm.businessCategory || "-",
              contactPerson: businessForm.contactPerson || "-",
              phone: businessForm.phone || "-",
              email: businessForm.email || "-",
              contractStart: businessForm.contractStart || "-",
              contractEnd: businessForm.contractEnd || "-",
              rentAmount: businessForm.rentAmount,
              contractDuration: businessForm.contractDuration,
              leaseAgreement: businessForm.leaseAgreement,
              occupancyStatus: businessForm.businessName ? "Occupied" : "Vacant",
              contractStatus: businessForm.businessName ? "Active" : "Negotiation",
            }
          : space,
      ),
    );

    setAssigningSpaceId(null);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Commercial Leasing</span>
          <h1>Commercial Property Module</h1>
          <p>
            Manage shops, offices, and business spaces with business information,
            lease agreements, rent amount, contract duration, and occupancy tracking.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateSpace} type="button">
          Add Commercial Space
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
        <div className={styles.toolbar}>
          <input
            className={styles.searchInput}
            placeholder="Search by space, building, business, or agreement"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className={styles.filters}>
            <FilterSelect
              label="Space Type"
              value={spaceTypeFilter}
              options={["All", ...spaceTypeOptions]}
              onChange={setSpaceTypeFilter}
            />
            <FilterSelect
              label="Occupancy"
              value={occupancyFilter}
              options={[...occupancyOptions]}
              onChange={setOccupancyFilter}
            />
            <FilterSelect
              label="Contract"
              value={contractFilter}
              options={[...contractStatusOptions]}
              onChange={setContractFilter}
            />
          </div>
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <div>
                <span className={styles.panelLabel}>Commercial Register</span>
                <h2>Business spaces, agreements, and occupancy state</h2>
              </div>
              <span className={styles.panelMeta}>{filteredSpaces.length} spaces</span>
            </div>

            <div className={styles.desktopTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Space</th>
                    <th>Business</th>
                    <th>Rent</th>
                    <th>Occupancy</th>
                    <th>Contract</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpaces.map((space) => (
                    <tr
                      key={space.id}
                      className={space.id === selectedSpace?.id ? styles.rowActive : undefined}
                      onClick={() => setSelectedId(space.id)}
                    >
                      <td>
                        <strong>{space.code}</strong>
                        <div className={styles.subtleText}>
                          {space.building} · {space.spaceType} · {space.areaSqm} sqm
                        </div>
                      </td>
                      <td>
                        <strong>{space.businessName}</strong>
                        <div className={styles.subtleText}>{space.businessCategory}</div>
                      </td>
                      <td>{space.rentAmount}</td>
                      <td>{renderBadge(space.occupancyStatus)}</td>
                      <td>{renderBadge(space.contractStatus)}</td>
                      <td>{space.contractDuration}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            className={styles.ghostButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditSpace(space);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className={styles.secondaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openBusinessAssignment(space);
                            }}
                            type="button"
                          >
                            Assign Business
                          </button>
                          <button
                            className={styles.dangerButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteSpace(space.id);
                            }}
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
              {filteredSpaces.map((space) => (
                <article
                  key={space.id}
                  className={`${styles.mobileCard} ${
                    space.id === selectedSpace?.id ? styles.mobileCardActive : ""
                  }`}
                  onClick={() => setSelectedId(space.id)}
                >
                  <div className={styles.mobileHeader}>
                    <div>
                      <strong>{space.code}</strong>
                      <p>{space.building}</p>
                    </div>
                    {renderBadge(space.occupancyStatus)}
                  </div>
                  <div className={styles.mobileGrid}>
                    <div>
                      <span>Business</span>
                      <strong>{space.businessName}</strong>
                    </div>
                    <div>
                      <span>Rent</span>
                      <strong>{space.rentAmount}</strong>
                    </div>
                    <div>
                      <span>Contract</span>
                      <strong>{space.contractStatus}</strong>
                    </div>
                    <div>
                      <span>Duration</span>
                      <strong>{space.contractDuration}</strong>
                    </div>
                  </div>
                  <div className={styles.actionGroup}>
                    <button
                      className={styles.ghostButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditSpace(space);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openBusinessAssignment(space);
                      }}
                      type="button"
                    >
                      Assign Business
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.detailPanel}>
            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Space Details</span>
              <h2>{selectedSpace?.code ?? "No commercial space selected"}</h2>
              {selectedSpace ? (
                <div className={styles.detailGrid}>
                  <DetailItem label="Building" value={selectedSpace.building} />
                  <DetailItem label="Floor" value={selectedSpace.floor} />
                  <DetailItem label="Space Type" value={selectedSpace.spaceType} />
                  <DetailItem label="Area" value={`${selectedSpace.areaSqm} sqm`} />
                  <DetailItem label="Rent Amount" value={selectedSpace.rentAmount} />
                  <DetailItem label="Occupancy" value={selectedSpace.occupancyStatus} badge />
                  <DetailItem label="Contract Status" value={selectedSpace.contractStatus} badge />
                  <DetailItem label="Duration" value={selectedSpace.contractDuration} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Business Information</span>
              <h3>Assigned tenant business</h3>
              {selectedSpace ? (
                <div className={styles.timelineList}>
                  <DetailItem label="Business Name" value={selectedSpace.businessName} />
                  <DetailItem label="Category" value={selectedSpace.businessCategory} />
                  <DetailItem label="Contact Person" value={selectedSpace.contactPerson} />
                  <DetailItem label="Phone" value={selectedSpace.phone} />
                  <DetailItem label="Email" value={selectedSpace.email} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Lease Agreement</span>
              <h3>Contract and occupancy terms</h3>
              {selectedSpace ? (
                <div className={styles.timelineList}>
                  <DetailItem label="Agreement" value={selectedSpace.leaseAgreement} />
                  <DetailItem label="Contract Start" value={selectedSpace.contractStart} />
                  <DetailItem label="Contract End" value={selectedSpace.contractEnd} />
                  <DetailItem label="Duration" value={selectedSpace.contractDuration} />
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </section>

      {isSpaceModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelLabel}>
                  {editingSpaceId ? "Update commercial space" : "Create commercial space"}
                </span>
                <h3>Core commercial space details</h3>
              </div>
              <button className={styles.iconButton} onClick={closeSpaceEditor} type="button">
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitSpace}>
              <FormInput label="Space Code" value={spaceForm.code} onChange={(value) => setSpaceForm((current) => ({ ...current, code: value }))} />
              <FormInput label="Building" value={spaceForm.building} onChange={(value) => setSpaceForm((current) => ({ ...current, building: value }))} />
              <FormInput label="Floor" value={spaceForm.floor} onChange={(value) => setSpaceForm((current) => ({ ...current, floor: value }))} />
              <FormSelect label="Space Type" value={spaceForm.spaceType} options={[...spaceTypeOptions]} onChange={(value) => setSpaceForm((current) => ({ ...current, spaceType: value as SpaceType }))} />
              <FormInput label="Rent Amount" value={spaceForm.rentAmount} onChange={(value) => setSpaceForm((current) => ({ ...current, rentAmount: value }))} />
              <FormInput label="Area (sqm)" value={spaceForm.areaSqm} onChange={(value) => setSpaceForm((current) => ({ ...current, areaSqm: value }))} />
              <FormSelect label="Occupancy Status" value={spaceForm.occupancyStatus} options={["Occupied", "Vacant", "Fit-Out", "Under Review"]} onChange={(value) => setSpaceForm((current) => ({ ...current, occupancyStatus: value as OccupancyStatus }))} />
              <FormSelect label="Contract Status" value={spaceForm.contractStatus} options={["Active", "Negotiation", "Expiring", "Ended"]} onChange={(value) => setSpaceForm((current) => ({ ...current, contractStatus: value as ContractStatus }))} />
              <FormInput label="Contract Duration" value={spaceForm.contractDuration} onChange={(value) => setSpaceForm((current) => ({ ...current, contractDuration: value }))} />
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Lease Agreement</span>
                <textarea
                  rows={4}
                  value={spaceForm.leaseAgreement}
                  onChange={(event) =>
                    setSpaceForm((current) => ({
                      ...current,
                      leaseAgreement: event.target.value,
                    }))
                  }
                />
              </label>

              <div className={styles.modalActions}>
                <button className={styles.ghostButton} onClick={closeSpaceEditor} type="button">
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit">
                  {editingSpaceId ? "Save changes" : "Create space"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningSpaceId !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelLabel}>Business Assignment</span>
                <h3>Assign business and contract information</h3>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setAssigningSpaceId(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitBusinessAssignment}>
              <FormInput label="Business Name" value={businessForm.businessName} onChange={(value) => setBusinessForm((current) => ({ ...current, businessName: value }))} />
              <FormInput label="Business Category" value={businessForm.businessCategory} onChange={(value) => setBusinessForm((current) => ({ ...current, businessCategory: value }))} />
              <FormInput label="Contact Person" value={businessForm.contactPerson} onChange={(value) => setBusinessForm((current) => ({ ...current, contactPerson: value }))} />
              <FormInput label="Phone" value={businessForm.phone} onChange={(value) => setBusinessForm((current) => ({ ...current, phone: value }))} />
              <FormInput label="Email" value={businessForm.email} onChange={(value) => setBusinessForm((current) => ({ ...current, email: value }))} />
              <FormInput label="Contract Start" type="date" value={businessForm.contractStart} onChange={(value) => setBusinessForm((current) => ({ ...current, contractStart: value }))} />
              <FormInput label="Contract End" type="date" value={businessForm.contractEnd} onChange={(value) => setBusinessForm((current) => ({ ...current, contractEnd: value }))} />
              <FormInput label="Rent Amount" value={businessForm.rentAmount} onChange={(value) => setBusinessForm((current) => ({ ...current, rentAmount: value }))} />
              <FormInput label="Contract Duration" value={businessForm.contractDuration} onChange={(value) => setBusinessForm((current) => ({ ...current, contractDuration: value }))} />
              <label className={`${styles.field} ${styles.fullWidth}`}>
                <span>Lease Agreement</span>
                <textarea
                  rows={4}
                  value={businessForm.leaseAgreement}
                  onChange={(event) =>
                    setBusinessForm((current) => ({
                      ...current,
                      leaseAgreement: event.target.value,
                    }))
                  }
                />
              </label>

              <div className={styles.modalActions}>
                <button
                  className={styles.ghostButton}
                  onClick={() => setAssigningSpaceId(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit">
                  Save assignment
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
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
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

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function FormSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.field}>
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

function DetailItem({
  label,
  value,
  badge = false,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      {badge ? renderBadge(value) : <strong>{value}</strong>}
    </div>
  );
}

function renderBadge(value: string) {
  const tone =
    value === "Occupied" || value === "Active"
      ? styles.badgeGreen
      : value === "Vacant" || value === "Negotiation"
        ? styles.badgeBlue
        : value === "Fit-Out" || value === "Expiring" || value === "Under Review"
          ? styles.badgeAmber
          : styles.badgeSlate;

  return <span className={`${styles.badge} ${tone}`}>{value}</span>;
}

function getSpaceDefaults(): SpaceForm {
  return {
    code: "",
    building: "",
    floor: "",
    spaceType: "Shop",
    rentAmount: "",
    occupancyStatus: "Vacant",
    contractStatus: "Negotiation",
    leaseAgreement: "",
    contractDuration: "",
    areaSqm: "",
  };
}

function getBusinessDefaults(): BusinessForm {
  return {
    businessName: "",
    businessCategory: "",
    contactPerson: "",
    phone: "",
    email: "",
    contractStart: "",
    contractEnd: "",
    rentAmount: "",
    contractDuration: "",
    leaseAgreement: "",
  };
}

function parseMoney(value: string) {
  return Number(value.replace(/[^0-9.]/g, "")) || 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
