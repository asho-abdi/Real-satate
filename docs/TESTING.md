# Testing – RJK Realty

## Commands

```bash
cd backend
npm test
```

Runs Node.js built-in test runner against `tests/**/*.js` (unit tests; no production DB writes).

## Test database (integration)

1. Create a separate Postgres database, e.g. `rjk_realty_test`.
2. Set `DATABASE_URL` (or `DATABASE_URL_TEST`) only in a local `.env.test` — never point tests at production.
3. `npx prisma migrate deploy`
4. Add integration suites that import the Express app and hit finance-doc / payment routes with seeded users.

## Priority coverage

| Area | Status |
|------|--------|
| Financial balance math (no double-count) | Unit tests in `tests/financialBalance.test.js` |
| Finance doc building-scope decision | Unit tests in `tests/financeAccess.test.js` |
| MFA secret box | Unit tests in `tests/secretBox.test.js` |
| Full IDOR + PDF + payment flows | Requires test DB (not auto-run against production) |

## Safety

Automated tests must never use the production VPS database or modify live financial records.
