# 15-Minute Pitch Demo Script

Use pre-loaded seed data. Do **not** type forms live — click through existing records.

**Before presenting:** Log in once, then use the role switcher for all perspective changes.

---

## 1. Manager Dashboard (2 min)

**View as: Manager**

- "GreenScape manages recurring commercial landscaping contracts — office parks, retail centers, HOAs."
- Show dashboard stats: 4 active contracts, outstanding balance, collections.
- "Every contract has structured terms — not a PDF upload — so billing and job costing run automatically."

---

## 2. Structured Contract (2 min)

**Still Manager → Contracts → Riverside Office Park**

- Open **2026 Grounds Maintenance — Riverside**
- Point out: season dates, $2,400/month, 2 visits/week, included services
- Scroll to **Extra Work Orders** — mulch install approved at $1,850
- "This is work outside the original agreement — quoted, approved, then billed separately."

---

## 3. Crew Operations (1.5 min)

**View as: Crew Lead → Visits**

- Show scheduled vs completed visits
- Click **Mark Complete** on a scheduled visit (brief live action to prove it works)
- "Crew leads log visits; accountants attach labor, materials, and equipment costs."

---

## 4. Accounting — Costs & Invoicing (2 min)

**View as: Accountant → Visits**

- Show visit costs on Riverside and Metro contracts
- Go to **Contracts → Riverside → Generate Invoice** (optional brief live action)
- **Invoices** — show INV-0002: $2,400 recurring + $1,850 extra work = $4,250

---

## 5. AR Aging — The Money Slide (2.5 min)

**View as: Accountant → AR Aging**

- "Metro Industrial is 90+ days overdue — $4,500 outstanding since April."
- "Riverside has $4,250 current — due end of June."
- "This is the collections view our billing team uses every Monday morning."

---

## 6. Profitability (2 min)

**View as: Accountant → Profitability**

- "Summit Retail: strong margin — revenue exceeds direct visit costs."
- "Metro Industrial: costs are eating margin because of extended crew time on the pond."
- "Managers use this to decide whether to renegotiate or adjust crew assignments."

---

## 7. Customer Portal (1.5 min)

**View as: Customer**

- Show Riverside contract and open invoice INV-0002
- Click **Pay Now (Simulated)** — payment records instantly
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
| How do you handle change orders? | Extra work orders: quoted → approved → added to next invoice |
| Real payments? | Simulated — saved to database per project requirements |
| Security? | Supabase Row Level Security; customers see only their records |
| vs. competitor? | Accounting-first dashboards, instant role switching, landscaping-specific contract fields |
