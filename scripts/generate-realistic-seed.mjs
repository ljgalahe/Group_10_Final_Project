/**
 * Generates scripts/seed.sql for a large commercial landscaping company.
 * 8 crews (5×10 + 3×5), ~28 sites, 2024–2026 seasons.
 * Contribution margins target ~10–35% (not 90%) via visit cost sizing.
 *
 * Run: node scripts/generate-realistic-seed.mjs
 */

import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "seed.sql");

const DEMO_TODAY = new Date(Date.UTC(2026, 7, 5));

/** @type {{ id: string, name: string, role: string, crew: string, payRate: number, yearRound: boolean }[]} */
const EMPLOYEES = [];

const CREW_SPECS = [
  { id: "A", lead: "Alex Rivera", leadId: "crew-alex", rate: 32, size: 10 },
  { id: "B", lead: "Taylor Brooks", leadId: "crew-b-lead", rate: 33, size: 10 },
  { id: "C", lead: "Sam Ortiz", leadId: "crew-c-lead", rate: 31, size: 10 },
  { id: "D", lead: "Cameron Blake", leadId: "crew-d-lead", rate: 34, size: 10 },
  { id: "E", lead: "Jordan Hale", leadId: "crew-e-lead", rate: 32, size: 10 },
  { id: "F", lead: "Riley Vance", leadId: "crew-f-lead", rate: 30, size: 5 },
  { id: "G", lead: "Morgan Ellis", leadId: "crew-g-lead", rate: 30, size: 5 },
  { id: "H", lead: "Casey Boone", leadId: "crew-h-lead", rate: 29, size: 5 },
];

const FIRST = [
  "Casey", "Devon", "Priya", "Morgan", "Riley", "Jamie", "Noah", "Harper",
  "Logan", "Avery", "Skylar", "Ellis", "Quinn", "Reese", "Finley", "Drew",
  "Blake", "Hayden", "Parker", "Sawyer", "River", "Charlie", "Emerson", "Rowan",
  "Sage", "Tatum", "Ash", "Kai", "Lane", "Micah", "Peyton", "Remy", "Shawn",
  "Terry", "Val", "Wyatt", "Dale", "Fran", "Gale", "Hugh", "Ivy", "Jade",
  "Kurt", "Lynn", "Max", "Nell", "Owen", "Page", "Ruth", "Seth", "Tess", "Uma",
];
const LAST = [
  "Nguyen", "Walsh", "Nair", "Diaz", "Chen", "Park", "Benton", "Quinn",
  "Pierce", "Kim", "Reed", "Soto", "Foster", "Hayes", "Bennett", "Cruz",
  "Patel", "Murphy", "Torres", "Grant", "Sullivan", "West", "Dean", "Fox",
  "Bailey", "Cooper", "Edwards", "Flores", "Gibson", "Howard", "Ingram",
  "Jenkins", "Keller", "Lawson", "Morris", "Norris", "Owens", "Perez",
  "Rogers", "Stone", "Turner", "Underwood", "Vaughn", "Watts", "Young", "Zimmerman",
];

let nameCursor = 0;
for (const spec of CREW_SPECS) {
  EMPLOYEES.push({
    id: spec.leadId,
    name: spec.lead,
    role: "Crew lead",
    crew: spec.id,
    payRate: spec.rate,
    yearRound: true,
  });
  if (spec.id === "A") {
    EMPLOYEES.push({
      id: "crew-1",
      name: "Jordan Miles",
      role: "Crew Member",
      crew: "A",
      payRate: 22,
      yearRound: false,
    });
  }
  if (spec.id === "D") {
    EMPLOYEES.push({
      id: "crew-d-tech",
      name: "Skylar Reed",
      role: "Irrigation Tech",
      crew: "D",
      payRate: 26,
      yearRound: true,
    });
  }
  const have = EMPLOYEES.filter((e) => e.crew === spec.id).length;
  for (let i = have; i < spec.size; i++) {
    const name = `${FIRST[nameCursor % FIRST.length]} ${LAST[nameCursor % LAST.length]}`;
    nameCursor += 1;
    const isOp = i === have;
    EMPLOYEES.push({
      id: `crew-${spec.id.toLowerCase()}-${i + 1}`,
      name,
      role: isOp ? "Equipment Operator" : "Crew Member",
      crew: spec.id,
      payRate: isOp ? 24 : 20 + (i % 4),
      yearRound: false,
    });
  }
}

/** @type {object[]} */
const SITES = [
  { customerId: "11111111-1111-1111-1111-111111111101", companyName: "Riverside Office Park", propertyType: "Office Park", location: "1200 University Ave, Oxford, MS", contactName: "Maria Chen", contactEmail: "mchen@riverside-op.com", contactPhone: "(662) 555-0142", createdAt: "2024-03-15 10:00:00+00", crew: "A", accountManager: "Alex Rivera", monthlyFee: 4200, visitsPerWeek: 2, targetMarginPct: 28, services: ["Mowing", "Edging", "Trimming", "Spring Cleanup"], notes: "Security dog near rear lot. Stage trailers in service bay only.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111102", companyName: "Summit Retail Center", propertyType: "Retail Center", location: "450 Jackson Ave W, Oxford, MS", contactName: "James Ortiz", contactEmail: "jortiz@summitretail.com", contactPhone: "(662) 555-0188", createdAt: "2024-04-10 10:00:00+00", crew: "B", accountManager: "Taylor Brooks", monthlyFee: 5800, visitsPerWeek: 3, targetMarginPct: 32, services: ["Mowing", "Edging", "Fertilization"], notes: "No leaf blowing before 9 AM near storefronts.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111103", companyName: "Harbor View HOA", propertyType: "HOA", location: "88 South Lamar Blvd, Oxford, MS", contactName: "Pat Simmons", contactEmail: "psimmons@harborviewhoa.org", contactPhone: null, createdAt: "2024-06-01 10:00:00+00", crew: "A", accountManager: "Alex Rivera", monthlyFee: 3100, visitsPerWeek: 1, targetMarginPct: 22, services: ["Mowing", "Bed Weeding"], notes: "Keep side gate latched. Avoid playground during pickup hours.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111104", companyName: "Metro Industrial Complex", propertyType: "Industrial", location: "900 Molly Barr Rd, Oxford, MS", contactName: "Dana Brooks", contactEmail: "dbrooks@metroindustrial.com", contactPhone: "(662) 555-0199", createdAt: "2024-08-20 10:00:00+00", crew: "C", accountManager: "Sam Ortiz", monthlyFee: 7200, visitsPerWeek: 2, targetMarginPct: 8, services: ["Mowing", "Detention Pond Maintenance"], notes: "PPE required. High labor variance — thin margin account.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111105", companyName: "Oxford Square Medical Campus", propertyType: "Medical Campus", location: "2100 S Lamar Blvd, Oxford, MS", contactName: "Elena Vargas", contactEmail: "evargas@oxfordsquaremed.com", contactPhone: "(662) 555-0160", createdAt: "2024-05-01 10:00:00+00", crew: "B", accountManager: "Taylor Brooks", monthlyFee: 4900, visitsPerWeek: 2, targetMarginPct: 26, services: ["Mowing", "Edging", "Bed Weeding"], notes: "Quiet hours near outpatient wing until 8 AM.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111106", companyName: "Grove Park Apartments", propertyType: "Multifamily", location: "700 Old Taylor Rd, Oxford, MS", contactName: "Chris Lang", contactEmail: "clang@groveparkapts.com", contactPhone: "(662) 555-0171", createdAt: "2024-09-12 10:00:00+00", crew: "C", accountManager: "Sam Ortiz", monthlyFee: 3800, visitsPerWeek: 2, targetMarginPct: 24, services: ["Mowing", "Edging", "Trimming"], notes: "Stage trailers on east curb only after 5 PM.", startYear: 2024 },
  { customerId: "11111111-1111-1111-1111-111111111107", companyName: "Northgate Business Park", propertyType: "Business Park", location: "1550 Highway 7 N, Oxford, MS", contactName: "Quinn Foster", contactEmail: "qfoster@northgatebp.com", contactPhone: "(662) 555-0133", createdAt: "2025-01-08 10:00:00+00", crew: "E", accountManager: "Jordan Hale", monthlyFee: 6400, visitsPerWeek: 2, targetMarginPct: 30, services: ["Mowing", "Edging", "Fertilization", "Bed Weeding"], notes: "Large irrigated lawns — escalate controller issues to the irrigation tech.", startYear: 2025 },
  { customerId: "11111111-1111-1111-1111-111111111108", companyName: "College Hill Church Campus", propertyType: "Institutional", location: "1400 College Hill Rd, Oxford, MS", contactName: "Rev. Anita Cole", contactEmail: "acole@collegehill.org", contactPhone: "(662) 555-0122", createdAt: "2025-03-01 10:00:00+00", crew: "D", accountManager: "Cameron Blake", monthlyFee: 2700, visitsPerWeek: 1, targetMarginPct: 20, services: ["Mowing", "Irrigation Inspection", "Bed Weeding"], notes: "No Sunday work 8 AM–1 PM.", startYear: 2025 },
];

const EXTRA = [
  [9, "Ole Miss Innovation Hub", "Campus", "100 Research Blvd, Oxford, MS", "Dr. Leah Price", "lprice@omih.org", "(662) 555-0201", "E", "Jordan Hale", 5100, 2, 27, 2024, "Badge access at north loading dock. Avoid lab courtyard during class change."],
  [10, "Baptist Memorial Oxford", "Medical Campus", "1100 Belk Blvd, Oxford, MS", "Tom Nguyen", "tnguyen@bmhoxf.org", "(662) 555-0202", "B", "Taylor Brooks", 6800, 3, 18, 2024, "Quiet hours near ER entrance until 8 AM. No blowers by patient windows."],
  [11, "Thacker Mountain Retail Row", "Retail Center", "320 N Lamar Blvd, Oxford, MS", "Gina Holt", "gholt@thackerrow.com", "(662) 555-0203", "F", "Riley Vance", 2900, 2, 25, 2024, "Keep sidewalks clear for shoppers. Park trailers behind the alley only."],
  [12, "Whisper Lake HOA", "HOA", "50 Whisper Lake Dr, Oxford, MS", "Bill Kearney", "bkearney@whisperlake.org", null, "G", "Morgan Ellis", 4500, 2, 21, 2024, "Gate code 3381. Stay off private docks and common pool deck furniture."],
  [13, "Oxford Distribution Center", "Industrial", "2400 Highway 6 W, Oxford, MS", "Nina Shah", "nshah@oxdist.com", "(662) 555-0205", "C", "Sam Ortiz", 8100, 2, 14, 2024, "PPE required past the guard shack. Stay clear of truck lanes 6–10 AM."],
  [14, "Square Civic Plaza", "Municipal", "1 Courthouse Sq, Oxford, MS", "City Parks Desk", "parks@oxfordms.net", "(662) 555-0206", "F", "Riley Vance", 2200, 1, 16, 2025, "Coordinate with events calendar. No equipment on brick pavers during markets."],
  [15, "Lakeside Corporate Campus", "Business Park", "880 Lakeside Dr, Oxford, MS", "Omar Haddad", "ohaddad@lakesidecc.com", "(662) 555-0207", "A", "Alex Rivera", 7600, 3, 29, 2024, "Stage on the east service road. Dog park fence must stay latched."],
  [16, "Cedar Ridge Townhomes", "Multifamily", "415 Cedar Ridge Rd, Oxford, MS", "Paula Ortiz", "portiz@cedarridge.com", "(662) 555-0208", "H", "Casey Boone", 3400, 2, 23, 2025, "Avoid unit patios. Residents walk dogs on the west path mornings."],
  [17, "Powerhouse Storage Yards", "Industrial", "1900 Industry Park Dr, Oxford, MS", "Rick Malone", "rmalone@phstorage.com", "(662) 555-0209", "C", "Sam Ortiz", 3900, 1, 11, 2025, "Call ahead for gate unlock. Watch for loose gravel near bay 4."],
  [18, "Oxford University Mall Pads", "Retail Center", "1600 W Jackson Ave, Oxford, MS", "Shelly Grant", "sgrant@oumall.com", "(662) 555-0210", "B", "Taylor Brooks", 5400, 2, 27, 2024, "No leaf blowing before 9 AM near storefronts. Use rear loading pads."],
  [19, "Clear Creek Apartments", "Multifamily", "925 Clear Creek Blvd, Oxford, MS", "Ivan Petrov", "ipetrov@clearcreek.com", "(662) 555-0211", "G", "Morgan Ellis", 4100, 2, 19, 2025, "Keep playground clear during after-school hours. Office has spare gate key."],
  [20, "Highway 7 Auto Plaza", "Retail Center", "2010 Highway 7 S, Oxford, MS", "Dana Cho", "dcho@h7auto.com", "(662) 555-0212", "H", "Casey Boone", 2600, 1, 17, 2025, "Stay off display vehicle pads. Blow toward curb, not showroom glass."],
  [21, "North MS Logistics Hub", "Industrial", "500 Commerce Way, Batesville, MS", "Frank Doyle", "fdoyle@nmlogistics.com", "(662) 555-0213", "E", "Jordan Hale", 9200, 2, 13, 2025, "High-visibility vests required. Check in at shipping office before entering yards."],
  [22, "Bramlett Gardens HOA", "HOA", "77 Bramlett Blvd, Oxford, MS", "Helen Cho", "hcho@bramlett.org", null, "F", "Riley Vance", 3600, 2, 24, 2025, "Mailbox cluster is off-limits for staging. Leave common beds mulched evenly."],
  [23, "South Campus Athletic Fields", "Institutional", "1800 Hill Dr, Oxford, MS", "Coach Ray Mills", "rmills@athletics.edu", "(662) 555-0215", "D", "Cameron Blake", 8700, 3, 15, 2025, "Do not cross marked practice fields. Irrigation clocks are in the shed by field 2."],
  [24, "West End Medical Offices", "Medical Campus", "600 West Jackson Ave, Oxford, MS", "Dr. Sara Kim", "skim@wemed.com", "(662) 555-0216", "G", "Morgan Ellis", 3300, 1, 26, 2025, "Quiet near outpatient wing until 8 AM. Park in staff overflow only."],
  [25, "Pontotoc Road Flex Warehouses", "Industrial", "4400 Pontotoc Rd, Oxford, MS", "Luis Mendez", "lmendez@prflex.com", "(662) 555-0217", "H", "Casey Boone", 4700, 2, 12, 2025, "Forklift traffic on apron — use cones. Lock dumpster gates when finished."],
  [26, "Downtown Inn Courtyard", "Hospitality", "400 Van Buren Ave, Oxford, MS", "Amy Rhodes", "arhodes@dtinn.com", "(662) 555-0218", "F", "Riley Vance", 2100, 2, 22, 2025, "Guest quiet hours 10 PM–7 AM. Water features stay on — wipe splash on stone."],
  [27, "Eastgate Self Storage", "Industrial", "1300 Eastgate Dr, Oxford, MS", "Ben Clark", "bclark@eastgatess.com", "(662) 555-0219", "H", "Casey Boone", 1800, 1, 35, 2025, "Office opens 8 AM. Keep aisle lanes clear for customer trucks."],
  [28, "County Fairgrounds Perimeter", "Municipal", "1500 Fairgrounds Rd, Oxford, MS", "Parks Admin", "fairgrounds@lafayette.ms.gov", "(662) 555-0220", "E", "Jordan Hale", 5500, 1, 10, 2025, "Confirm event schedule before mowing. Temporary fencing may block east gate."],
];

for (const row of EXTRA) {
  const [idx, companyName, propertyType, location, contactName, contactEmail, contactPhone, crew, accountManager, monthlyFee, visitsPerWeek, targetMarginPct, startYear, notes] = row;
  const idNum = String(100 + idx).slice(-2);
  SITES.push({
    customerId: `11111111-1111-1111-1111-1111111111${idNum}`,
    companyName,
    propertyType,
    location,
    contactName,
    contactEmail,
    contactPhone,
    createdAt: `${startYear}-04-01 10:00:00+00`,
    crew,
    accountManager,
    monthlyFee,
    visitsPerWeek,
    targetMarginPct,
    services: ["Mowing", "Edging", "Trimming"],
    notes,
    startYear,
  });
}

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}
function isoDate(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}
function contractId(siteIndex, year) {
  if (year === 2026 && siteIndex <= 3) {
    return `22222222-2222-2222-2222-2222222222${pad(siteIndex + 1)}`;
  }
  return `22222222-2222-2222-2222-22222222${String(year).slice(2)}${pad(siteIndex + 1)}`;
}
function visitId(seq) {
  return `33333333-3333-3333-3333-${seq.toString(16).padStart(12, "0")}`;
}
function equipId(n) {
  return `66666666-6666-6666-6666-${String(n).padStart(12, "0")}`;
}
function invoiceId(n) {
  return `55555555-5555-5555-5555-${String(n).padStart(12, "0")}`;
}
function extraId(n) {
  return `44444444-4444-4444-4444-${String(n).padStart(12, "0")}`;
}
function isWinter(month) {
  return month === 12 || month === 1 || month === 2;
}
function isFullSeason(month) {
  return month >= 3 && month <= 11;
}
function weeklyTarget(dateIso) {
  const month = Number(dateIso.slice(5, 7));
  const day = Number(dateIso.slice(8, 10));
  if (month >= 6 && month <= 8) return Math.ceil(day / 7) % 2 === 0 ? 50 : 40;
  if ((month === 4 || month === 5 || month === 9 || month === 10) && day > 20) return 45;
  if (isWinter(month)) return 32;
  return 40;
}
function crewParty(crew, dateIso) {
  const month = Number(dateIso.slice(5, 7));
  let members = EMPLOYEES.filter((e) => {
    if (e.crew !== crew) return false;
    if (isFullSeason(month)) return true;
    return e.yearRound;
  });
  if (members.length > 6) {
    const lead = members.find((m) => m.role === "Crew lead");
    const rest = members.filter((m) => m !== lead);
    const size = 5 + (dateIso.charCodeAt(8) % 3);
    members = lead ? [lead, ...rest.slice(0, size - 1)] : rest.slice(0, size);
  }
  return members;
}
function eachDate(start, end, fn) {
  const cur = new Date(start.getTime());
  while (cur <= end) {
    fn(new Date(cur.getTime()));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
}

/** Direct costs sized so contribution margin ≈ site.targetMarginPct (± a little variance). */
function visitCostBudget(site, dateIso) {
  const monthlyVisits = Math.max(site.visitsPerWeek * 4.33, 1);
  const rev = site.monthlyFee / monthlyVisits;
  let margin = site.targetMarginPct / 100;
  // Busy OT weeks compress margin 3–6 pts; winter maintenance thinner revenue recognition
  if (weeklyTarget(dateIso) >= 50) margin -= 0.05;
  if (isWinter(Number(dateIso.slice(5, 7)))) margin -= 0.04;
  margin = Math.max(0.04, Math.min(0.4, margin));
  const total = rev * (1 - margin);
  return {
    rev,
    total,
    labor: total * 0.68,
    materials: total * 0.14,
    equipment: total * 0.18,
  };
}

const lines = [];
const w = (s = "") => lines.push(s);

w(`-- GreenScape Commercial — large multi-crew seed (generated)`);
w(`-- 8 crews (5×10 + 3×5 staff), ~${SITES.length} sites, 2024–2026`);
w(`-- Visit costs sized for ~10–35% contribution margins (commercial landscaping).`);
w(`-- Safe to re-run. Demo today ≈ 2026-08-05. Portal customer: Riverside (...1101).`);
w(``);
w(`delete from equipment_usage;`);
w(`delete from equipment;`);
w(`delete from payments;`);
w(`delete from invoice_lines;`);
w(`delete from invoices;`);
w(`do $$ begin delete from visit_labor_entries; exception when undefined_table then null; end $$;`);
w(`delete from visit_costs;`);
w(`delete from service_visits;`);
w(`delete from extra_work_orders;`);
w(`delete from contract_services;`);
w(`delete from support_requests;`);
w(`delete from customer_payment_methods;`);
w(`delete from contracts;`);
w(`delete from customers;`);
w(``);

w(`insert into customers (id, name, property_type, address, contact_name, contact_email, contact_phone, created_at, notification_prefs, customer_notes) values`);
SITES.forEach((s, i) => {
  const prefs =
    i === 0
      ? `'{"invoice_reminders":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"visit_reminders":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"support_updates":{"enabled":true,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"},"renewal_notices":{"enabled":false,"channel":"email","email":"mchen@riverside-op.com","phone":"(662) 555-0142"}}'::jsonb`
      : `'{}'::jsonb`;
  const phone = s.contactPhone ? sqlStr(s.contactPhone) : "null";
  w(`  (${sqlStr(s.customerId)}, ${sqlStr(s.companyName)}, ${sqlStr(s.propertyType)}, ${sqlStr(s.location)}, ${sqlStr(s.contactName)}, ${sqlStr(s.contactEmail)}, ${phone}, ${sqlStr(s.createdAt)}, ${prefs}, ${sqlStr(s.notes)})${i < SITES.length - 1 ? "," : ";"}`);
});
w(``);
w(`insert into customer_payment_methods (customer_id, nickname, display_label, method_type, is_default, last_four, expires_month, expires_year, billing_name) values`);
w(`  ('11111111-1111-1111-1111-111111111101', null, 'Card ending in 4242', 'card', true, '4242', 8, 2027, 'Maria Chen'),`);
w(`  ('11111111-1111-1111-1111-111111111101', null, 'Bank account ending in 8821', 'bank', false, '8821', null, null, 'Riverside Office Park');`);
w(``);

const years = [2024, 2025, 2026];
const contractRows = [];
SITES.forEach((site, siteIndex) => {
  for (const year of years) {
    if (year < site.startYear) continue;
    const id = contractId(siteIndex, year);
    const status = year < 2026 ? "completed" : "active";
    contractRows.push(
      `  (${sqlStr(id)}, ${sqlStr(site.customerId)}, ${sqlStr(`${year} Grounds — ${site.companyName.split(" ").slice(0, 2).join(" ")}`)}, ${sqlStr(status)}, ${sqlStr(`${year}-04-01`)}, ${sqlStr(`${year}-11-30`)}, ${site.monthlyFee.toFixed(2)}, ${site.visitsPerWeek}, 'monthly', ${sqlStr(site.notes)}, ${sqlStr(`Crew ${site.crew}`)}, ${sqlStr(site.accountManager)}, ${sqlStr(`${year}-11-30`)})`
    );
  }
});
contractRows.push(
  `  ('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111101', '2026 Irrigation Monitoring — Riverside', 'active', '2026-04-01', '2026-10-31', 1200.00, 1, 'monthly', 'Weekly checks; repairs extra.', 'Crew D', 'Cameron Blake', '2026-11-30')`
);
contractRows.push(
  `  ('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111101', '2026 Parking Lot Islands — Riverside', 'active', '2026-05-01', '2026-11-30', 1600.00, 1, 'monthly', 'North/south lot islands.', 'Crew A', 'Alex Rivera', '2026-11-30')`
);

w(`insert into contracts (id, customer_id, title, status, season_start, season_end, monthly_fee, visits_per_week, billing_method, notes, assigned_crew, account_manager, renewal_date) values`);
w(contractRows.join(",\n") + ";");
w(``);

const svcRows = [];
SITES.forEach((site, siteIndex) => {
  for (const year of years) {
    if (year < site.startYear) continue;
    const id = contractId(siteIndex, year);
    for (const svc of site.services) svcRows.push(`  (${sqlStr(id)}, ${sqlStr(svc)}, true)`);
  }
});
svcRows.push(`  ('22222222-2222-2222-2222-222222222205', 'Irrigation inspection', true)`);
svcRows.push(`  ('22222222-2222-2222-2222-222222222206', 'Island mowing', true)`);
w(`insert into contract_services (contract_id, service_name, included) values`);
w(svcRows.join(",\n") + ";");
w(``);

/** @type {object[]} */
const visits = [];
let visitSeq = 0x400;

const STORY = [
  { id: "33333333-3333-3333-3333-333333333301", contractId: contractId(0, 2026), date: "2026-06-02", status: "completed", notes: "Standard mow and edge", completedAt: "2026-06-02 14:00:00+00", crew: "A", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333302", contractId: contractId(0, 2026), date: "2026-06-09", status: "completed", notes: "Entrance hedge trim", completedAt: "2026-06-09 15:30:00+00", crew: "A", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333303", contractId: contractId(0, 2026), date: "2026-08-05", status: "scheduled", notes: null, completedAt: null, crew: "A", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333304", contractId: contractId(1, 2026), date: "2026-06-03", status: "completed", notes: "Retail frontage mowed", completedAt: "2026-06-03 10:00:00+00", crew: "B", siteIndex: 1 },
  { id: "33333333-3333-3333-3333-333333333305", contractId: contractId(3, 2026), date: "2026-06-04", status: "completed", notes: "Pond overtime — labor variance", completedAt: "2026-06-04 17:00:00+00", crew: "C", siteIndex: 3 },
  { id: "33333333-3333-3333-3333-333333333306", contractId: contractId(2, 2026), date: "2026-08-06", status: "scheduled", notes: null, completedAt: null, crew: "A", siteIndex: 2 },
  { id: "33333333-3333-3333-3333-333333333307", contractId: contractId(1, 2026), date: "2026-08-07", status: "scheduled", notes: null, completedAt: null, crew: "B", siteIndex: 1 },
  { id: "33333333-3333-3333-3333-333333333308", contractId: "22222222-2222-2222-2222-222222222205", date: "2026-06-10", status: "completed", notes: "Zone 3 pressure repair", completedAt: "2026-06-10 11:30:00+00", crew: "D", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333309", contractId: "22222222-2222-2222-2222-222222222205", date: "2026-08-12", status: "scheduled", notes: null, completedAt: null, crew: "D", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333310", contractId: "22222222-2222-2222-2222-222222222206", date: "2026-06-11", status: "completed", notes: "North island mow", completedAt: "2026-06-11 13:00:00+00", crew: "A", siteIndex: 0 },
  { id: "33333333-3333-3333-3333-333333333311", contractId: "22222222-2222-2222-2222-222222222206", date: "2026-08-13", status: "scheduled", notes: null, completedAt: null, crew: "A", siteIndex: 0 },
];
visits.push(...STORY);
const storyKeys = new Set(STORY.map((v) => `${v.contractId}|${v.date}`));

function addVisit(contractIdVal, dateStr, crew, siteIndex, notes) {
  const d = new Date(dateStr + "T12:00:00Z");
  const status = d < DEMO_TODAY ? "completed" : "scheduled";
  const id = visitId(visitSeq++);
  visits.push({
    id,
    contractId: contractIdVal,
    date: dateStr,
    status,
    notes,
    completedAt: status === "completed" ? `${dateStr}T15:00:00+00` : null,
    crew,
    siteIndex,
  });
}

for (const year of years) {
  SITES.forEach((site, siteIndex) => {
    if (year < site.startYear) return;
    const cid = contractId(siteIndex, year);
    const start = new Date(Date.UTC(year, 3, 1));
    const end = new Date(Date.UTC(year, 10, 30));
    // Thin 2024 slightly to keep seed size practical
    const stepDays = year === 2024 ? 2 : 1;
    eachDate(start, end, (d) => {
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) return;
      if (year === 2024 && d.getUTCDate() % stepDays !== 0) return;
      const dateStr = isoDate(d);
      const weekDaySlot = dow - 1;
      if (weekDaySlot >= site.visitsPerWeek) return;
      if (Math.floor(d.getTime() / 86400000) % 19 === 0) return;
      if (storyKeys.has(`${cid}|${dateStr}`)) return;
      const ot = weeklyTarget(dateStr) >= 50;
      addVisit(
        cid,
        dateStr,
        site.crew,
        siteIndex,
        ot
          ? "Busy-season overtime — weather make-up / labor variance"
          : "Scheduled commercial grounds"
      );
    });
    // Winter Tuesdays (crew-lead focused)
    if (year <= 2025) {
      eachDate(new Date(Date.UTC(year, 11, 1)), new Date(Date.UTC(year + 1, 1, 28)), (d) => {
        if (d.getUTCDay() !== 2) return;
        addVisit(cid, isoDate(d), site.crew, siteIndex, "Winter — leaf blow / equipment maintenance");
      });
    }
  });
}

// Irrigation specialty Thursdays 2026
eachDate(new Date(Date.UTC(2026, 3, 1)), new Date(Date.UTC(2026, 9, 30)), (d) => {
  if (d.getUTCDay() !== 4) return;
  const dateStr = isoDate(d);
  if (storyKeys.has(`22222222-2222-2222-2222-222222222205|${dateStr}`)) return;
  addVisit("22222222-2222-2222-2222-222222222205", dateStr, "D", 0, "Irrigation monitoring");
});

w(`-- SERVICE VISITS (${visits.length})`);
w(`insert into service_visits (id, contract_id, scheduled_date, status, crew_notes, completed_at) values`);
w(
  visits
    .map((v) => {
      const completed = v.completedAt ? sqlStr(v.completedAt) : "null";
      const notes = v.notes ? sqlStr(v.notes) : "null";
      return `  (${sqlStr(v.id)}, ${sqlStr(v.contractId)}, ${sqlStr(v.date)}, ${sqlStr(v.status)}, ${notes}, ${completed})`;
    })
    .join(",\n") + ";"
);
w(``);

const costRows = [];
const laborRows = [];
/** @type {object[]} */
const costObjs = [];
/** @type {object[]} */
const laborObjs = [];
for (const v of visits) {
  if (v.status !== "completed") continue;
  const site = SITES[v.siteIndex] ?? SITES[0];
  const budget = visitCostBudget(site, v.date);
  const party = crewParty(v.crew, v.date);
  const hoursEach = Number((weeklyTarget(v.date) / 5).toFixed(2));
  let laborSum = 0;
  const memberHours = party.map((m) => {
    const hours = m.role === "Crew lead" ? hoursEach : Number((hoursEach * 0.92).toFixed(2));
    laborSum += hours * m.payRate;
    return { m, hours };
  });
  // Scale hours so labor $ ≈ budget.labor (burdened field labor)
  const scale = laborSum > 0 ? budget.labor / laborSum : 1;
  let laborAmount = 0;
  let qty = 0;
  for (const { m, hours } of memberHours) {
    const h = Number((hours * scale).toFixed(2));
    const amount = Number((h * m.payRate).toFixed(2));
    laborAmount += amount;
    qty += h;
    laborRows.push(
      `  (${sqlStr(v.id)}, ${sqlStr(m.id)}, ${sqlStr(m.name)}, ${sqlStr(m.role)}, ${h}, ${m.payRate.toFixed(2)})`
    );
    laborObjs.push({
      visit_id: v.id,
      member_demo_id: m.id,
      member_name: m.name,
      member_role: m.role,
      hours: h,
      hourly_rate: m.payRate,
    });
  }
  const matDesc = isWinter(Number(v.date.slice(5, 7)))
    ? "Fuel / shop supplies"
    : "Fuel, fertilizer, string, chemicals";
  costRows.push(
    `  (${sqlStr(v.id)}, 'labor', ${sqlStr(`Field labor (${party.length} crew, ~${weeklyTarget(v.date)}h/wk target)`)}, ${laborAmount.toFixed(2)}, ${Number(qty.toFixed(2))})`
  );
  costRows.push(
    `  (${sqlStr(v.id)}, 'materials', ${sqlStr(matDesc)}, ${budget.materials.toFixed(2)}, 1)`
  );
  costRows.push(
    `  (${sqlStr(v.id)}, 'equipment', ${sqlStr("Mower/truck/trailer allocation + wear")}, ${budget.equipment.toFixed(2)}, 1)`
  );
  costObjs.push(
    {
      visit_id: v.id,
      cost_type: "labor",
      description: `Field labor (${party.length} crew, ~${weeklyTarget(v.date)}h/wk target)`,
      amount: Number(laborAmount.toFixed(2)),
      quantity: Number(qty.toFixed(2)),
    },
    {
      visit_id: v.id,
      cost_type: "materials",
      description: matDesc,
      amount: Number(budget.materials.toFixed(2)),
      quantity: 1,
    },
    {
      visit_id: v.id,
      cost_type: "equipment",
      description: "Mower/truck/trailer allocation + wear",
      amount: Number(budget.equipment.toFixed(2)),
      quantity: 1,
    }
  );
}

w(`insert into visit_costs (visit_id, cost_type, description, amount, quantity) values`);
w(costRows.join(",\n") + ";");
w(``);
w(`insert into visit_labor_entries (visit_id, member_demo_id, member_name, member_role, hours, hourly_rate) values`);
w(laborRows.join(",\n") + ";");
w(``);

w(`insert into extra_work_orders (id, contract_id, title, description, quoted_amount, status, approved_at) values`);
w(`  (${sqlStr(extraId(1))}, ${sqlStr(contractId(0, 2026))}, 'Mulch Installation — Entrance Beds', '18 yards premium mulch.', 2850.00, 'approved', '2026-05-20 10:00:00+00'),`);
w(`  (${sqlStr(extraId(2))}, ${sqlStr(contractId(2, 2026))}, 'Storm Damage Cleanup', 'Branch removal after May storm.', 1450.00, 'quoted', null),`);
w(`  (${sqlStr(extraId(3))}, '22222222-2222-2222-2222-222222222205', 'Leak repair — Zone 3', 'Main line repair.', 980.00, 'quoted', null),`);
w(`  (${sqlStr(extraId(4))}, ${sqlStr(contractId(3, 2025))}, 'Fence-line brush clearing', 'Metro south fence.', 2100.00, 'completed', '2025-07-12 10:00:00+00'),`);
w(`  (${sqlStr(extraId(5))}, ${sqlStr(contractId(4, 2026))}, 'Seasonal color — clinic entry', 'Summer annuals.', 1100.00, 'approved', '2026-04-18 10:00:00+00'),`);
w(`  (${sqlStr(extraId(6))}, ${sqlStr(contractId(13, 2026))}, 'Detention pond algae treatment', 'Quarterly treatment package.', 1750.00, 'approved', '2026-06-01 10:00:00+00');`);
w(``);

const invRows = [];
const lineRows = [];
const payRows = [];
/** @type {object[]} */
const invoiceObjs = [];
/** @type {object[]} */
const invoiceLineObjs = [];
/** @type {object[]} */
const paymentObjs = [];
let invN = 1;
let payN = 1;

function addInvoice(contractIdVal, customerId, year, month, fee, statusForce) {
  const issue = `${year}-${pad(month)}-01`;
  const dueAdj = `${year}-${pad(month)}-28`;
  const id = invoiceId(invN);
  const num = `INV-${String(invN).padStart(4, "0")}`;
  invN += 1;
  const invDate = new Date(Date.UTC(year, month - 1, 1));
  let status = statusForce;
  if (!status) {
    if (invDate > DEMO_TODAY) status = "draft";
    else if (year === 2026 && month >= 6 && customerId.endsWith("104")) status = "past_due";
    else if (year === 2026 && month === 7 && customerId.endsWith("103")) status = "partially_paid";
    else if (year === 2026 && month === 6 && customerId.endsWith("101") && fee >= 4000) status = "sent";
    else if (invDate < DEMO_TODAY) status = "paid";
    else status = "sent";
  }
  let amountPaid = 0;
  if (status === "paid") amountPaid = fee;
  if (status === "partially_paid") amountPaid = fee / 2;
  invRows.push(
    `  (${sqlStr(id)}, ${sqlStr(contractIdVal)}, ${sqlStr(customerId)}, ${sqlStr(num)}, ${sqlStr(issue)}, ${sqlStr(dueAdj)}, ${sqlStr(status)}, ${fee.toFixed(2)}, ${fee.toFixed(2)}, ${amountPaid.toFixed(2)})`
  );
  lineRows.push(
    `  (${sqlStr(id)}, ${sqlStr(`Monthly commercial maintenance (${year}-${pad(month)})`)}, ${fee.toFixed(2)}, 'recurring')`
  );
  invoiceObjs.push({
    id,
    contract_id: contractIdVal,
    customer_id: customerId,
    invoice_number: num,
    issue_date: issue,
    due_date: dueAdj,
    status,
    subtotal: fee,
    total: fee,
    amount_paid: amountPaid,
  });
  invoiceLineObjs.push({
    invoice_id: id,
    description: `Monthly commercial maintenance (${year}-${pad(month)})`,
    amount: fee,
    line_type: "recurring",
  });
  if (status === "paid") {
    const pnum = `CR-${String(payN).padStart(4, "0")}`;
    payRows.push(
      `  (${sqlStr(pnum)}, ${sqlStr(id)}, ${sqlStr(customerId)}, ${fee.toFixed(2)}, ${fee.toFixed(2)}, 0, ${sqlStr(`${year}-${pad(month)}-20`)}, 'simulated_ach', 'On-time')`
    );
    paymentObjs.push({
      payment_number: pnum,
      invoice_id: id,
      customer_id: customerId,
      amount: fee,
      applied_amount: fee,
      unapplied_amount: 0,
      payment_date: `${year}-${pad(month)}-20`,
      payment_method: "simulated_ach",
      notes: "On-time",
    });
    payN += 1;
  } else if (status === "partially_paid") {
    const pnum = `CR-${String(payN).padStart(4, "0")}`;
    payRows.push(
      `  (${sqlStr(pnum)}, ${sqlStr(id)}, ${sqlStr(customerId)}, ${(fee / 2).toFixed(2)}, ${(fee / 2).toFixed(2)}, 0, ${sqlStr(`${year}-${pad(month)}-15`)}, 'simulated_check', 'Partial')`
    );
    paymentObjs.push({
      payment_number: pnum,
      invoice_id: id,
      customer_id: customerId,
      amount: fee / 2,
      applied_amount: fee / 2,
      unapplied_amount: 0,
      payment_date: `${year}-${pad(month)}-15`,
      payment_method: "simulated_check",
      notes: "Partial",
    });
    payN += 1;
  }
}

for (const year of years) {
  SITES.forEach((site, siteIndex) => {
    if (year < site.startYear) return;
    const cid = contractId(siteIndex, year);
    for (let month = 4; month <= 11; month++) {
      if (year === 2026 && month > 8) {
        addInvoice(cid, site.customerId, year, month, site.monthlyFee, month === 8 ? "approved" : "draft");
      } else {
        addInvoice(cid, site.customerId, year, month, site.monthlyFee);
      }
    }
  });
}
const storyInv2 = invoiceId(invN++);
invRows.push(
  `  (${sqlStr(storyInv2)}, ${sqlStr(contractId(0, 2026))}, '11111111-1111-1111-1111-111111111101', 'INV-EW01', '2026-06-01', '2026-07-01', 'sent', 2850.00, 2850.00, 0.00)`
);
lineRows.push(
  `  (${sqlStr(storyInv2)}, 'Extra work: Mulch Installation — Entrance Beds', 2850.00, 'extra_work')`
);
invoiceObjs.push({
  id: storyInv2,
  contract_id: contractId(0, 2026),
  customer_id: "11111111-1111-1111-1111-111111111101",
  invoice_number: "INV-EW01",
  issue_date: "2026-06-01",
  due_date: "2026-07-01",
  status: "sent",
  subtotal: 2850,
  total: 2850,
  amount_paid: 0,
});
invoiceLineObjs.push({
  invoice_id: storyInv2,
  description: "Extra work: Mulch Installation — Entrance Beds",
  amount: 2850,
  line_type: "extra_work",
});

w(`insert into invoices (id, contract_id, customer_id, invoice_number, issue_date, due_date, status, subtotal, total, amount_paid) values`);
w(invRows.join(",\n") + ";");
w(``);
w(`insert into invoice_lines (invoice_id, description, amount, line_type) values`);
w(lineRows.join(",\n") + ";");
w(``);
w(`insert into payments (payment_number, invoice_id, customer_id, amount, applied_amount, unapplied_amount, payment_date, payment_method, notes) values`);
w(payRows.join(",\n") + ";");
w(``);

w(`insert into support_requests (customer_id, category, message, linked_type, linked_id, status, resolution_notes, created_at) values`);
w(`  ('11111111-1111-1111-1111-111111111101', 'question', 'Confirm July irrigation schedule?', 'contract', '22222222-2222-2222-2222-222222222205', 'Resolved', 'Confirmed Tuesday checks.', '2026-06-15 14:00:00+00'),`);
w(`  ('11111111-1111-1111-1111-111111111101', 'billing_dispute', 'Review mulch line on INV-EW01.', 'invoice', ${sqlStr(storyInv2)}, 'Open', null, '2026-07-02 10:30:00+00'),`);
w(`  ('11111111-1111-1111-1111-111111111102', 'concern', 'North gate code changed.', 'contract', ${sqlStr(contractId(1, 2026))}, 'Open', null, '2026-08-01 15:20:00+00'),`);
w(`  ('11111111-1111-1111-1111-111111111103', 'complaint', 'Front walk edging missed.', 'contract', ${sqlStr(contractId(2, 2026))}, 'In Progress', null, '2026-08-03 11:05:00+00'),`);
w(`  ('11111111-1111-1111-1111-111111111107', 'concern', 'Building 3 controller fault after storms.', 'contract', ${sqlStr(contractId(6, 2026))}, 'Open', null, '2026-08-02 16:40:00+00'),`);
w(`  ('11111111-1111-1111-1111-111111111113', 'question', 'Can pond treatment be scheduled mid-week?', 'contract', ${sqlStr(contractId(12, 2026))}, 'Open', null, '2026-08-04 09:15:00+00');`);
w(``);

// Realistic commercial fleet — unit-of-production lives
const EQUIPMENT = [
  // n, name, cat, purchase, cost, salvage, years, months, estHours, status, notes
  [1, "Exmark Lazer Z X-Series #1", "Mowers", "2022-03-15", 15200, 2800, 5, 0, 4500, "active", "Crew A primary ZTR"],
  [2, "Exmark Lazer Z X-Series #2", "Mowers", "2023-04-01", 15800, 2900, 5, 0, 4500, "active", "Crew B primary ZTR"],
  [3, "Ferris ISX 3300 #1", "Mowers", "2024-03-20", 14200, 2500, 5, 0, 4200, "active", "Crew C"],
  [4, "Ferris ISX 3300 #2", "Mowers", "2024-04-12", 14200, 2500, 5, 0, 4200, "active", "Crew E"],
  [5, "Scag Cheetah II", "Mowers", "2025-02-18", 13500, 2200, 5, 0, 4000, "active", "Crew F"],
  [6, "Toro Groundsmaster 4000", "Mowers", "2021-05-01", 28500, 5000, 7, 0, 6000, "active", "Wide-area / athletic"],
  [7, "Toro Groundsmaster 3280", "Mowers", "2023-06-10", 22000, 4000, 6, 0, 5500, "active", "Large lots"],
  [8, "Wright Stander ZK", "Mowers", "2025-03-01", 9800, 1500, 4, 0, 3200, "active", "Crew G trim mower"],
  [9, "Ford F-250 Crew Cab #1", "Trucks/Trailers", "2020-09-10", 48500, 14000, 8, 0, 12000, "active", "Crew A"],
  [10, "Ford F-250 Crew Cab #2", "Trucks/Trailers", "2021-11-02", 49200, 14500, 8, 0, 12000, "active", "Crew B"],
  [11, "Ford F-350 Super Duty", "Trucks/Trailers", "2022-08-15", 54500, 16000, 8, 0, 12000, "active", "Crew C / dump"],
  [12, "Chevy Silverado 2500 #1", "Trucks/Trailers", "2023-05-20", 51000, 15000, 8, 0, 12000, "active", "Crew D"],
  [13, "Chevy Silverado 2500 #2", "Trucks/Trailers", "2024-06-01", 52800, 15500, 8, 0, 12000, "active", "Crew E"],
  [14, "Ram 2500 Tradesman #1", "Trucks/Trailers", "2024-07-12", 49800, 14500, 8, 0, 12000, "active", "Crew F"],
  [15, "Ram 2500 Tradesman #2", "Trucks/Trailers", "2025-01-08", 50500, 14800, 8, 0, 12000, "active", "Crew G"],
  [16, "Ford Transit Crew Van", "Trucks/Trailers", "2023-02-14", 42000, 12000, 8, 0, 10000, "active", "Crew H / irrigation"],
  [17, "16ft Landscape Trailer #1", "Trailers", "2021-11-20", 6800, 900, 10, 0, 8000, "active", null],
  [18, "16ft Landscape Trailer #2", "Trailers", "2022-12-01", 7000, 950, 10, 0, 8000, "active", null],
  [19, "18ft Equipment Trailer #1", "Trailers", "2023-03-08", 8900, 1200, 10, 0, 8000, "active", null],
  [20, "18ft Equipment Trailer #2", "Trailers", "2024-04-22", 9200, 1300, 10, 0, 8000, "active", null],
  [21, "18ft Equipment Trailer #3", "Trailers", "2025-02-10", 9400, 1300, 10, 0, 8000, "active", null],
  [22, "14ft Dump Trailer", "Trailers", "2024-05-01", 11200, 2000, 10, 0, 7000, "active", "Debris / mulch"],
  [23, "Bobcat S570 Skid Steer", "Other", "2022-04-01", 38500, 12000, 7, 0, 5000, "active", "Grading / heavy"],
  [24, "Kubota BX2380 Compact Tractor", "Other", "2023-09-15", 22400, 7000, 8, 0, 4500, "active", "Attachments"],
  [25, "Hunter ICC2 Controller Kit", "Irrigation tools", "2023-02-01", 2100, 250, 5, 0, 2000, "active", "Diagnostics"],
  [26, "Rain Bird ESP-LXD Kit", "Irrigation tools", "2024-04-10", 2450, 300, 5, 0, 2000, "active", null],
  [27, "Pipeline locator + valve keys", "Irrigation tools", "2025-03-01", 1800, 200, 6, 0, 2500, "active", null],
  [28, "Stihl BR 800 X #1", "Hand/power tools", "2022-06-01", 820, 100, 3, 0, 1400, "active", null],
  [29, "Stihl BR 800 X #2", "Hand/power tools", "2023-06-01", 840, 100, 3, 0, 1400, "active", null],
  [30, "Stihl BR 800 X #3", "Hand/power tools", "2024-06-01", 860, 100, 3, 0, 1400, "active", null],
  [31, "Stihl BR 800 X #4", "Hand/power tools", "2025-05-01", 880, 110, 3, 0, 1400, "active", null],
  [32, "Billy Goat Force Blower #1", "Hand/power tools", "2022-10-01", 2400, 350, 5, 0, 2500, "active", "Leaf season"],
  [33, "Billy Goat Force Blower #2", "Hand/power tools", "2024-09-15", 2550, 380, 5, 0, 2500, "active", "Leaf season"],
  [34, "Echo SRM-2620T Trimmer 6-pack", "Hand/power tools", "2024-03-12", 2100, 200, 3, 0, 1800, "active", null],
  [35, "Stihl FS 131 R Trimmer 6-pack", "Hand/power tools", "2025-04-01", 2400, 220, 3, 0, 1800, "active", null],
  [36, "Stihl HS 82 R Hedge 4-pack", "Hand/power tools", "2024-07-01", 2200, 250, 3, 0, 1600, "active", null],
  [37, "Edger pair — Stihl FC 96", "Hand/power tools", "2023-05-01", 1100, 120, 3, 0, 1500, "active", null],
  [38, "Shop air compressor 80gal", "Other", "2021-01-15", 3200, 500, 10, 0, 6000, "active", "Winter rebuilds"],
  [39, "Pressure washer — stationary", "Other", "2023-11-01", 2800, 400, 8, 0, 4000, "active", "Wash bay"],
  [40, "Fuel cube 119gal", "Other", "2024-02-01", 1900, 300, 10, 0, 8000, "active", "Yard fuel"],
  [41, "Older Walk-Behind Mower", "Mowers", "2017-05-01", 3400, 200, 5, 0, 2500, "retired", "Parts donor"],
  [42, "2018 F-150 (retired)", "Trucks/Trailers", "2018-04-01", 32000, 4000, 8, 0, 10000, "retired", "High miles — sold parts"],
];

w(`insert into equipment (id, name, category, purchase_date, cost, salvage_value, useful_life_years, useful_life_months, estimated_total_hours, status, notes) values`);
w(
  EQUIPMENT.map(([n, name, cat, purchase, cost, salvage, y, m, hours, status, notes]) => {
    const noteSql = notes ? sqlStr(notes) : "null";
    return `  (${sqlStr(equipId(n))}, ${sqlStr(name)}, ${sqlStr(cat)}, ${sqlStr(purchase)}, ${Number(cost).toFixed(2)}, ${Number(salvage).toFixed(2)}, ${y}, ${m}, ${hours}, ${sqlStr(status)}, ${noteSql})`;
  }).join(",\n") + ";"
);
w(`update equipment set retired_at = '2025-11-01' where id = ${sqlStr(equipId(41))};`);
w(`update equipment set retired_at = '2026-01-20' where id = ${sqlStr(equipId(42))};`);
w(``);

const activeEquip = EQUIPMENT.filter((e) => e[9] === "active").map((e) => e[0]);
const usageRows = [];
/** @type {object[]} */
const usageObjs = [];
let ui = 0;
for (const v of visits) {
  if (v.status !== "completed") continue;
  if (ui % 4 !== 0) {
    ui += 1;
    continue;
  }
  const eq1 = activeEquip[ui % activeEquip.length];
  const eq2 = activeEquip[(ui + 5) % activeEquip.length];
  const winter = isWinter(Number(v.date.slice(5, 7)));
  const h1 = winter ? 2.0 + (ui % 3) * 0.5 : 3.0 + (ui % 4) * 0.5;
  usageRows.push(
    `  (${sqlStr(equipId(eq1))}, ${sqlStr(v.id)}, ${h1.toFixed(1)}, ${sqlStr(v.date)}, 'Crew ${v.crew}')`
  );
  usageObjs.push({
    equipment_id: equipId(eq1),
    visit_id: v.id,
    hours: Number(h1.toFixed(1)),
    used_on: v.date,
    notes: `Crew ${v.crew}`,
  });
  if (!winter) {
    usageRows.push(
      `  (${sqlStr(equipId(eq2))}, ${sqlStr(v.id)}, ${(h1 * 0.55).toFixed(1)}, ${sqlStr(v.date)}, 'Support')`
    );
    usageObjs.push({
      equipment_id: equipId(eq2),
      visit_id: v.id,
      hours: Number((h1 * 0.55).toFixed(1)),
      used_on: v.date,
      notes: "Support",
    });
  }
  ui += 1;
}
w(`insert into equipment_usage (equipment_id, visit_id, hours, used_on, notes) values`);
w(usageRows.join(",\n") + ";");
w(``);
w(`-- Done: ${SITES.length} customers, ${EMPLOYEES.length} employees across 8 crews, ${visits.length} visits, ${EQUIPMENT.length} equipment.`);

writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`Wrote ${outPath}`);
console.log(
  JSON.stringify(
    {
      employees: EMPLOYEES.length,
      crews: CREW_SPECS.map((c) => `${c.id}:${EMPLOYEES.filter((e) => e.crew === c.id).length}`),
      sites: SITES.length,
      visits: visits.length,
      costs: costRows.length,
      labor: laborRows.length,
      invoices: invRows.length,
      equipment: EQUIPMENT.length,
    },
    null,
    2
  )
);

if (process.argv.includes("--apply")) {
  const { readFileSync: readEnvFile } = await import("fs");
  const { createClient } = await import("@supabase/supabase-js");
  const envPath = join(__dirname, "..", ".env.local");
  for (const line of readEnvFile(envPath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    process.env[t.slice(0, eq)] = t.slice(eq + 1);
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function clear(table, column = "id") {
    const { error } = await sb
      .from(table)
      .delete()
      .not(column, "is", null);
    if (error) console.log(`clear ${table}:`, error.message);
    else console.log(`cleared ${table}`);
  }

  async function insertBatches(table, rows, size = 200) {
    if (!rows.length) return;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      const { error } = await sb.from(table).insert(chunk);
      if (error) {
        console.error(`insert ${table} @${i}:`, error.message);
        process.exit(1);
      }
      if (i > 0 && i % 1000 === 0) console.log(`  …${table} ${i}/${rows.length}`);
    }
    console.log(`inserted ${rows.length} → ${table}`);
  }

  console.log("\nApplying seed via Supabase service role...");

  await clear("equipment_usage", "equipment_id");
  await clear("payments", "payment_number");
  await clear("invoice_lines", "invoice_id");
  await clear("invoices", "id");
  await clear("visit_labor_entries", "visit_id");
  await clear("visit_costs", "visit_id");
  await clear("service_visits", "id");
  await clear("extra_work_orders", "id");
  await clear("contract_services", "contract_id");
  await clear("support_requests", "customer_id");
  await clear("customer_payment_methods", "customer_id");
  await clear("equipment", "id");
  await clear("contracts", "id");
  await clear("customers", "id");

  const customerRows = SITES.map((s) => ({
    id: s.customerId,
    name: s.companyName,
    property_type: s.propertyType,
    address: s.location,
    contact_name: s.contactName,
    contact_email: s.contactEmail,
    contact_phone: s.contactPhone,
    created_at: s.createdAt,
    notification_prefs:
      s.customerId.endsWith("101")
        ? {
            invoice_reminders: {
              enabled: true,
              channel: "email",
              email: "mchen@riverside-op.com",
              phone: "(662) 555-0142",
            },
          }
        : {},
    customer_notes: s.notes,
  }));
  await insertBatches("customers", customerRows, 50);

  await insertBatches(
    "customer_payment_methods",
    [
      {
        customer_id: "11111111-1111-1111-1111-111111111101",
        nickname: null,
        display_label: "Card ending in 4242",
        method_type: "card",
        is_default: true,
        last_four: "4242",
        expires_month: 8,
        expires_year: 2027,
        billing_name: "Maria Chen",
      },
      {
        customer_id: "11111111-1111-1111-1111-111111111101",
        nickname: null,
        display_label: "Bank account ending in 8821",
        method_type: "bank",
        is_default: false,
        last_four: "8821",
        expires_month: null,
        expires_year: null,
        billing_name: "Riverside Office Park",
      },
    ],
    50
  );

  const contractObjRows = [];
  const serviceObjRows = [];
  SITES.forEach((site, siteIndex) => {
    for (const year of years) {
      if (year < site.startYear) continue;
      const id = contractId(siteIndex, year);
      contractObjRows.push({
        id,
        customer_id: site.customerId,
        title: `${year} Grounds — ${site.companyName.split(" ").slice(0, 2).join(" ")}`,
        status: year < 2026 ? "completed" : "active",
        season_start: `${year}-04-01`,
        season_end: `${year}-11-30`,
        monthly_fee: site.monthlyFee,
        visits_per_week: site.visitsPerWeek,
        billing_method: "monthly",
        notes: site.notes,
        assigned_crew: `Crew ${site.crew}`,
        account_manager: site.accountManager,
        renewal_date: `${year}-11-30`,
      });
      for (const svc of site.services) {
        serviceObjRows.push({ contract_id: id, service_name: svc, included: true });
      }
    }
  });
  contractObjRows.push(
    {
      id: "22222222-2222-2222-2222-222222222205",
      customer_id: "11111111-1111-1111-1111-111111111101",
      title: "2026 Irrigation Monitoring — Riverside",
      status: "active",
      season_start: "2026-04-01",
      season_end: "2026-10-31",
      monthly_fee: 1200,
      visits_per_week: 1,
      billing_method: "monthly",
      notes: "Weekly checks; repairs extra.",
      assigned_crew: "Crew D",
      account_manager: "Cameron Blake",
      renewal_date: "2026-11-30",
    },
    {
      id: "22222222-2222-2222-2222-222222222206",
      customer_id: "11111111-1111-1111-1111-111111111101",
      title: "2026 Parking Lot Islands — Riverside",
      status: "active",
      season_start: "2026-05-01",
      season_end: "2026-11-30",
      monthly_fee: 1600,
      visits_per_week: 1,
      billing_method: "monthly",
      notes: "North/south lot islands.",
      assigned_crew: "Crew A",
      account_manager: "Alex Rivera",
      renewal_date: "2026-11-30",
    }
  );
  serviceObjRows.push(
    { contract_id: "22222222-2222-2222-2222-222222222205", service_name: "Irrigation inspection", included: true },
    { contract_id: "22222222-2222-2222-2222-222222222206", service_name: "Island mowing", included: true }
  );
  await insertBatches("contracts", contractObjRows, 100);
  await insertBatches("contract_services", serviceObjRows, 200);

  await insertBatches(
    "service_visits",
    visits.map((v) => ({
      id: v.id,
      contract_id: v.contractId,
      scheduled_date: v.date,
      status: v.status,
      crew_notes: v.notes,
      completed_at: v.completedAt,
    })),
    150
  );
  await insertBatches("visit_costs", costObjs, 200);
  {
    const { error } = await sb.from("visit_labor_entries").select("id").limit(1);
    if (error) {
      console.log(
        "Skipping visit_labor_entries (table missing). Run supabase/migrations/20260805140000_visit_labor_entries.sql in SQL Editor, then re-apply labor if needed."
      );
    } else {
      await insertBatches("visit_labor_entries", laborObjs, 200);
    }
  }

  await insertBatches(
    "extra_work_orders",
    [
      { id: extraId(1), contract_id: contractId(0, 2026), title: "Mulch Installation — Entrance Beds", description: "18 yards premium mulch.", quoted_amount: 2850, status: "approved", approved_at: "2026-05-20 10:00:00+00" },
      { id: extraId(2), contract_id: contractId(2, 2026), title: "Storm Damage Cleanup", description: "Branch removal after May storm.", quoted_amount: 1450, status: "quoted", approved_at: null },
      { id: extraId(3), contract_id: "22222222-2222-2222-2222-222222222205", title: "Leak repair — Zone 3", description: "Main line repair.", quoted_amount: 980, status: "quoted", approved_at: null },
      { id: extraId(4), contract_id: contractId(3, 2025), title: "Fence-line brush clearing", description: "Metro south fence.", quoted_amount: 2100, status: "completed", approved_at: "2025-07-12 10:00:00+00" },
      { id: extraId(5), contract_id: contractId(4, 2026), title: "Seasonal color — clinic entry", description: "Summer annuals.", quoted_amount: 1100, status: "approved", approved_at: "2026-04-18 10:00:00+00" },
      { id: extraId(6), contract_id: contractId(13, 2026), title: "Detention pond algae treatment", description: "Quarterly treatment package.", quoted_amount: 1750, status: "approved", approved_at: "2026-06-01 10:00:00+00" },
    ],
    50
  );

  await insertBatches("invoices", invoiceObjs, 100);
  await insertBatches("invoice_lines", invoiceLineObjs, 200);
  await insertBatches("payments", paymentObjs, 100);

  await insertBatches(
    "support_requests",
    [
      { customer_id: "11111111-1111-1111-1111-111111111101", category: "question", message: "Confirm July irrigation schedule?", linked_type: "contract", linked_id: "22222222-2222-2222-2222-222222222205", status: "Resolved", resolution_notes: "Confirmed Tuesday checks.", created_at: "2026-06-15 14:00:00+00" },
      { customer_id: "11111111-1111-1111-1111-111111111101", category: "billing_dispute", message: "Review mulch line on INV-EW01.", linked_type: "invoice", linked_id: storyInv2, status: "Open", resolution_notes: null, created_at: "2026-07-02 10:30:00+00" },
      { customer_id: "11111111-1111-1111-1111-111111111102", category: "concern", message: "North gate code changed.", linked_type: "contract", linked_id: contractId(1, 2026), status: "Open", resolution_notes: null, created_at: "2026-08-01 15:20:00+00" },
      { customer_id: "11111111-1111-1111-1111-111111111103", category: "complaint", message: "Front walk edging missed.", linked_type: "contract", linked_id: contractId(2, 2026), status: "In Progress", resolution_notes: null, created_at: "2026-08-03 11:05:00+00" },
      { customer_id: "11111111-1111-1111-1111-111111111107", category: "concern", message: "Building 3 controller fault after storms.", linked_type: "contract", linked_id: contractId(6, 2026), status: "Open", resolution_notes: null, created_at: "2026-08-02 16:40:00+00" },
      { customer_id: "11111111-1111-1111-1111-111111111113", category: "question", message: "Can pond treatment be scheduled mid-week?", linked_type: "contract", linked_id: contractId(12, 2026), status: "Open", resolution_notes: null, created_at: "2026-08-04 09:15:00+00" },
    ],
    50
  );

  const equipRows = EQUIPMENT.map(([n, name, cat, purchase, cost, salvage, y, m, hours, status, notes]) => ({
    id: equipId(n),
    name,
    // Remote DB enum uses "Trucks" (migration file says Trucks/Trailers — map for live schema)
    category: cat === "Trucks/Trailers" ? "Trucks" : cat,
    purchase_date: purchase,
    cost,
    salvage_value: salvage,
    useful_life_years: y,
    useful_life_months: m,
    estimated_total_hours: hours,
    status,
    notes,
    retired_at: n === 41 ? "2025-11-01" : n === 42 ? "2026-01-20" : null,
  }));
  await insertBatches("equipment", equipRows, 50);
  await insertBatches("equipment_usage", usageObjs, 200);

  const { count: custCount } = await sb
    .from("customers")
    .select("*", { count: "exact", head: true });
  const { count: visitCount } = await sb
    .from("service_visits")
    .select("*", { count: "exact", head: true });
  const { count: equipCount } = await sb
    .from("equipment")
    .select("*", { count: "exact", head: true });
  console.log(
    `\nDone. customers=${custCount} visits=${visitCount} equipment=${equipCount}`
  );
}
