# GreenScape Commercial — Contract-to-Cash System

Commercial landscaping contract engagement and contract-to-cash management app for ACCY 628.

**Tech stack:** Next.js · Supabase · Vercel · GitHub

---

## Quick start (for teammates)

### 1. Clone and install

```bash
git clone https://github.com/ljgalahe/Group_10_Final_Project.git
cd Group_10_Final_Project
git checkout logan   # or your feature branch
npm install
```

### 2. Set up Supabase

1. Open your [Supabase project dashboard](https://supabase.com/dashboard/project/ashhludptczpogtwmzvd)
2. Go to **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (keep private)
3. Copy `.env.local.example` to `.env.local` and fill in the keys:

```bash
cp .env.local.example .env.local
```

### 3. Run database migrations

In Supabase **SQL Editor**, run these files in order:

1. [`supabase/migrations/20260804143000_initial_schema.sql`](supabase/migrations/20260804143000_initial_schema.sql)
2. [`scripts/seed.sql`](scripts/seed.sql)

### 4. Enable email auth (one-time)

In Supabase **Authentication → Providers → Email**, make sure Email is enabled.

The demo login uses `demo@greenscape.com` / `Demo123456!` — it auto-creates on first sign-in.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **Enter Demo System**.

---

## Demo role switcher

After logging in, use the **View as** dropdown in the top navigation to switch between:

| Role | What they see |
|------|---------------|
| **Manager** | Full dashboard, contracts, reports |
| **Accountant** | Invoices, payments, AR aging, profitability |
| **Crew Lead** | Service visits, mark complete |
| **Customer** | Their contracts and invoices (Riverside Office Park) |

No logout required — built for the 15-minute pitch.

---

## Project structure

```
src/
├── app/                  # Pages (URLs)
│   ├── dashboard/        # Role-based home
│   ├── contracts/        # Contract list + detail
│   ├── visits/           # Service visits + costs
│   ├── invoices/         # Billing
│   ├── payments/         # Payment history
│   └── reports/          # AR aging + profitability
├── components/           # Reusable UI
└── lib/                  # Supabase, queries, helpers
supabase/migrations/      # Database schema
scripts/seed.sql          # Demo data
DEMO_SCRIPT.md            # 15-minute pitch walkthrough
```

---

## Deploy to Vercel

1. Push your branch to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
4. Deploy — **only the Vercel project owner can deploy on the free tier**

---

## Team work split (8 people)

| Person | Module |
|--------|--------|
| 1 | Supabase migrations + RLS |
| 2 | Auth + Role Switcher |
| 3 | Contracts pages |
| 4 | Visits + cost entry |
| 5 | Invoice generation |
| 6 | Payments + AR Aging |
| 7 | Profitability dashboard |
| 8 | Seed data + Vercel deploy + UI polish |

Each person works on a **feature branch** and merges when their feature works.

---

## Branch workflow

```bash
git checkout -b your-name-feature
# make changes
git add .
git commit -m "Describe your change"
git push -u origin your-name-feature
```

Do not commit `.env.local` — it contains secrets.
