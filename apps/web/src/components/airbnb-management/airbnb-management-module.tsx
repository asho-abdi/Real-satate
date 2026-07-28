"use client";

import { useMemo, useState } from "react";
import styles from "./airbnb-management.module.css";
import {
  bookingStatusOptions,
  calendarDays,
  cleaningStatusOptions,
  initialReservations,
  type AirbnbReservationRecord,
  type BookingStatus,
  type CleaningStatus,
} from "./airbnb-management-data";

type ReservationForm = {
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

const calendarIsoDays = [
  "2026-07-28",
  "2026-07-29",
  "2026-07-30",
  "2026-07-31",
  "2026-08-01",
  "2026-08-02",
  "2026-08-03",
];

export function AirbnbManagementModule() {
  const [reservations, setReservations] = useState(initialReservations);
  const [search, setSearch] = useState("");
  const [bookingFilter, setBookingFilter] = useState("All");
  const [cleaningFilter, setCleaningFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(initialReservations[0]?.id ?? "");
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [reservationForm, setReservationForm] = useState<ReservationForm>(
    getReservationDefaults(),
  );

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesSearch = query
        ? Object.values(reservation).join(" ").toLowerCase().includes(query)
        : true;
      const matchesBooking =
        bookingFilter === "All" || reservation.status === bookingFilter;
      const matchesCleaning =
        cleaningFilter === "All" || reservation.cleaningStatus === cleaningFilter;

      return matchesSearch && matchesBooking && matchesCleaning;
    });
  }, [bookingFilter, cleaningFilter, reservations, search]);

  const selectedReservation =
    reservations.find((reservation) => reservation.id === selectedId) ??
    filteredReservations[0] ??
    reservations[0] ??
    null;

  const summaryCards = useMemo(() => {
    const arrivals = reservations.filter(
      (reservation) =>
        reservation.checkIn >= calendarIsoDays[0] &&
        reservation.checkIn <= calendarIsoDays[calendarIsoDays.length - 1],
    ).length;
    const availableRooms = buildRoomAvailability(reservations).filter(
      (room) => room.availability === "Available",
    ).length;
    const dirtyRooms = reservations.filter(
      (reservation) => reservation.cleaningStatus === "Dirty",
    ).length;

    return [
      { label: "Reservations", value: String(reservations.length), tone: "blue" },
      { label: "Available Rooms", value: String(availableRooms), tone: "green" },
      { label: "Arrivals This Week", value: String(arrivals), tone: "amber" },
      { label: "Dirty Rooms", value: String(dirtyRooms), tone: "purple" },
    ];
  }, [reservations]);

  const roomAvailability = useMemo(() => buildRoomAvailability(reservations), [reservations]);

  function openCreateReservation() {
    setEditingReservationId(null);
    setReservationForm(getReservationDefaults());
    setIsReservationModalOpen(true);
  }

  function openEditReservation(reservation: AirbnbReservationRecord) {
    setEditingReservationId(reservation.id);
    setReservationForm({ ...reservation });
    setIsReservationModalOpen(true);
  }

  function closeReservationModal() {
    setIsReservationModalOpen(false);
    setEditingReservationId(null);
    setReservationForm(getReservationDefaults());
  }

  function submitReservation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextRecord: AirbnbReservationRecord = {
      id: editingReservationId ?? `airbnb-${crypto.randomUUID()}`,
      ...reservationForm,
    };

    setReservations((current) => {
      if (editingReservationId === null) {
        return [nextRecord, ...current];
      }

      return current.map((reservation) =>
        reservation.id === editingReservationId ? nextRecord : reservation,
      );
    });

    setSelectedId(nextRecord.id);
    closeReservationModal();
  }

  function deleteReservation(id: string) {
    setReservations((current) => {
      const next = current.filter((reservation) => reservation.id !== id);
      if (selectedId === id) {
        setSelectedId(next[0]?.id ?? "");
      }
      return next;
    });
  }

  function checkInReservation(id: string) {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: "Checked In", cleaningStatus: "Inspected" }
          : reservation,
      ),
    );
  }

  function checkOutReservation(id: string) {
    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === id
          ? { ...reservation, status: "Checked Out", cleaningStatus: "Dirty" }
          : reservation,
      ),
    );
  }

  function cycleCleaningStatus(id: string) {
    const order: CleaningStatus[] = [
      "Dirty",
      "Cleaning In Progress",
      "Clean",
      "Inspected",
    ];

    setReservations((current) =>
      current.map((reservation) => {
        if (reservation.id !== id) {
          return reservation;
        }

        const currentIndex = order.indexOf(reservation.cleaningStatus);
        const nextStatus = order[(currentIndex + 1) % order.length];
        return { ...reservation, cleaningStatus: nextStatus };
      }),
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Short-Term Operations</span>
          <h1>Airbnb Management Module</h1>
          <p>
            Manage reservations, guest registration, booking operations, check-in,
            check-out, cleaning status, and room availability from one hospitality
            dashboard.
          </p>
        </div>
        <button className={styles.primaryButton} onClick={openCreateReservation} type="button">
          Register Guest Booking
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
            placeholder="Search by reservation, guest, room, or property"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={styles.filters}>
            <FilterSelect
              label="Booking Status"
              value={bookingFilter}
              options={[...bookingStatusOptions]}
              onChange={setBookingFilter}
            />
            <FilterSelect
              label="Cleaning Status"
              value={cleaningFilter}
              options={[...cleaningStatusOptions]}
              onChange={setCleaningFilter}
            />
          </div>
        </div>

        <section className={styles.calendarPanel}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.panelLabel}>Reservation Calendar</span>
              <h2>7-day room occupancy and availability view</h2>
            </div>
          </div>

          <div className={styles.calendarGrid}>
            <div className={styles.calendarHeaderCell}>Room</div>
            {calendarDays.map((day) => (
              <div key={day.date} className={styles.calendarHeaderCell}>
                <strong>{day.label}</strong>
                <span>{day.date}</span>
              </div>
            ))}

            {roomAvailability.map((room) => (
              <FragmentCalendarRow
                key={room.room}
                room={room.room}
                property={room.property}
                reservations={reservations.filter((reservation) => reservation.room === room.room)}
              />
            ))}
          </div>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.tablePanel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.panelLabel}>Booking Management</span>
                <h2>Guest registration, booking lifecycle, and operational actions</h2>
              </div>
              <span className={styles.panelMeta}>{filteredReservations.length} bookings</span>
            </div>

            <div className={styles.desktopTableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reservation</th>
                    <th>Guest</th>
                    <th>Stay</th>
                    <th>Status</th>
                    <th>Cleaning</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className={
                        reservation.id === selectedReservation?.id ? styles.rowActive : undefined
                      }
                      onClick={() => setSelectedId(reservation.id)}
                    >
                      <td>
                        <strong>{reservation.reservationCode}</strong>
                        <div className={styles.subtleText}>
                          {reservation.room} · {reservation.property}
                        </div>
                      </td>
                      <td>
                        <strong>{reservation.guestName}</strong>
                        <div className={styles.subtleText}>{reservation.guestEmail}</div>
                      </td>
                      <td>
                        {reservation.checkIn} to {reservation.checkOut}
                        <div className={styles.subtleText}>{reservation.nights} nights</div>
                      </td>
                      <td>{renderBadge(reservation.status)}</td>
                      <td>{renderBadge(reservation.cleaningStatus)}</td>
                      <td>{reservation.amount}</td>
                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            className={styles.ghostButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              openEditReservation(reservation);
                            }}
                            type="button"
                          >
                            Edit
                          </button>
                          <button
                            className={styles.secondaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              checkInReservation(reservation.id);
                            }}
                            type="button"
                          >
                            Check-in
                          </button>
                          <button
                            className={styles.secondaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              checkOutReservation(reservation.id);
                            }}
                            type="button"
                          >
                            Check-out
                          </button>
                          <button
                            className={styles.secondaryButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              cycleCleaningStatus(reservation.id);
                            }}
                            type="button"
                          >
                            Cleaning
                          </button>
                          <button
                            className={styles.dangerButton}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteReservation(reservation.id);
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
              {filteredReservations.map((reservation) => (
                <article
                  key={reservation.id}
                  className={`${styles.mobileCard} ${
                    reservation.id === selectedReservation?.id ? styles.mobileCardActive : ""
                  }`}
                  onClick={() => setSelectedId(reservation.id)}
                >
                  <div className={styles.mobileHeader}>
                    <div>
                      <strong>{reservation.reservationCode}</strong>
                      <p>
                        {reservation.room} · {reservation.guestName}
                      </p>
                    </div>
                    {renderBadge(reservation.status)}
                  </div>
                  <div className={styles.mobileGrid}>
                    <div>
                      <span>Check-in</span>
                      <strong>{reservation.checkIn}</strong>
                    </div>
                    <div>
                      <span>Check-out</span>
                      <strong>{reservation.checkOut}</strong>
                    </div>
                    <div>
                      <span>Cleaning</span>
                      <strong>{reservation.cleaningStatus}</strong>
                    </div>
                    <div>
                      <span>Amount</span>
                      <strong>{reservation.amount}</strong>
                    </div>
                  </div>
                  <div className={styles.actionGroup}>
                    <button
                      className={styles.ghostButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        openEditReservation(reservation);
                      }}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={(event) => {
                        event.stopPropagation();
                        cycleCleaningStatus(reservation.id);
                      }}
                      type="button"
                    >
                      Cleaning
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className={styles.detailPanel}>
            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Guest Registration</span>
              <h2>{selectedReservation?.guestName ?? "No guest selected"}</h2>
              {selectedReservation ? (
                <div className={styles.detailGrid}>
                  <DetailItem label="Reservation" value={selectedReservation.reservationCode} />
                  <DetailItem label="Room" value={selectedReservation.room} />
                  <DetailItem label="Property" value={selectedReservation.property} />
                  <DetailItem label="Adults" value={selectedReservation.adults} />
                  <DetailItem label="Guest Email" value={selectedReservation.guestEmail} />
                  <DetailItem label="Guest Phone" value={selectedReservation.guestPhone} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Booking Lifecycle</span>
              <h3>Stay operations</h3>
              {selectedReservation ? (
                <div className={styles.timelineList}>
                  <DetailItem label="Booking Status" value={selectedReservation.status} badge />
                  <DetailItem
                    label="Cleaning Status"
                    value={selectedReservation.cleaningStatus}
                    badge
                  />
                  <DetailItem label="Check-in" value={selectedReservation.checkIn} />
                  <DetailItem label="Check-out" value={selectedReservation.checkOut} />
                  <DetailItem label="Nights" value={selectedReservation.nights} />
                  <DetailItem label="Booking Amount" value={selectedReservation.amount} />
                </div>
              ) : null}
            </div>

            <div className={styles.detailSection}>
              <span className={styles.panelLabel}>Room Availability</span>
              <h3>Live room status</h3>
              <div className={styles.roomList}>
                {roomAvailability.map((room) => (
                  <div key={room.room} className={styles.roomCard}>
                    <div>
                      <strong>{room.room}</strong>
                      <p>{room.property}</p>
                    </div>
                    <div className={styles.badgeStack}>
                      {renderBadge(room.availability)}
                      {renderBadge(room.cleaningStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {isReservationModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.panelLabel}>
                  {editingReservationId ? "Update booking" : "Guest registration"}
                </span>
                <h2>Reservation and guest details</h2>
              </div>
              <button
                className={styles.ghostButton}
                onClick={closeReservationModal}
                type="button"
              >
                Close
              </button>
            </div>

            <form className={styles.formGrid} onSubmit={submitReservation}>
              <FormInput
                label="Reservation Code"
                value={reservationForm.reservationCode}
                onChange={(value) =>
                  setReservationForm((current) => ({
                    ...current,
                    reservationCode: value,
                  }))
                }
              />
              <FormInput
                label="Room"
                value={reservationForm.room}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, room: value }))
                }
              />
              <FormInput
                label="Property"
                value={reservationForm.property}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, property: value }))
                }
              />
              <FormInput
                label="Guest Name"
                value={reservationForm.guestName}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, guestName: value }))
                }
              />
              <FormInput
                label="Guest Email"
                value={reservationForm.guestEmail}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, guestEmail: value }))
                }
              />
              <FormInput
                label="Guest Phone"
                value={reservationForm.guestPhone}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, guestPhone: value }))
                }
              />
              <FormSelect
                label="Booking Status"
                value={reservationForm.status}
                options={["Pending", "Confirmed", "Checked In", "Checked Out", "Cancelled"]}
                onChange={(value) =>
                  setReservationForm((current) => ({
                    ...current,
                    status: value as BookingStatus,
                  }))
                }
              />
              <FormSelect
                label="Cleaning Status"
                value={reservationForm.cleaningStatus}
                options={["Clean", "Dirty", "Cleaning In Progress", "Inspected"]}
                onChange={(value) =>
                  setReservationForm((current) => ({
                    ...current,
                    cleaningStatus: value as CleaningStatus,
                  }))
                }
              />
              <FormInput
                label="Check-in"
                type="date"
                value={reservationForm.checkIn}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, checkIn: value }))
                }
              />
              <FormInput
                label="Check-out"
                type="date"
                value={reservationForm.checkOut}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, checkOut: value }))
                }
              />
              <FormInput
                label="Nights"
                value={reservationForm.nights}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, nights: value }))
                }
              />
              <FormInput
                label="Adults"
                value={reservationForm.adults}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, adults: value }))
                }
              />
              <FormInput
                label="Amount"
                value={reservationForm.amount}
                onChange={(value) =>
                  setReservationForm((current) => ({ ...current, amount: value }))
                }
              />

              <div className={styles.modalActions}>
                <button
                  className={styles.ghostButton}
                  onClick={closeReservationModal}
                  type="button"
                >
                  Cancel
                </button>
                <button className={styles.primaryButton} type="submit">
                  {editingReservationId ? "Save booking" : "Register booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function FragmentCalendarRow({
  room,
  property,
  reservations,
}: {
  room: string;
  property: string;
  reservations: AirbnbReservationRecord[];
}) {
  return (
    <>
      <div className={styles.calendarRoomCell}>
        <strong>{room}</strong>
        <span>{property}</span>
      </div>
      {calendarIsoDays.map((day) => {
        const reservation = reservations.find(
          (item) => item.checkIn <= day && item.checkOut > day,
        );

        return (
          <div key={`${room}-${day}`} className={styles.calendarCell}>
            {reservation ? (
              <div className={styles.calendarBooking}>
                <strong>{reservation.guestName}</strong>
                <span>{reservation.status}</span>
              </div>
            ) : (
              <span className={styles.availableSlot}>Available</span>
            )}
          </div>
        );
      })}
    </>
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
    value === "Confirmed" ||
    value === "Checked In" ||
    value === "Clean" ||
    value === "Inspected" ||
    value === "Available"
      ? styles.badgeGreen
      : value === "Pending" ||
          value === "Dirty" ||
          value === "Cleaning In Progress" ||
          value === "Arrival Today" ||
          value === "Turnover"
        ? styles.badgeAmber
        : value === "Checked Out" || value === "Cancelled"
          ? styles.badgeSlate
          : styles.badgeBlue;

  return <span className={`${styles.badge} ${tone}`}>{value}</span>;
}

function getReservationDefaults(): ReservationForm {
  return {
    reservationCode: "",
    room: "",
    property: "",
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    status: "Pending",
    cleaningStatus: "Clean",
    checkIn: "",
    checkOut: "",
    nights: "",
    amount: "",
    adults: "1",
  };
}

function buildRoomAvailability(reservations: AirbnbReservationRecord[]) {
  const byRoom = new Map<
    string,
    {
      room: string;
      property: string;
      availability: string;
      cleaningStatus: string;
      latestCheckOut: string;
    }
  >();

  reservations.forEach((reservation) => {
    const current = byRoom.get(reservation.room);
    const availability =
      reservation.status === "Checked In"
        ? "Occupied"
        : reservation.status === "Checked Out"
          ? "Turnover"
          : reservation.status === "Confirmed" && reservation.checkIn <= "2026-08-01"
            ? "Arrival Today"
            : reservation.status === "Cancelled"
              ? "Available"
              : "Booked";

    if (!current || reservation.checkOut >= current.latestCheckOut) {
      byRoom.set(reservation.room, {
        room: reservation.room,
        property: reservation.property,
        availability,
        cleaningStatus: reservation.cleaningStatus,
        latestCheckOut: reservation.checkOut,
      });
    }
  });

  return Array.from(byRoom.values()).map(({ latestCheckOut, ...room }) => room);
}
