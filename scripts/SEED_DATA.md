# Demo Seed Data Guide

This file explains the fake data loaded by [`scripts/seed.sql`](seed.sql) so your team knows what to click during the pitch.

## How to load (or reload) seed data

**Option A — Supabase SQL Editor (recommended):**
1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/ashhludptczpogtwmzvd/sql/new)
2. Paste the entire contents of `scripts/seed.sql`
3. Click **Run**

The script is **safe to re-run** — it clears old demo data first.

**Option B — Verify from terminal:**
```bash
npm run seed
```

---

## Customers (4)

| Customer | Property Type | Demo Purpose |
|----------|---------------|--------------|
| **Riverside Office Park** | Office Park | Customer portal view; open invoice with extra work |
| **Summit Retail Center** | Retail Center | Profitable contract (costs < revenue) |
| **Harbor View HOA** | HOA | Partial payment; pending extra work quote |
| **Metro Industrial Complex** | Industrial | 90+ days overdue — AR aging headline |

---

## Contracts (4 active seasonal agreements)

| Contract | Monthly Fee | Visits/Week | Key Story |
|----------|-------------|-------------|-----------|
| Riverside Grounds Maintenance | $2,400 | 2 | Approved mulch extra work ($1,850) |
| Summit Retail Landscape Care | $3,200 | 3 | Strong profitability |
| Harbor View HOA Common Areas | $1,800 | 1 | Storm cleanup quote pending approval |
| Metro Industrial Grounds | $4,500 | 2 | High crew costs → low margin |

---

## Service Visits (7)

- **3 completed** visits with labor/materials/equipment costs logged
- **3 scheduled** visits (tomorrow and this week) — use Crew Lead view to mark complete
- Metro visit has **$815 in costs** — drives low profitability on that contract

---

## Invoices (5)

| Invoice | Customer | Amount | Status | Demo Purpose |
|---------|----------|--------|--------|--------------|
| INV-0001 | Riverside | $2,400 | Paid | Show payment history |
| INV-0002 | Riverside | $4,250 | Sent (overdue) | Recurring + extra work line items; customer can Pay Now |
| INV-0003 | Summit | $3,200 | Paid | Clean paid example |
| INV-0004 | Metro | $4,500 | Overdue | **90+ day AR aging bucket** |
| INV-0005 | Harbor View | $1,800 | Sent ($900 paid) | Partial payment — $900 balance remaining |

---

## Where to click in the app

| Page | What you'll see |
|------|-----------------|
| **Dashboard** | 4 active contracts, outstanding balance ~$10,450 |
| **Contracts → Riverside** | Structured terms, included services, approved mulch extra work |
| **Visits** | Completed visits with costs; scheduled visits to mark complete |
| **Invoices → INV-0002** | $2,400 recurring + $1,850 extra work = $4,250 |
| **AR Aging** | Metro in 90+ bucket; Riverside in 31–60 bucket |
| **Profitability** | Summit strong margin; Metro weak/negative margin |
| **Customer view** | Switch role → Riverside's open invoice → Pay Now |

---

## Customer portal note

When you switch to **View as: Customer**, you see **Riverside Office Park** only (customer ID `11111111-1111-1111-1111-111111111101`).
