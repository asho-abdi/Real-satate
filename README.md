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

## Quick start (local)

### 1) Backend (Prisma)

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL to your PostgreSQL database

npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run start:backend
```

- API: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/health`
- Docs: [backend/README.md](backend/README.md) · [docs/backend-api.md](docs/backend-api.md)
- Local seed admin comes from `SEED_ADMIN_*` in `backend/.env` (see `.env.example`)

### 2) Frontend

```bash
npm run dev:frontend
```

- App: `http://localhost:5173`

## Production

Follow **[DEPLOY.md](DEPLOY.md)**:

1. `cp backend/.env.production.example backend/.env` and fill secrets  
2. `npm run prepare:secrets` → paste into `.env`  
3. `npm run prisma:deploy` then production seed  
4. `cp frontend/.env.production.example frontend/.env.production` and build  
5. `npm run start:backend`

## Backend capabilities

JWT auth (access + refresh), RBAC roles/permissions, full CRUD modules, pagination/search/filter/sort, Multer uploads, Excel/PDF report exports, audit logs, Helmet/CORS/rate limiting.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `AGENT`, `ACCOUNTANT`, `CUSTOMER`
