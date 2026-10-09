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

## Auth API (Phase 2)

- `POST /api/v1/auth/register` — borrower only
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me` — Bearer JWT
- `POST /api/v1/ops/admin/users` — admin creates any role (`email`, `password`, `fullName`, `role`)

Full contract: [`docs/05-api-design.md`](./docs/05-api-design.md).

## Deployment Overview

Oracle Cloud Ubuntu + PM2 + Nginx later (needs approval). See [`docs/02-architecture.md`](./docs/02-architecture.md).
