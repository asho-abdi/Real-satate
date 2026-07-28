"use client";

import { useMemo, useState } from "react";
import styles from "./residential-apartments.module.css";
import {
  initialApartments,
  leaseStatusOptions,
  occupancyStatusOptions,
  type ApartmentRecord,
  type LeaseStatus,
  type OccupancyStatus,
} from "./residential-apartments-data";

type ApartmentForm = {
  code: string;
  building: string;
  floor: string;
  category: string;
  bedrooms: string;
  bathrooms: string;
  monthlyRent: string;
  occupancyStatus: OccupancyStatus;
  leaseStatus: LeaseStatus;
  securityDeposit: string;
};

type TenantForm = {
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  leaseStart: string;
  leaseEnd: string;
  monthlyRent: string;
  securityDeposit: string;
};

export function ResidentialApartmentsModule() {
  const [apartments, setApartments] = useState(initialApartments);
  const [search, setSearch] = useState("");
  const [occupancyFilter, setOccupancyFilter] = useState("All");
  const [leaseFilter, setLeaseFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(initialApartments[0]?.id ?? "");
  const [isApartmentModalOpen, setIsApartmentModalOpen] = useState(false);
  const [editingApartmentId, setEditingApartmentId] = useState<string | null>(null);
  const [assigningApartmentId, setAssigningApartmentId] = useState<string | null>(null);
  const [apartmentForm, setApartmentForm] = useState<ApartmentForm>(getApartmentDefaults());
  const [tenantForm, setTenantForm] = useState<TenantForm>(getTenantDefaults());

  const filteredApartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return apartments.filter((apartment) => {
      const matchesSearch = query
        ? Object.values(apartment).join(" ").toLowerCase().includes(query)
        : true;
      const matchesOccupancy =
        occupancyFilter === "All" || apartment.occupancyStatus === occupancyFilter;
      const matchesLease = leaseFilter === "All" || apartment.leaseStatus === leaseFilter;

      return matchesSearch && matchesOccupancy && matchesLease;
    });
  }, [apartments, leaseFilter, occupancyFilter, search]);

  const selectedApartment =
    apartments.find((apartment) => apartment.id === selectedId) ??
    filteredApartments[0] ??
    apartments[0] ??
    null;

  const summaryCards = useMemo(() => {
    const occupied = apartments.filter((apartment) => apartment.occupancyStatus === "Occupied").length;
    const expiring = apartments.filter((apartment) => apartment.leaseStatus === "Expiring").length;
    const rentRoll = apartments.reduce((sum, apartment) => sum + parseMoney(apartment.monthlyRent), 0);

    return [
      { label: "Residential Units", value: String(apartments.length), tone: "blue" },
      { label: "Occupied Apartments", value: String(occupied), tone: "green" },
      { label: "Expiring Leases", value: String(expiring), tone: "amber" },
      { label: "Monthly Rent Roll", value: formatMoney(rentRoll), tone: "purple" },
    ];
  }, [apartments]);

  function openCreateApartment() {
    setEditingApartmentId(null);
    setApartmentForm(getApartmentDefaults());
    setIsApartmentModalOpen(true);
  }

  function openEditApartment(apartment: ApartmentRecord) {
    setEditingApartmentId(apartment.id);
    setApartmentForm({
      code: apartment.code,
      building: apartment.building,
      floor: apartment.floor,
      category: apartment.category,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms,
      monthlyRent: apartment.monthlyRent,
      occupancyStatus: apartment.occupancyStatus,
      leaseStatus: apartment.leaseStatus,
      securityDeposit: apartment.securityDeposit,
    });
    setIsApartmentModalOpen(true);
  }

  function closeApartmentEditor() {
    setIsApartmentModalOpen(false);
    setEditingApartmentId(null);
    setApartmentForm(getApartmentDefaults());
  }

  function submitApartment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextRecord: ApartmentRecord = {
      id: editingApartmentId ?? `apt-${crypto.randomUUID()}`,
      code: apartmentForm.code,
      building: apartmentForm.building,
      floor: apartmentForm.floor,
      category: apartmentForm.category,
      bedrooms: apartmentForm.bedrooms,
      bathrooms: apartmentForm.bathrooms,
      monthlyRent: apartmentForm.monthlyRent,
      occupancyStatus: apartmentForm.occupancyStatus,
      leaseStatus: apartmentForm.leaseStatus,
      tenantName:
        editingApartmentId !== null
          ? apartments.find((apartment) => apartment.id === editingApartmentId)?.tenantName ?? "Unassigned"
          : "Unassigned",
      tenantPhone:
        editingApartmentId !== null
          ? apartments.find((apartment) => apartment.id === editingApartmentId)?.tenantPhone ?? "-"
          : "-",
      tenantEmail:
        editingApartmentId !== null
          ? apartments.find((apartment) => apartment.id === editingApartmentId)?.tenantEmail ?? "-"
          : "-",
      leaseStart:
        editingApartmentId !== null
          ? apartments.find((apartment) => apartment.id === editingApartmentId)?.leaseStart ?? "-"
          : "-",
      leaseEnd:
        editingApartmentId !== null
          ? apartments.find((apartment) => apartment.id === editingApartmentId)?.leaseEnd ?? "-"
          : "-",
      securityDeposit: apartmentForm.securityDeposit,
    };

    setApartments((current) => {
      if (editingApartmentId === null) {
        return [nextRecord, ...current];
      }

      return current.map((apartment) =>
        apartment.id === editingApartmentId ? nextRecord : apartment,
      );
    });

    setSelectedId(nextRecord.id);
    closeApartmentEditor();
  }

  function deleteApartment(id: string) {
    setApartments((current) => {
      const next = current.filter((apartment) => apartment.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function openAssignment(apartment: ApartmentRecord) {
    setAssigningApartmentId(apartment.id);
    setSelectedId(apartment.id);
    setTenantForm({
      tenantName: apartment.tenantName === "Unassigned" ? "" : apartment.tenantName,
      tenantPhone: apartment.tenantPhone === "-" ? "" : apartment.tenantPhone,
      tenantEmail: apartment.tenantEmail === "-" ? "" : apartment.tenantEmail,
      leaseStart: apartment.leaseStart === "-" ? "" : apartment.leaseStart,
      leaseEnd: apartment.leaseEnd === "-" ? "" : apartment.leaseEnd,
      monthlyRent: apartment.monthlyRent,
      securityDeposit: apartment.securityDeposit,
    });
  }

  function submitAssignment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningApartmentId) {
      return;
    }

    setApartments((current) =>
      current.map((apartment) =>
        apartment.id === assigningApartmentId
          ? {
              ...apartment,
              tenantName: tenantForm.tenantName || "Unassigned",
              tenantPhone: tenantForm.tenantPhone || "-",
              tenantEmail: tenantForm.tenantEmail || "-",
              leaseStart: tenantForm.leaseStart || "-",
              leaseEnd: tenantForm.leaseEnd || "-",
              monthlyRent: tenantForm.monthlyRent,
              securityDeposit: tenantForm.securityDeposit,
              occupancyStatus: tenantForm.tenantName ? "Occupied" : "Vacant",
              leaseStatus: tenantForm.tenantName ? "Active" : "Draft",
            }
          : apartment,
      ),
    );

    setAssigningApartmentId(null);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Residential Leasing</span>
          <h1>Residential Apartment Module</h1>
          <p>
            Manage long-term rental apartments, monthly rent, occupancy, lease terms,
            and tenant assignment from a dedicated residential operations workspace.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateApartment} type="button">
          Add Apartment
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
            placeholder="Search by apartment, building, tenant, or category"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className={styles.filters}>
            <FilterSelect
              label="Occupancy"
              value={occupancyFilter}
              options={[...occupancyStatusOptions]}
              onChange={setOccupancyFilter}
            />
            <FilterSelect
              label="Lease Status"
              value={leaseFilter}
              options={[...leaseStatusOptions]}
              onChange={setLeaseFilter}
            />
          </div>
        </div>

        <div className={styles.contentGrid}>
          <section className={styles.tablePanel}>
            <div className={styles.tableHeader}>
              <div>
                <span className={styles.panelLabel}>Apartment Register</span>
                <h2>Long-term rental units with lease and tenant context</h2>
              </div>
              <span className={styles.panelMeta}>{filteredApartments.length} apartments</span>
            </div>

            <div className={styles.desktopTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Apartment</th>
                    <th>Building</th>
                    <th>Rent</th>
                    <th>Occupancy</th>
                    <th>Lease</th>
                    <th>Tenant</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApartments.map((apartment) => (
                    <tr
                      key={apartment.id}
                      className={
                        apartment.id === selectedApartment?.id ? styles.rowActive : undefined
                      }
                      onClick={() => setSelectedId(apartment.id)}
                    >
                      <td>
                        <strong>{apartment.code}</strong>
                        <div className={styles.subtleText}>
                          {apartment.category} · {apartment.bedrooms} Bed / {apartment.bathrooms} Bath
                        </div>
                      </td>
                      <td>{apartment.building}</td>
                      <td>{apartment.monthlyRent}</td>
                      <td>{renderBadge(apartment.occupancyStatus)}</td>
                      <td>{renderBadge(apartment.leaseStatus)}</td>
                      <td>{apartment.tenantName}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            className={styles.ghostButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditApartment(apartment);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className={styles.secondaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openAssignment(apartment);
                            }}
                            type="button"
                          >
                            Assign Tenant
                          </button>
                          <button
                            className={styles.dangerButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteApartment(apartment.id);
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
              {filteredApartments.map((apartment) => (
                <article
                  key={apartment.id}
                  className={`${styles.mobileCard} ${
                    apartment.id === selectedApartment?.id ? styles.mobileCardActive : ""
                  }`}
                  onClick={() => setSelectedId(apartment.id)}
                >
                  <div className={styles.mobileHeader}>
                    <div>
                      <strong>{apartment.code}</strong>
                      <p>{apartment.building}</p>
                    </div>
                    {renderBadge(apartment.occupancyStatus)}
                  </div>
                  <div className={styles.mobileGrid}>
                    <div>
                      <span>Monthly Rent</span>
                      <strong>{apartment.monthlyRent}</strong>
                    </div>
                    <div>
                      <span>Lease Status</span>
                      <strong>{apartment.leaseStatus}</strong>
                    </div>
                    <div>
                      <span>Tenant</span>
                      <strong>{apartment.tenantName}</strong>
                    </div>
                    <div>
                      <span>Lease End</span>
                      <strong>{apartment.leaseEnd}</strong>
                    </div>
                  </div>
                  <div className={styles.actionGroup}>
                    <button
                      className={styles.ghostButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditApartment(apartment);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openAssignment(apartment);
                      }}
                      type="button"
                    >
                      Assign Tenant
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.detailPanel}>
            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Apartment Details</span>
              <h2>{selectedApartment?.code ?? "No apartment selected"}</h2>
              {selectedApartment ? (
                <div className={styles.detailGrid}>
                  <DetailItem label="Building" value={selectedApartment.building} />
                  <DetailItem label="Floor" value={selectedApartment.floor} />
                  <DetailItem label="Category" value={selectedApartment.category} />
                  <DetailItem label="Bedrooms" value={selectedApartment.bedrooms} />
                  <DetailItem label="Bathrooms" value={selectedApartment.bathrooms} />
                  <DetailItem label="Monthly Rent" value={selectedApartment.monthlyRent} />
                  <DetailItem
                    label="Occupancy"
                    value={selectedApartment.occupancyStatus}
                    badge
                  />
                  <DetailItem label="Deposit" value={selectedApartment.securityDeposit} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Lease Information</span>
              <h3>Current lease and assignment</h3>
              {selectedApartment ? (
                <div className={styles.timelineList}>
                  <DetailItem label="Lease Status" value={selectedApartment.leaseStatus} badge />
                  <DetailItem label="Lease Start" value={selectedApartment.leaseStart} />
                  <DetailItem label="Lease End" value={selectedApartment.leaseEnd} />
                  <DetailItem label="Tenant" value={selectedApartment.tenantName} />
                  <DetailItem label="Phone" value={selectedApartment.tenantPhone} />
                  <DetailItem label="Email" value={selectedApartment.tenantEmail} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Quick Actions</span>
              <h3>Residential workflows</h3>
              <div className={styles.quickActions}>
                <button
                  className={styles.secondaryButton}
                  onClick={() => selectedApartment && openAssignment(selectedApartment)}
                  type="button"
                >
                  Assign or update tenant
                </button>
                <button
                  className={styles.ghostButton}
                  onClick={() => selectedApartment && openEditApartment(selectedApartment)}
                  type="button"
                >
                  Edit apartment profile
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isApartmentModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelLabel}>
                  {editingApartmentId ? "Update apartment" : "Create apartment"}
                </span>
                <h3>Residential apartment details</h3>
              </div>
              <button className={styles.iconButton} onClick={closeApartmentEditor} type="button">
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitApartment}>
              <FormInput label="Apartment Code" value={apartmentForm.code} onChange={(value) => setApartmentForm((current) => ({ ...current, code: value }))} />
              <FormInput label="Building" value={apartmentForm.building} onChange={(value) => setApartmentForm((current) => ({ ...current, building: value }))} />
              <FormInput label="Floor" value={apartmentForm.floor} onChange={(value) => setApartmentForm((current) => ({ ...current, floor: value }))} />
              <FormInput label="Category" value={apartmentForm.category} onChange={(value) => setApartmentForm((current) => ({ ...current, category: value }))} />
              <FormInput label="Bedrooms" value={apartmentForm.bedrooms} onChange={(value) => setApartmentForm((current) => ({ ...current, bedrooms: value }))} />
              <FormInput label="Bathrooms" value={apartmentForm.bathrooms} onChange={(value) => setApartmentForm((current) => ({ ...current, bathrooms: value }))} />
              <FormInput label="Monthly Rent" value={apartmentForm.monthlyRent} onChange={(value) => setApartmentForm((current) => ({ ...current, monthlyRent: value }))} />
              <FormInput label="Security Deposit" value={apartmentForm.securityDeposit} onChange={(value) => setApartmentForm((current) => ({ ...current, securityDeposit: value }))} />
              <FormSelect
                label="Occupancy Status"
                value={apartmentForm.occupancyStatus}
                options={["Occupied", "Vacant", "Notice", "Maintenance"]}
                onChange={(value) =>
                  setApartmentForm((current) => ({
                    ...current,
                    occupancyStatus: value as OccupancyStatus,
                  }))
                }
              />
              <FormSelect
                label="Lease Status"
                value={apartmentForm.leaseStatus}
                options={["Active", "Expiring", "Draft", "Ended"]}
                onChange={(value) =>
                  setApartmentForm((current) => ({
                    ...current,
                    leaseStatus: value as LeaseStatus,
                  }))
                }
              />

              <div className={styles.modalActions}>
                <button className={styles.ghostButton} onClick={closeApartmentEditor} type="button">
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit">
                  {editingApartmentId ? "Save changes" : "Create apartment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assigningApartmentId !== null && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.panelLabel}>Tenant Assignment</span>
                <h3>Assign tenant and lease details</h3>
              </div>
              <button
                className={styles.iconButton}
                onClick={() => setAssigningApartmentId(null)}
                type="button"
              >
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitAssignment}>
              <FormInput label="Tenant Name" value={tenantForm.tenantName} onChange={(value) => setTenantForm((current) => ({ ...current, tenantName: value }))} />
              <FormInput label="Tenant Phone" value={tenantForm.tenantPhone} onChange={(value) => setTenantForm((current) => ({ ...current, tenantPhone: value }))} />
              <FormInput label="Tenant Email" value={tenantForm.tenantEmail} onChange={(value) => setTenantForm((current) => ({ ...current, tenantEmail: value }))} />
              <FormInput label="Lease Start" type="date" value={tenantForm.leaseStart} onChange={(value) => setTenantForm((current) => ({ ...current, leaseStart: value }))} />
              <FormInput label="Lease End" type="date" value={tenantForm.leaseEnd} onChange={(value) => setTenantForm((current) => ({ ...current, leaseEnd: value }))} />
              <FormInput label="Monthly Rent" value={tenantForm.monthlyRent} onChange={(value) => setTenantForm((current) => ({ ...current, monthlyRent: value }))} />
              <FormInput label="Security Deposit" value={tenantForm.securityDeposit} onChange={(value) => setTenantForm((current) => ({ ...current, securityDeposit: value }))} />

              <div className={styles.modalActions}>
                <button
                  className={styles.ghostButton}
                  onClick={() => setAssigningApartmentId(null)}
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
      : value === "Vacant" || value === "Draft"
        ? styles.badgeBlue
        : value === "Notice" || value === "Expiring" || value === "Maintenance"
          ? styles.badgeAmber
          : styles.badgeSlate;

  return <span className={`${styles.badge} ${tone}`}>{value}</span>;
}

function getApartmentDefaults(): ApartmentForm {
  return {
    code: "",
    building: "",
    floor: "",
    category: "",
    bedrooms: "",
    bathrooms: "",
    monthlyRent: "",
    occupancyStatus: "Vacant",
    leaseStatus: "Draft",
    securityDeposit: "",
  };
}

function getTenantDefaults(): TenantForm {
  return {
    tenantName: "",
    tenantPhone: "",
    tenantEmail: "",
    leaseStart: "",
    leaseEnd: "",
    monthlyRent: "",
    securityDeposit: "",
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
