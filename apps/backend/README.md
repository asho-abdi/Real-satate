# Property Rentals API

Simple backend for a **2-building** rental system:

| Building | Ground | Floors 1–3 |
| --- | --- | --- |
| **Building 1** | 3 commercial shops | Residential apartments |
| **Building 2** | 2 commercial shops | Guest rooms (studio / 1BR / 2BR / 3BR) |

## Stack

- Node.js + Express (ESM)
- PostgreSQL + Prisma
- JWT access + refresh tokens
- bcrypt (12 rounds)
- Helmet, CORS, rate limiting
- Swagger UI at `/api/docs`

## Quick start

```bash
cp .env.example .env
# Edit DATABASE_URL

npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev
```

| Endpoint | URL |
| --- | --- |
| API base | `http://localhost:5000/api/v1` |
| Health | `http://localhost:5000/health` |
| Swagger | `http://localhost:5000/api/docs` |

## Seed credentials

| Email | Password | Role |
| --- | --- | --- |
| `admin@estateops.com` | `Admin@12345` | `ADMIN` |

Settings seeded: `app.name = Property Rentals`, `currency = USD`.

## API routes (`/api/v1`)

| Mount | Description |
| --- | --- |
| `/auth` | Login, logout, refresh, me, password reset |
| `/buildings` | CRUD buildings |
| `/floors` | List (`?buildingId`), create, patch, delete |
| `/units` | List/filter, create, patch, delete (includes `dailyRent`) |
| `/bookings` | Guest bookings + check-in / check-out / cancel |
| `/tenants` | Apartment leases |
| `/businesses` | Shop leases |
| `/payments` | Monthly rent payments |
| `/reports` | Dashboard, occupancy, revenue, outstanding, guests, tenants |
| `/settings` | Get all / upsert by key |

### Auth

Send `Authorization: Bearer <accessToken>` on protected routes.

### Rent math

Daily rent is always `monthlyRent / 30` (rounded to 2 decimals). Booking totals use nights × daily rent − discount.

### Unit enums

- **Type:** `COMMERCIAL_SHOP`, `APARTMENT`, `STUDIO_APARTMENT`, `ONE_BEDROOM`, `TWO_BEDROOM`, `THREE_BEDROOM`
- **Usage:** `SHOP`, `APARTMENT`, `GUEST`
- **Status:** `AVAILABLE`, `OCCUPIED`, `RESERVED`

### Reports

- `GET /reports/dashboard` — stats for the simple dashboard
- `GET /reports/occupancy`
- `GET /reports/revenue`
- `GET /reports/outstanding`
- `GET /reports/guests`
- `GET /reports/tenants`

## Response shape

```json
{ "success": true, "data": {} }
```

Errors:

```json
{ "success": false, "error": { "message": "..." } }
```
