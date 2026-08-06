# Demo Seed Data Guide

Large commercial landscaping demo for GreenScape.

```bash
npm run seed:generate   # rebuild scripts/seed.sql
# Then paste seed.sql into Supabase SQL Editor (or use apply-seed if configured)
npm run seed            # verify row counts
```

Clear browser `localStorage` keys starting with `greenscape-` after reseeding.

## Company scale

| Fact | Detail |
|------|--------|
| Founded | Spring 2024 |
| Crews | **8** — A–E = **10** people each; F–H = **5** each (**65** field staff) |
| Season | Mar–Nov full crews; winter = leads + year-round techs (leaf blow / shop / irrigation winterize) |
| Hours | ~**40 h/week**; busy season alternate weeks ~**50 h** OT |
| Sites | **~28** commercial accounts (Oxford / North MS) |
| Equipment | **42** assets with realistic unit-of-production lives & salvage |
| Margins | Visit costs sized so contribution margins land ~**10–35%** (thin industrials lower; strong retail/office higher) — not ~90% |

## Portal note

**View as: Customer** still uses Riverside (`11111111-1111-1111-1111-111111111101`).
