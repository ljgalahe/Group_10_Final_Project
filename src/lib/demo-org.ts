/**
 * Shared GreenScape demo org — large commercial landscaping company.
 * 8 crews: A–E = 10 people (incl. lead), F–H = 5 people (incl. lead).
 * Mar–Nov full seasonal crews; winter = leads + year-round techs.
 */

export type DemoCrewId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export type DemoEmployee = {
  id: string;
  name: string;
  role: "Crew lead" | "Crew Member" | "Equipment Operator" | "Irrigation Tech";
  crew: DemoCrewId;
  payRate: number;
  yearRound: boolean;
};

export type DemoSite = {
  customerId: string;
  companyName: string;
  propertyType: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  createdAt: string;
  lat: number;
  lng: number;
  crew: DemoCrewId;
  accountManager: string;
  monthlyFee: number;
  visitsPerWeek: number;
  /** Target contribution margin % for seed costs (industry-typical 12–38). */
  targetMarginPct: number;
  services: string[];
  summerJobs: string[];
  winterJobs: string[];
  notes: string;
  startYear: number;
};

export const DEMO_COMPANY_FOUNDED = "2024-03-01";
export const DEMO_TODAY = "2026-08-05";

/** GreenScape equipment yard — morning dispatch start for every crew route. */
export const DEMO_YARD = {
  name: "GreenScape Yard",
  address: "1850 Highway 6 West, Oxford, MS",
  lat: 34.3518,
  lng: -89.5486,
} as const;

export const DEMO_EMPLOYEES: DemoEmployee[] = (() => {
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
    "Rogers", "Stone", "Turner", "Underwood", "Vaughn", "Watts", "Young",
    "Zimmerman",
  ];
  const specs: {
    id: DemoCrewId;
    lead: string;
    leadId: string;
    rate: number;
    size: 10 | 5;
  }[] = [
    { id: "A", lead: "Alex Rivera", leadId: "crew-alex", rate: 32, size: 10 },
    { id: "B", lead: "Taylor Brooks", leadId: "crew-b-lead", rate: 33, size: 10 },
    { id: "C", lead: "Sam Ortiz", leadId: "crew-c-lead", rate: 31, size: 10 },
    { id: "D", lead: "Cameron Blake", leadId: "crew-d-lead", rate: 34, size: 10 },
    { id: "E", lead: "Jordan Hale", leadId: "crew-e-lead", rate: 32, size: 10 },
    { id: "F", lead: "Riley Vance", leadId: "crew-f-lead", rate: 30, size: 5 },
    { id: "G", lead: "Morgan Ellis", leadId: "crew-g-lead", rate: 30, size: 5 },
    { id: "H", lead: "Casey Boone", leadId: "crew-h-lead", rate: 29, size: 5 },
  ];
  const out: DemoEmployee[] = [];
  let nameCursor = 0;
  for (const spec of specs) {
    out.push({
      id: spec.leadId,
      name: spec.lead,
      role: "Crew lead",
      crew: spec.id,
      payRate: spec.rate,
      yearRound: true,
    });
    if (spec.id === "A") {
      out.push({
        id: "crew-1",
        name: "Jordan Miles",
        role: "Crew Member",
        crew: "A",
        payRate: 22,
        yearRound: false,
      });
    }
    if (spec.id === "D") {
      out.push({
        id: "crew-d-tech",
        name: "Skylar Reed",
        role: "Irrigation Tech",
        crew: "D",
        payRate: 26,
        yearRound: true,
      });
    }
    const have = out.filter((e) => e.crew === spec.id).length;
    for (let i = have; i < spec.size; i++) {
      const name = `${FIRST[nameCursor % FIRST.length]} ${LAST[nameCursor % LAST.length]}`;
      nameCursor += 1;
      const isOp = i === have;
      out.push({
        id: `crew-${spec.id.toLowerCase()}-${i + 1}`,
        name,
        role: isOp ? "Equipment Operator" : "Crew Member",
        crew: spec.id,
        payRate: isOp ? 24 : 20 + (i % 4),
        yearRound: false,
      });
    }
  }
  return out;
})();

export const CREW_LEADS: Record<DemoCrewId, string> = {
  A: "Alex Rivera",
  B: "Taylor Brooks",
  C: "Sam Ortiz",
  D: "Cameron Blake",
  E: "Jordan Hale",
  F: "Riley Vance",
  G: "Morgan Ellis",
  H: "Casey Boone",
};

export type CrewLeadOption = {
  crew: DemoCrewId;
  name: string;
  leadId: string;
};

export const CREW_LEAD_OPTIONS: CrewLeadOption[] = (
  Object.keys(CREW_LEADS) as DemoCrewId[]
).map((crew) => {
  const lead = DEMO_EMPLOYEES.find(
    (e) => e.crew === crew && e.role === "Crew lead"
  );
  return {
    crew,
    name: CREW_LEADS[crew],
    leadId: lead?.id ?? `crew-${crew.toLowerCase()}-lead`,
  };
});

/** ~28 commercial accounts — large Oxford / North MS book. */
export const DEMO_SITES: DemoSite[] = [
  {
    customerId: "11111111-1111-1111-1111-111111111101",
    companyName: "Riverside Office Park",
    propertyType: "Office Park",
    location: "1200 University Ave, Oxford, MS",
    contactName: "Maria Chen",
    contactEmail: "mchen@riverside-op.com",
    contactPhone: "(662) 555-0142",
    createdAt: "2024-03-15 10:00:00+00",
    lat: 34.3702,
    lng: -89.5251,
    crew: "A",
    accountManager: "Alex Rivera",
    monthlyFee: 4200,
    visitsPerWeek: 2,
    targetMarginPct: 28,
    services: ["Mowing", "Edging", "Trimming", "Spring Cleanup"],
    summerJobs: ["Mowing & edging", "Hedge trimming", "Weekly grounds", "Bed cleanup"],
    winterJobs: ["Leaf blowing — lots", "Entrance hardscape blow-off", "Equipment yard maintenance"],
    notes: "Security dog near rear lot. Stage trailers in service bay only.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111102",
    companyName: "Summit Retail Center",
    propertyType: "Retail Center",
    location: "450 Jackson Ave W, Oxford, MS",
    contactName: "James Ortiz",
    contactEmail: "jortiz@summitretail.com",
    contactPhone: "(662) 555-0188",
    createdAt: "2024-04-10 10:00:00+00",
    lat: 34.3624,
    lng: -89.5128,
    crew: "B",
    accountManager: "Taylor Brooks",
    monthlyFee: 5800,
    visitsPerWeek: 3,
    targetMarginPct: 32,
    services: ["Mowing", "Edging", "Fertilization"],
    summerJobs: ["Retail frontage mow", "Fertilization", "Retail maintenance", "Edging pass"],
    winterJobs: ["Storefront leaf blow", "Parking island cleanup", "Equipment maintenance — Crew B"],
    notes: "No leaf blowing before 9 AM near storefronts.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111103",
    companyName: "Harbor View HOA",
    propertyType: "HOA",
    location: "88 South Lamar Blvd, Oxford, MS",
    contactName: "Pat Simmons",
    contactEmail: "psimmons@harborviewhoa.org",
    contactPhone: null,
    createdAt: "2024-06-01 10:00:00+00",
    lat: 34.3756,
    lng: -89.5084,
    crew: "A",
    accountManager: "Alex Rivera",
    monthlyFee: 3100,
    visitsPerWeek: 1,
    targetMarginPct: 22,
    services: ["Mowing", "Bed Weeding"],
    summerJobs: ["HOA common areas", "Entrance beds", "Bed weeding", "Leaf cleanup"],
    winterJobs: ["Common-area leaf blow", "Playground perimeter cleanup"],
    notes: "Keep side gate latched. Avoid playground during pickup hours.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111104",
    companyName: "Metro Industrial Complex",
    propertyType: "Industrial",
    location: "900 Molly Barr Rd, Oxford, MS",
    contactName: "Dana Brooks",
    contactEmail: "dbrooks@metroindustrial.com",
    contactPhone: "(662) 555-0199",
    createdAt: "2024-08-20 10:00:00+00",
    lat: 34.3558,
    lng: -89.5302,
    crew: "C",
    accountManager: "Sam Ortiz",
    monthlyFee: 7200,
    visitsPerWeek: 2,
    targetMarginPct: 8,
    services: ["Mowing", "Detention Pond Maintenance"],
    summerJobs: ["Pond & industrial grounds", "Lot perimeter mow", "Detention pond check", "Fence-line trim"],
    winterJobs: ["Industrial lot leaf blow", "Pond outlet winter check", "Yard equipment overhaul"],
    notes: "PPE required. High labor variance — thin margin account.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111105",
    companyName: "Oxford Square Medical Campus",
    propertyType: "Medical Campus",
    location: "2100 S Lamar Blvd, Oxford, MS",
    contactName: "Elena Vargas",
    contactEmail: "evargas@oxfordsquaremed.com",
    contactPhone: "(662) 555-0160",
    createdAt: "2024-05-01 10:00:00+00",
    lat: 34.3489,
    lng: -89.5175,
    crew: "B",
    accountManager: "Taylor Brooks",
    monthlyFee: 4900,
    visitsPerWeek: 2,
    targetMarginPct: 26,
    services: ["Mowing", "Edging", "Bed Weeding"],
    summerJobs: ["Campus lawns", "Clinic entrance beds", "Sidewalk edging", "Mulch refresh"],
    winterJobs: ["Clinic walkway blow-off", "Equipment sharpening day"],
    notes: "Quiet hours near outpatient wing until 8 AM.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111106",
    companyName: "Grove Park Apartments",
    propertyType: "Multifamily",
    location: "700 Old Taylor Rd, Oxford, MS",
    contactName: "Chris Lang",
    contactEmail: "clang@groveparkapts.com",
    contactPhone: "(662) 555-0171",
    createdAt: "2024-09-12 10:00:00+00",
    lat: 34.3591,
    lng: -89.5412,
    crew: "C",
    accountManager: "Sam Ortiz",
    monthlyFee: 3800,
    visitsPerWeek: 2,
    targetMarginPct: 24,
    services: ["Mowing", "Edging", "Trimming"],
    summerJobs: ["Courtyard mow", "Pool deck edge", "Building perimeter trim", "Dumpster pad blow"],
    winterJobs: ["Courtyard leaf blow", "Amenity hardscape cleanup"],
    notes: "Stage trailers on east curb only after 5 PM.",
    startYear: 2024,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111107",
    companyName: "Northgate Business Park",
    propertyType: "Business Park",
    location: "1550 Highway 7 N, Oxford, MS",
    contactName: "Quinn Foster",
    contactEmail: "qfoster@northgatebp.com",
    contactPhone: "(662) 555-0133",
    createdAt: "2025-01-08 10:00:00+00",
    lat: 34.3895,
    lng: -89.5288,
    crew: "E",
    accountManager: "Jordan Hale",
    monthlyFee: 6400,
    visitsPerWeek: 2,
    targetMarginPct: 30,
    services: ["Mowing", "Edging", "Fertilization", "Bed Weeding"],
    summerJobs: ["Park lawns", "Monument bed detail", "Lot island mow", "Fertilizer pass"],
    winterJobs: ["Monument bed leaf removal", "Fleet maintenance — Crew E"],
    notes: "Large irrigated lawns — escalate controller issues to the irrigation tech.",
    startYear: 2025,
  },
  {
    customerId: "11111111-1111-1111-1111-111111111108",
    companyName: "College Hill Church Campus",
    propertyType: "Institutional",
    location: "1400 College Hill Rd, Oxford, MS",
    contactName: "Rev. Anita Cole",
    contactEmail: "acole@collegehill.org",
    contactPhone: "(662) 555-0122",
    createdAt: "2025-03-01 10:00:00+00",
    lat: 34.3812,
    lng: -89.5496,
    crew: "D",
    accountManager: "Cameron Blake",
    monthlyFee: 2700,
    visitsPerWeek: 1,
    targetMarginPct: 20,
    services: ["Mowing", "Irrigation Inspection", "Bed Weeding"],
    summerJobs: ["Campus mow", "Irrigation inspection", "Entrance beds", "Controller check"],
    winterJobs: ["Winterize irrigation", "Leaf blow — sanctuary walks", "Controller bench test"],
    notes: "No Sunday work 8 AM–1 PM.",
    startYear: 2025,
  },
  // Additional large-book sites
  ...makeExtraSites(),
];

function makeExtraSites(): DemoSite[] {
  const extras: Array<
    Omit<
      DemoSite,
      "customerId" | "createdAt" | "lat" | "lng" | "summerJobs" | "winterJobs" | "services"
    > & { idx: number; services?: string[] }
  > = [
    { idx: 9, companyName: "Ole Miss Innovation Hub", propertyType: "Campus", location: "100 Research Blvd, Oxford, MS", contactName: "Dr. Leah Price", contactEmail: "lprice@omih.org", contactPhone: "(662) 555-0201", crew: "E", accountManager: "Jordan Hale", monthlyFee: 5100, visitsPerWeek: 2, targetMarginPct: 27, startYear: 2024, notes: "Badge access at north loading dock. Avoid lab courtyard during class change." },
    { idx: 10, companyName: "Baptist Memorial Oxford", propertyType: "Medical Campus", location: "1100 Belk Blvd, Oxford, MS", contactName: "Tom Nguyen", contactEmail: "tnguyen@bmhoxf.org", contactPhone: "(662) 555-0202", crew: "B", accountManager: "Taylor Brooks", monthlyFee: 6800, visitsPerWeek: 3, targetMarginPct: 18, startYear: 2024, notes: "Quiet hours near ER entrance until 8 AM. No blowers by patient windows." },
    { idx: 11, companyName: "Thacker Mountain Retail Row", propertyType: "Retail Center", location: "320 N Lamar Blvd, Oxford, MS", contactName: "Gina Holt", contactEmail: "gholt@thackerrow.com", contactPhone: "(662) 555-0203", crew: "F", accountManager: "Riley Vance", monthlyFee: 2900, visitsPerWeek: 2, targetMarginPct: 25, startYear: 2024, notes: "Keep sidewalks clear for shoppers. Park trailers behind the alley only." },
    { idx: 12, companyName: "Whisper Lake HOA", propertyType: "HOA", location: "50 Whisper Lake Dr, Oxford, MS", contactName: "Bill Kearney", contactEmail: "bkearney@whisperlake.org", contactPhone: null, crew: "G", accountManager: "Morgan Ellis", monthlyFee: 4500, visitsPerWeek: 2, targetMarginPct: 21, startYear: 2024, notes: "Gate code 3381. Stay off private docks and common pool deck furniture." },
    { idx: 13, companyName: "Oxford Distribution Center", propertyType: "Industrial", location: "2400 Highway 6 W, Oxford, MS", contactName: "Nina Shah", contactEmail: "nshah@oxdist.com", contactPhone: "(662) 555-0205", crew: "C", accountManager: "Sam Ortiz", monthlyFee: 8100, visitsPerWeek: 2, targetMarginPct: 14, startYear: 2024, notes: "PPE required past the guard shack. Stay clear of truck lanes 6–10 AM." },
    { idx: 14, companyName: "Square Civic Plaza", propertyType: "Municipal", location: "1 Courthouse Sq, Oxford, MS", contactName: "City Parks Desk", contactEmail: "parks@oxfordms.net", contactPhone: "(662) 555-0206", crew: "F", accountManager: "Riley Vance", monthlyFee: 2200, visitsPerWeek: 1, targetMarginPct: 16, startYear: 2025, notes: "Coordinate with events calendar. No equipment on brick pavers during markets." },
    { idx: 15, companyName: "Lakeside Corporate Campus", propertyType: "Business Park", location: "880 Lakeside Dr, Oxford, MS", contactName: "Omar Haddad", contactEmail: "ohaddad@lakesidecc.com", contactPhone: "(662) 555-0207", crew: "A", accountManager: "Alex Rivera", monthlyFee: 7600, visitsPerWeek: 3, targetMarginPct: 29, startYear: 2024, notes: "Stage on the east service road. Dog park fence must stay latched." },
    { idx: 16, companyName: "Cedar Ridge Townhomes", propertyType: "Multifamily", location: "415 Cedar Ridge Rd, Oxford, MS", contactName: "Paula Ortiz", contactEmail: "portiz@cedarridge.com", contactPhone: "(662) 555-0208", crew: "H", accountManager: "Casey Boone", monthlyFee: 3400, visitsPerWeek: 2, targetMarginPct: 23, startYear: 2025, notes: "Avoid unit patios. Residents walk dogs on the west path mornings." },
    { idx: 17, companyName: "Powerhouse Storage Yards", propertyType: "Industrial", location: "1900 Industry Park Dr, Oxford, MS", contactName: "Rick Malone", contactEmail: "rmalone@phstorage.com", contactPhone: "(662) 555-0209", crew: "C", accountManager: "Sam Ortiz", monthlyFee: 3900, visitsPerWeek: 1, targetMarginPct: 11, startYear: 2025, notes: "Call ahead for gate unlock. Watch for loose gravel near bay 4." },
    { idx: 18, companyName: "Oxford University Mall Pads", propertyType: "Retail Center", location: "1600 W Jackson Ave, Oxford, MS", contactName: "Shelly Grant", contactEmail: "sgrant@oumall.com", contactPhone: "(662) 555-0210", crew: "B", accountManager: "Taylor Brooks", monthlyFee: 5400, visitsPerWeek: 2, targetMarginPct: 27, startYear: 2024, notes: "No leaf blowing before 9 AM near storefronts. Use rear loading pads." },
    { idx: 19, companyName: "Clear Creek Apartments", propertyType: "Multifamily", location: "925 Clear Creek Blvd, Oxford, MS", contactName: "Ivan Petrov", contactEmail: "ipetrov@clearcreek.com", contactPhone: "(662) 555-0211", crew: "G", accountManager: "Morgan Ellis", monthlyFee: 4100, visitsPerWeek: 2, targetMarginPct: 19, startYear: 2025, notes: "Keep playground clear during after-school hours. Office has spare gate key." },
    { idx: 20, companyName: "Highway 7 Auto Plaza", propertyType: "Retail Center", location: "2010 Highway 7 S, Oxford, MS", contactName: "Dana Cho", contactEmail: "dcho@h7auto.com", contactPhone: "(662) 555-0212", crew: "H", accountManager: "Casey Boone", monthlyFee: 2600, visitsPerWeek: 1, targetMarginPct: 17, startYear: 2025, notes: "Stay off display vehicle pads. Blow toward curb, not showroom glass." },
    { idx: 21, companyName: "North MS Logistics Hub", propertyType: "Industrial", location: "500 Commerce Way, Batesville, MS", contactName: "Frank Doyle", contactEmail: "fdoyle@nmlogistics.com", contactPhone: "(662) 555-0213", crew: "E", accountManager: "Jordan Hale", monthlyFee: 9200, visitsPerWeek: 2, targetMarginPct: 13, startYear: 2025, notes: "High-visibility vests required. Check in at shipping office before entering yards." },
    { idx: 22, companyName: "Bramlett Gardens HOA", propertyType: "HOA", location: "77 Bramlett Blvd, Oxford, MS", contactName: "Helen Cho", contactEmail: "hcho@bramlett.org", contactPhone: null, crew: "F", accountManager: "Riley Vance", monthlyFee: 3600, visitsPerWeek: 2, targetMarginPct: 24, startYear: 2025, notes: "Mailbox cluster is off-limits for staging. Leave common beds mulched evenly." },
    { idx: 23, companyName: "South Campus Athletic Fields", propertyType: "Institutional", location: "1800 Hill Dr, Oxford, MS", contactName: "Coach Ray Mills", contactEmail: "rmills@athletics.edu", contactPhone: "(662) 555-0215", crew: "D", accountManager: "Cameron Blake", monthlyFee: 8700, visitsPerWeek: 3, targetMarginPct: 15, startYear: 2025, notes: "Do not cross marked practice fields. Irrigation clocks are in the shed by field 2." },
    { idx: 24, companyName: "West End Medical Offices", propertyType: "Medical Campus", location: "600 West Jackson Ave, Oxford, MS", contactName: "Dr. Sara Kim", contactEmail: "skim@wemed.com", contactPhone: "(662) 555-0216", crew: "G", accountManager: "Morgan Ellis", monthlyFee: 3300, visitsPerWeek: 1, targetMarginPct: 26, startYear: 2025, notes: "Quiet near outpatient wing until 8 AM. Park in staff overflow only." },
    { idx: 25, companyName: "Pontotoc Road Flex Warehouses", propertyType: "Industrial", location: "4400 Pontotoc Rd, Oxford, MS", contactName: "Luis Mendez", contactEmail: "lmendez@prflex.com", contactPhone: "(662) 555-0217", crew: "H", accountManager: "Casey Boone", monthlyFee: 4700, visitsPerWeek: 2, targetMarginPct: 12, startYear: 2025, notes: "Forklift traffic on apron — use cones. Lock dumpster gates when finished." },
    { idx: 26, companyName: "Downtown Inn Courtyard", propertyType: "Hospitality", location: "400 Van Buren Ave, Oxford, MS", contactName: "Amy Rhodes", contactEmail: "arhodes@dtinn.com", contactPhone: "(662) 555-0218", crew: "F", accountManager: "Riley Vance", monthlyFee: 2100, visitsPerWeek: 2, targetMarginPct: 22, startYear: 2025, notes: "Guest quiet hours 10 PM–7 AM. Water features stay on — wipe splash on stone." },
    { idx: 27, companyName: "Eastgate Self Storage", propertyType: "Industrial", location: "1300 Eastgate Dr, Oxford, MS", contactName: "Ben Clark", contactEmail: "bclark@eastgatess.com", contactPhone: "(662) 555-0219", crew: "H", accountManager: "Casey Boone", monthlyFee: 1800, visitsPerWeek: 1, targetMarginPct: 35, startYear: 2025, notes: "Office opens 8 AM. Keep aisle lanes clear for customer trucks." },
    { idx: 28, companyName: "County Fairgrounds Perimeter", propertyType: "Municipal", location: "1500 Fairgrounds Rd, Oxford, MS", contactName: "Parks Admin", contactEmail: "fairgrounds@lafayette.ms.gov", contactPhone: "(662) 555-0220", crew: "E", accountManager: "Jordan Hale", monthlyFee: 5500, visitsPerWeek: 1, targetMarginPct: 10, startYear: 2025, notes: "Confirm event schedule before mowing. Temporary fencing may block east gate." },
  ];

  return extras.map((e) => {
    const idNum = String(100 + e.idx).slice(-2);
    const customerId = `11111111-1111-1111-1111-1111111111${idNum}`;
    const lat = 34.34 + (e.idx % 10) * 0.006;
    const lng = -89.55 + (e.idx % 8) * 0.007;
    return {
      customerId,
      companyName: e.companyName,
      propertyType: e.propertyType,
      location: e.location,
      contactName: e.contactName,
      contactEmail: e.contactEmail,
      contactPhone: e.contactPhone,
      createdAt: `${e.startYear}-04-01 10:00:00+00`,
      lat,
      lng,
      crew: e.crew,
      accountManager: e.accountManager,
      monthlyFee: e.monthlyFee,
      visitsPerWeek: e.visitsPerWeek,
      targetMarginPct: e.targetMarginPct,
      services: e.services ?? ["Mowing", "Edging", "Trimming"],
      summerJobs: ["Grounds maintenance", "Bed detail", "Edge & blow", "Fertilizer / weed pass"],
      winterJobs: ["Leaf blow", "Hardscape cleanup", "Shop / equipment maintenance"],
      notes: e.notes,
      startYear: e.startYear,
    };
  });
}

/** Resolve which crew owns a customer site (by id or company name). */
export function crewForCustomer(
  customerId: string,
  companyName?: string
): DemoCrewId | null {
  const byId = DEMO_SITES.find((s) => s.customerId === customerId);
  if (byId) return byId.crew;
  if (companyName) {
    const byName = DEMO_SITES.find(
      (s) => s.companyName.toLowerCase() === companyName.toLowerCase()
    );
    if (byName) return byName.crew;
  }
  return null;
}

export function employeesForCrew(
  crew: DemoCrewId,
  opts?: { dateIso?: string; forVisit?: boolean }
): DemoEmployee[] {
  const dateIso = opts?.dateIso;
  const month = dateIso ? Number(dateIso.slice(5, 7)) : 6;
  const inFullSeason = month >= 3 && month <= 11;
  let members = DEMO_EMPLOYEES.filter((e) => {
    if (e.crew !== crew) return false;
    if (inFullSeason) return true;
    return e.yearRound;
  });
  // Typical stop uses a working party, not always the full 10
  if (opts?.forVisit && members.length > 6) {
    const lead = members.find((m) => m.role === "Crew lead");
    const rest = members.filter((m) => m !== lead);
    const partySize = 5 + (hash(dateIso ?? crew) % 3); // 5–7
    members = lead
      ? [lead, ...rest.slice(0, partySize - 1)]
      : rest.slice(0, partySize);
  }
  return members;
}

function hash(s: string) {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function crewLabel(crew: DemoCrewId) {
  return `Crew ${crew}`;
}

export function weeklyHourTarget(dateIso: string): number {
  const month = Number(dateIso.slice(5, 7));
  const day = Number(dateIso.slice(8, 10));
  if (month >= 6 && month <= 8) {
    return Math.ceil(day / 7) % 2 === 0 ? 50 : 40;
  }
  if ((month === 4 || month === 5 || month === 9 || month === 10) && day > 20) {
    return 45;
  }
  if (month === 12 || month <= 2) return 32;
  return 40;
}

export function isWinterMonth(month: number) {
  return month === 12 || month === 1 || month === 2;
}

export function isFullCrewMonth(month: number) {
  return month >= 3 && month <= 11;
}

/** Revenue per visit from monthly fee — used to size realistic direct costs. */
export function allocatedRevenuePerVisit(site: DemoSite) {
  const monthlyVisits = Math.max(site.visitsPerWeek * 4.33, 1);
  return site.monthlyFee / monthlyVisits;
}
