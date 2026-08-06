# Property Rentals (Simple)

Clean rental system for **two buildings** — shops, apartments, and guest house.

## Run

```bash
# Terminal 1 — API
npm run dev:backend

# Terminal 2 — UI
npm run dev:frontend
```

Login: `admin@estateops.com` / `Admin@12345`

API: `http://localhost:5000` · UI: `http://localhost:5173`

## Workflows

- **Setup:** Buildings → Floors → Rooms (monthly rent only; daily = monthly ÷ 30)
- **Guest booking:** Building → Floor → Room → Guest → Dates → Auto total
- **Apartments / Shops:** Register → Monthly payment calendar (Paid / Unpaid / Partial)
- **Payments:** Cash or E-besa

## Menu

Dashboard · Buildings · Rooms · New Booking · Guest Bookings · Apartments · Shops · Payments · Outstanding · Reports · Settings
