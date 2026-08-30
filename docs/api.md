# Backend API

See [backend-api.md](./backend-api.md) for the full Express + Prisma API reference.

## Architecture

```text
Frontend (frontend/)
    ↓ HTTP /api/v1
Backend (backend/)
    ↓ Prisma
PostgreSQL
```

## Setup

```bash
cp backend/.env.example backend/.env
# Set DATABASE_URL

npm install --legacy-peer-deps
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
npm run dev:backend
```

- API: `http://localhost:5000/api/v1`
- Health: `http://localhost:5000/health`
- Swagger: `http://localhost:5000/api/docs`
