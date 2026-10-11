# Loan Management System — Backend

API for the **Full-Stack LMS Assignment** (MERN · Next.js · TypeScript).

Borrowers apply for loans; internal executives manage them through Sales → Sanction → Disbursement → Collection. This repo is the **Node.js + Express + TypeScript** API with MongoDB, JWT auth, server-side BRE, and RBAC.

Frontend: sibling repo **`lms-frontend`**.

| | |
|--|--|
| **App** | https://creditsea.duckdns.org |
| **API** | https://creditsea.duckdns.org/api/v1 |
| **Health** | https://creditsea.duckdns.org/api/v1/health |

> **Test on production:** Use the seeded accounts below — password: `Password123!` — already in the live DB.

---

## Further reading

| Doc | Description |
|-----|-------------|
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Production deploy — Oracle VM, Nginx, PM2, GitHub Actions |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | System design — layers, auth/RBAC, lifecycle, storage |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 20+ |
| Framework | Express.js + TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Storage | Local disk or OCI Object Storage (salary slips) |

---

## Setup

### Prerequisites

- Node.js 20+
- MongoDB (local) **or** MongoDB Atlas
- npm

### Install and run

```bash
git clone https://github.com/chaitanya07422/lms-backend.git
git clone https://github.com/chaitanya07422/lms-frontend.git

cd lms-backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

| | |
|--|--|
| API base | `http://localhost:4000/api/v1` |
| Health | `http://localhost:4000/api/v1/health` |

Edit `.env` before starting. **Never commit `.env`.** See [`.env.example`](./.env.example).

### Environment (minimum)

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lms_dev
CORS_ORIGIN=http://localhost:3000
TRUST_PROXY=false
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=12
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=20
STORAGE_DRIVER=local
UPLOADS_DIR=./uploads
MAX_UPLOAD_BYTES=5242880
```

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | Local or Atlas connection string |
| `CORS_ORIGIN` | Frontend origin (e.g. `http://localhost:3000`) |
| `JWT_SECRET` | Long random string for signing tokens |
| `STORAGE_DRIVER` | `local` (default) or `oci` |
| `MAX_UPLOAD_BYTES` | Salary-slip limit (5 MB per assignment) |

For Atlas: put the `mongodb+srv://…` URI in `MONGODB_URI` and allow your IP in Atlas Network Access.

### Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Hot-reload API |
| `npm run build` / `npm start` | Production build & run |
| `npm run seed` | Create one demo account per role |
| `npm run typecheck` / `npm run lint` / `npm test` | Quality checks |

---

## Login credentials (seed)

Password for **all** accounts below:

```text
Password123!
```

| Role | Email | Access |
|------|-------|--------|
| Admin | `admin@creditsea.local` | All ops modules |
| Sales | `sales@creditsea.local` | Sales only |
| Sanction | `sanction@creditsea.local` | Sanction only |
| Disbursement | `disbursement@creditsea.local` | Disbursement only |
| Collection | `collection@creditsea.local` | Collection only |
| Borrower | `borrower@creditsea.local` | Borrower portal only |

After local setup, run `npm run seed` once. Borrowers can also **register** a new account from the UI.

---

## What this API implements (assignment map)

### Borrower journey

1. **Auth** — register / login; passwords hashed with bcrypt; JWT on protected routes  
2. **Personal details + BRE (server)** — Full name, PAN, DOB, monthly salary, employment mode  
   - Reject if age ∉ 23–50, salary &lt; ₹25,000, invalid PAN, or Unemployed  
3. **Salary slip** — PDF / JPG / PNG, max 5 MB  
4. **Loan config & apply** — amount ₹50,000–₹5,00,000; tenure 30–365 days; interest **12% p.a.**  
   - Simple interest: `SI = (P × R × T) / (365 × 100)` · Total = P + SI  
   - Apply → status **APPLIED**

### Operations dashboard APIs

| Module | Role | Behaviour |
|--------|------|-----------|
| **Sales** | sales, admin | Leads: registered users who have not applied |
| **Sanction** | sanction, admin | Review APPLIED → approve (**SANCTIONED**) or reject + reason (**REJECTED**) |
| **Disbursement** | disbursement, admin | SANCTIONED → **DISBURSED** |
| **Collection** | collection, admin | Record payment (unique **UTR**, amount, date). When paid = total repayment → **CLOSED** |

### RBAC

Roles: `admin` · `sales` · `sanction` · `disbursement` · `collection` · `borrower`  

- Each executive role can call **only** its module routes  
- Admin can call **all** ops routes  
- Borrowers **cannot** call `/ops/**`  
- Enforced in middleware (`authenticate` + `authorize`) — not UI-only  

### Loan status flow

```text
APPLIED → SANCTIONED → DISBURSED → CLOSED
       ↘ REJECTED
```

---

## Quick API check

```bash
curl -sS http://localhost:4000/api/v1/health

curl -sS -X POST http://localhost:4000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@creditsea.local","password":"Password123!"}'
```

Use `Authorization: Bearer <token>` on protected routes.

---

## Project layout

```text
lms-backend/
├── src/
│   ├── routes/ · controllers/ · services/ · models/
│   ├── middleware/          # JWT + RBAC + upload + errors
│   ├── bre/                 # Business Rule Engine
│   ├── storage/             # local / OCI salary slips
│   └── utils/money.ts       # Simple-interest (paise)
├── scripts/seed.ts
├── docs/
├── .env.example
└── package.json
```

---

## Production

| | |
|--|--|
| App | https://creditsea.duckdns.org |
| API | https://creditsea.duckdns.org/api/v1 |
| Health | https://creditsea.duckdns.org/api/v1/health |

Hosted on Oracle Cloud VM + Nginx + PM2 + Atlas + OCI.

Details → **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**
