# Real Estate Management System

Enterprise real estate SaaS with a **React + Vite** frontend and a **Node/Express + Prisma** backend.

## Repository

Remote: [https://github.com/asho-abdi/Real-satate](https://github.com/asho-abdi/Real-satate)

## Stack

- Frontend: React + Vite + JavaScript (`apps/frontend`) — EstateOps UI
- Backend: Express + Prisma + PostgreSQL + JavaScript (`apps/backend`)
- Legacy Next.js UI: `apps/web`
- Legacy Supabase API: `apps/api`
- Shared package: `packages/shared`
- Docs: `docs/`

## Quick start

### 1) Backend (Prisma)

```bash
cp apps/backend/.env.example apps/backend/.env
# Set DATABASE_URL to your PostgreSQL database

npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev:backend
```

- API: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/health`
- Docs: [apps/backend/README.md](apps/backend/README.md) · [docs/backend-api.md](docs/backend-api.md)
- Seed admin: `admin@estateops.com` / `Admin@12345`

### 2) Frontend

```bash
npm run dev:frontend
```

- App: `http://localhost:5173`
- Frontend demo login (mock): `admin@estateops.com` / `password123`

## Backend capabilities

JWT auth (access + refresh), RBAC roles/permissions, full CRUD modules, pagination/search/filter/sort, Multer uploads, Excel/PDF report exports, audit logs, Helmet/CORS/rate limiting.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `ACCOUNTANT`, `CUSTOMER`
