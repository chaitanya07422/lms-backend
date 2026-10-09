# LMS Backend

Loan Management System API — Node.js, Express, TypeScript, MongoDB (Mongoose), JWT, Zod.

Product requirements and design live in [`docs/`](./docs/).

Sibling frontend repository: `lms-frontend`.

---

## Prerequisites

- Node.js 20+
- npm
- MongoDB (local or Atlas)
- Git

## Setup and Run

```bash
cd lms-backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API base: `http://localhost:4000/api/v1`

## Environment Configuration

Copy `.env.example` → `.env`. Never commit secrets.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Hot-reload API |
| `npm run build` / `npm start` | Production build & run |
| `npm run typecheck` / `npm run lint` / `npm test` | Quality checks |
| `npm run seed` | Create one demo user per role |

## Seed Accounts

Password for all: `Password123!`

| Role | Email |
|------|-------|
| admin | `admin@lms.local` |
| sales | `sales@lms.local` |
| sanction | `sanction@lms.local` |
| disbursement | `disbursement@lms.local` |
| collection | `collection@lms.local` |
| borrower | `borrower@lms.local` |

## Implemented APIs

**Auth**
- `POST /auth/register` · `POST /auth/login` · `GET /auth/me`
- `POST /ops/admin/users` — admin creates any role

**Borrower**
- `PUT /borrowers/me/profile` — personal details + BRE
- `POST /borrowers/me/bre/check` — dry-run BRE
- `POST /borrowers/me/salary-slip` · `GET /borrowers/me/salary-slip/latest`
- `GET /salary-slips/:id/download`
- `POST /loans/preview` · `POST /loans/apply` · `GET /loans/me` · `GET /loans/me/:loanId`

**Salary-slip storage:** `STORAGE_DRIVER=local` (default disk) or `oci` (Oracle Object Storage). See `.env.example`.

Full contract: [`docs/05-api-design.md`](./docs/05-api-design.md).

## Deployment Overview

Oracle Cloud Ubuntu + PM2 + Nginx later (needs approval). See [`docs/02-architecture.md`](./docs/02-architecture.md).
