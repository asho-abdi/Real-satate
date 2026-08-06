# EstateOps Backend API Reference

Base URL: `http://localhost:5000/api/v1`

All protected routes require:

```http
Authorization: Bearer <accessToken>
```

## Authentication

### Login
`POST /auth/login`

```json
{ "email": "admin@estateops.com", "password": "Admin@12345" }
```

### Refresh
`POST /auth/refresh`

```json
{ "refreshToken": "..." }
```

### Logout
`POST /auth/logout`

```json
{ "refreshToken": "..." }
```

### Forgot password
`POST /auth/forgot-password`

```json
{ "email": "admin@estateops.com" }
```

### Reset password
`POST /auth/reset-password`

```json
{ "token": "...", "password": "NewPass@12345" }
```

### Change password
`POST /auth/change-password` (auth)

```json
{ "currentPassword": "...", "newPassword": "..." }
```

### Me
`GET /auth/me` (auth)

## Common list query params

| Param | Description |
| --- | --- |
| `page` | Page number (default 1) |
| `limit` | Page size (default 20, max 100) |
| `search` / `q` | Full-text-ish search fields |
| `sort` | Sort field |
| `order` | `asc` \| `desc` |
| resource filters | e.g. `status`, `city`, `agentId` |

## Resources

| Resource | Base path | Notes |
| --- | --- | --- |
| Users | `/users` | Password hashed; soft deactivate |
| Roles | `/roles` | `PATCH /:id/permissions` |
| Properties | `/properties` | Images upload endpoints |
| Categories | `/categories` | |
| Property types | `/property-types` | Permission resource: `types` |
| Owners | `/owners` | |
| Customers | `/customers` | |
| Agents | `/agents` | |
| Leads | `/leads` | |
| Appointments | `/appointments` | |
| Contracts | `/contracts` | |
| Invoices | `/invoices` | |
| Payments | `/payments` | |
| Expenses | `/expenses` | `POST /:id/approve` |
| Documents | `/documents` | Multipart upload |
| Notifications | `/notifications` | Current user inbox |
| Settings | `/settings` | Key/value upsert |
| Activity logs | `/activity-logs` | Read-only audit trail |
| Reports | `/reports/*` | Stats + Excel/PDF export |

## Property payload (create/update)

```json
{
  "code": "DXB-RES-2001",
  "title": "Downtown Apartment",
  "description": "Bright 2BR with skyline views",
  "categoryId": "<uuid>",
  "typeId": "<uuid>",
  "status": "AVAILABLE",
  "price": 1200000,
  "rentPrice": 85000,
  "bedrooms": 2,
  "bathrooms": 2,
  "kitchens": 1,
  "parking": 1,
  "areaSqm": 110,
  "address": "Downtown Blvd 12",
  "city": "Dubai",
  "country": "UAE",
  "latitude": 25.2,
  "longitude": 55.27,
  "ownerId": "<uuid>",
  "agentId": "<uuid>",
  "amenities": ["Pool", "Gym", "Parking"],
  "featured": true
}
```

### Status enum

`AVAILABLE` | `RESERVED` | `SOLD` | `RENTED` | `UNDER_MAINTENANCE`

## Reports

| Endpoint | Description |
| --- | --- |
| `GET /reports/dashboard` | KPI cards |
| `GET /reports/revenue` | Completed payment revenue series |
| `GET /reports/sales` | Sale contracts |
| `GET /reports/rentals` | Rental contracts |
| `GET /reports/agents` | Agent performance |
| `GET /reports/customers` | Customer statistics |
| `GET /reports/financial` | Invoices / payments / expenses |
| `GET /reports/export/excel?type=revenue` | Excel download |
| `GET /reports/export/pdf?type=dashboard` | PDF download |

## Permissions

Format: `resource:action`

Actions: `create`, `read`, `update`, `delete`, `approve`, `export`

Roles: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `ACCOUNTANT`, `CUSTOMER`
