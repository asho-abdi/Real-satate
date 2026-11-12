# HOLD / ARCHIVED backend modules

## public-houdo-souk

Former `modules/public` catalog API for the Houdo Souk marketing site.

Not mounted in `src/routes/index.js`. Keep for restore; do not delete without approval.

## reports-repository.js

Former `modules/reports/repository.js` — legacy Prisma models (`invoice`, `payment`, `lease`, …) not in current schema.

Only referenced by unmounted `modules/reports/service.js` + `reports.routes.js`. Live reports API is `modules/reports/routes.js`.
