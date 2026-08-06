# 15-Minute Pitch Demo Script

Use pre-loaded seed data. Do **not** type forms live — click through existing records.

**Before presenting:** Log in once, then use the role switcher for all perspective changes.

**Canonical Riverside story (use these numbers everywhere):**
- Contract: **2026 Grounds — Riverside Office** at **$4,200/month**
- Extra work: **Mulch Installation — Entrance Beds** at **$2,850** (approved)
- Open invoices: **INV-0331** ($4,200 past due) + **INV-0553** ($2,850 past due)
- Combined open AR for Riverside grounds story: **$7,050**

---

## 1. Manager Dashboard (2 min)

**View as: Manager**

- "GreenScape manages recurring commercial landscaping contracts — office parks, retail centers, HOAs."
- Show dashboard stats: active contracts, outstanding balance, collections.
- "Every contract has structured terms — not a PDF upload — so billing and job costing run automatically."

---

## 2. Structured Contract (2 min)

**Still Manager → Contracts → Riverside Office Park**

- Open **2026 Grounds — Riverside Office**
- Point out: season dates, **$4,200/month**, 2 visits/week, included services
- Scroll to **Extra Work Orders** — mulch install approved at **$2,850**
- "This is work outside the original agreement — quoted, approved, then billed separately."

---

## 3. Crew Operations (1.5 min)

**View as: Crew Lead → Visits**

- Show scheduled vs completed visits (Riverside June completes + weather-rescheduled item)
- Click **Mark Complete** on a scheduled visit (brief live action to prove it works)
- "Crew leads log visits; accountants attach labor, materials, and equipment costs."

---

## 4. Accounting — Costs & Invoicing (2 min)

**View as: Accountant → Visits**

- Show visit costs on Riverside grounds visits (labor / materials / equipment)
- **Invoices** — open **INV-0331** ($4,200 June maintenance) and **INV-0553** ($2,850 mulch)
- "Monthly fee and approved extra work stay as separate invoices so AR aging stays clear."

---

## 5. AR Aging — The Money Slide (2.5 min)

**View as: Accountant → AR Aging**

- "Metro Industrial is deep overdue on older balances."
- "Riverside has **$7,050** open — INV-0331 + INV-0553, both past due since late July."
- "This is the collections view our billing team uses every Monday morning."

---

## 6. Profitability (2 min)

**View as: Accountant → Profitability**

- "Summit Retail: strong margin — revenue exceeds direct visit costs."
- "Riverside Grounds: revenue from $4,200/mo invoices against visit costs on the same contract."
- "Managers use this to decide whether to renegotiate or adjust crew assignments."

---

## 7. Customer Portal (1.5 min)

**View as: Customer** (Riverside Office Park)

- Show Riverside contract at **$4,200/month** and open invoices **INV-0331** / **INV-0553**
- Click **Pay Now (Simulated)** on one open invoice — payment records instantly
- "Customers see only their data — no logout needed to switch back to staff views."

---

## 8. Role Switcher Close (1 min)

- Switch Manager → Accountant → Customer in under 10 seconds
- "The panel can evaluate every role without us logging in and out."
- "Built on Next.js, Supabase, and Vercel — live, secure, and ready to deploy."

---

## Backup talking points if asked

| Question | Answer |
|----------|--------|
| How do you handle change orders? | Extra work orders: quoted → approved → added as a separate invoice (e.g. INV-0553 mulch) |
| Real payments? | Simulated — saved to database per project requirements |
| Security? | Supabase Row Level Security; customers see only their records |
| vs. competitor? | Accounting-first dashboards, instant role switching, landscaping-specific contract fields |
