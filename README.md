# Real Estate Management System

Enterprise real estate SaaS with a **React + Vite** frontend and a **Node/Express + Prisma** backend.

## Repository

Remote: [https://github.com/asho-abdi/Real-satate](https://github.com/asho-abdi/Real-satate)

## Stack

- **Frontend:** React + Vite + JavaScript (`frontend/`) — EstateOps UI
- **Backend:** Express + Prisma + PostgreSQL + JavaScript (`backend/`)
- **Docs:** `docs/`

## Project structure

```
├── frontend/   # React + Vite app
├── backend/    # Express + Prisma API
└── docs/       # Documentation
```

## Quick start

### 1) Backend (Prisma)

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL to your PostgreSQL database

npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev:backend
```

- API: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/health`
- Docs: [backend/README.md](backend/README.md) · [docs/backend-api.md](docs/backend-api.md)
- Seed admin: `admin@estateops.com` / `Admin@12345`

### 2) Frontend

```bash
npm run dev:frontend
```

- App: `http://localhost:5173`
- Login (after seed): `admin@estateops.com` / `Admin@12345`

## Backend capabilities

JWT auth (access + refresh), RBAC roles/permissions, full CRUD modules, pagination/search/filter/sort, Multer uploads, Excel/PDF report exports, audit logs, Helmet/CORS/rate limiting.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `ACCOUNTANT`, `CUSTOMER`
