/**
 * Seed Riverside customer quote→contract pipeline demos for Manager + Ops + Customer.
 * Usage: node scripts/seed-riverside-quote-pipeline.mjs
 * Reads .env.local (does not print secrets). Target: ashhludptczpogtwmzvd only.
 *
 * Creates:
 *  1) pending_manager_approval → Manager Contracts "Quotes Pending Approval"
 *  2) approved + no draft → Ops "Draft Contracts" → Create Contract
 *  3) approved/contract_drafted + draft contract (approval_state draft)
 *     → Ops "Draft Contracts" → (Draft) Continue Editing
 *  4) approved + contract sent (approval_state pending_customer)
 *     → Ops contracts table (top) + Customer "Proposed Contract"
 *
 * Items 2–4 are separate Riverside jobs (different scopes), same customer.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEMO_CUSTOMER_ID = "11111111-1111-1111-1111-111111111101";
const RIVERSIDE_ADDRESS = "1200 University Ave, Oxford, MS";

/** Stable IDs so re-runs upsert instead of duplicating */
const PENDING_QUOTE_ID = "b2000000-0000-4000-8000-000000000021";
const APPROVED_QUOTE_ID = "b2000000-0000-4000-8000-000000000022";
const DRAFT_QUOTE_ID = "b2000000-0000-4000-8000-000000000023";
const DRAFT_CONTRACT_ID = "c2000000-0000-4000-8000-000000000023";
const SENT_QUOTE_ID = "b2000000-0000-4000-8000-000000000024";
const SENT_CONTRACT_ID = "c2000000-0000-4000-8000-000000000024";

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1);
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url.includes("ashhludptczpogtwmzvd")) {
  console.error(
    "Refusing to run: URL is not Group_10 project ashhludptczpogtwmzvd"
  );
  process.exit(1);
}
if (!key) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function riversideLineItems(keys, acres = 5.5) {
  const catalog = {
    mowing: { label: "Mowing & Grounds Care", mid: 42 },
    edging: { label: "Edging", mid: 22 },
    irrigation: { label: "Irrigation monitoring", mid: 45 },
    fertilization: { label: "Fertilization & Weed Control", mid: 55 },
    leaf_cleanup: { label: "Leaf Cleanup", mid: 40 },
    seasonal_color: { label: "Seasonal Color beds", mid: 70 },
  };
  return keys.map((k) => {
    const c = catalog[k] ?? { label: k, mid: 50 };
    const unitPrice = c.mid;
    return {
      serviceKey: k,
      label: c.label,
      acres,
      unitPrice,
      lineTotal: Math.round(unitPrice * acres * 100) / 100,
    };
  });
}

async function upsertQuote(id, payload) {
  const { data: existing } = await sb
    .from("quote_requests")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  const now = new Date().toISOString();
  const row = { ...payload, id, updated_at: now };

  if (existing?.id) {
    const { error } = await sb.from("quote_requests").update(row).eq("id", id);
    if (error) throw new Error(`update quote ${id}: ${error.message}`);
    return id;
  }

  const { error } = await sb
    .from("quote_requests")
    .insert({ ...row, created_at: now });
  if (error) throw new Error(`insert quote ${id}: ${error.message}`);
  return id;
}

async function upsertDraftContract(id, payload) {
  const { data: existing } = await sb
    .from("contracts")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  const row = { ...payload, id };

  if (existing?.id) {
    const { error } = await sb.from("contracts").update(row).eq("id", id);
    if (error) throw new Error(`update contract ${id}: ${error.message}`);
    return id;
  }

  const { error } = await sb.from("contracts").insert(row);
  if (error) throw new Error(`insert contract ${id}: ${error.message}`);
  return id;
}

async function main() {
  console.log("Seeding Riverside quote→contract pipeline demos...");

  const { data: customer, error: custErr } = await sb
    .from("customers")
    .select("id, name, address")
    .eq("id", DEMO_CUSTOMER_ID)
    .maybeSingle();

  if (custErr) throw new Error(`customer lookup: ${custErr.message}`);
  if (!customer) {
    const { data: byName } = await sb
      .from("customers")
      .select("id, name, address")
      .ilike("name", "%Riverside%")
      .limit(1)
      .maybeSingle();
    if (!byName) {
      throw new Error(
        "Riverside customer not found (expected id 11111111-1111-1111-1111-111111111101)"
      );
    }
    console.log("Using Riverside by name:", byName.id, byName.name);
  } else {
    console.log("Customer:", customer.name, `(${customer.id})`);
  }

  const customerId = customer?.id ?? DEMO_CUSTOMER_ID;
  const address = customer?.address || RIVERSIDE_ADDRESS;

  const pendingItems = riversideLineItems(["mowing", "edging", "fertilization"]);
  const pendingMonthly = pendingItems.reduce((s, li) => s + li.lineTotal, 0);

  // Job A — office park grounds (untouched approved → Create Contract)
  const officeParkItems = riversideLineItems(
    ["mowing", "edging", "leaf_cleanup"],
    6.0
  );
  const officeParkMonthly = officeParkItems.reduce(
    (s, li) => s + li.lineTotal,
    0
  );

  // Job B — parking lot bed / irrigation add-on (draft in progress → Continue Editing)
  const parkingLotItems = riversideLineItems(
    ["irrigation", "seasonal_color", "fertilization"],
    2.5
  );
  const parkingLotMonthly = parkingLotItems.reduce(
    (s, li) => s + li.lineTotal,
    0
  );

  // Job C — front entrance monument / weekly detail (already sent → Proposed Contract)
  const entranceItems = riversideLineItems(
    ["mowing", "edging", "seasonal_color", "leaf_cleanup"],
    3.25
  );
  const entranceMonthly = entranceItems.reduce((s, li) => s + li.lineTotal, 0);

  const seasonStart = "2026-09-01";
  const seasonEnd = "2027-03-31";
  const submittedAt = new Date().toISOString();
  const approvedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  // Newer than other demos so Ops list (created_at desc) keeps it near the top.
  const sentCreatedAt = new Date(Date.now() + 60 * 1000).toISOString();

  await upsertQuote(PENDING_QUOTE_ID, {
    customer_id: customerId,
    service_description:
      "Fall grounds enhancement — courtyard & frontage (Riverside)",
    notes:
      "Demo: Ops submitted for management approval. Customer POV = Riverside Office Park.",
    property_address: address,
    status: "pending_manager_approval",
    line_items: pendingItems,
    monthly_fee: pendingMonthly,
    visits_per_week: 2,
    visit_frequency_notes: "Tue / Fri morning preference; avoid rear lot dog hours.",
    season_start: seasonStart,
    season_end: seasonEnd,
    submitted_for_approval_at: submittedAt,
    manager_approved_at: null,
    draft_contract_id: null,
    survey_id: null,
  });

  await upsertQuote(APPROVED_QUOTE_ID, {
    customer_id: customerId,
    service_description:
      "Riverside Office Park — seasonal grounds & leaf program",
    notes:
      "Demo job A: Manager approved office-park grounds. Ops → Create Contract (no draft yet).",
    property_address: address,
    status: "approved",
    line_items: officeParkItems,
    monthly_fee: officeParkMonthly,
    visits_per_week: 2,
    visit_frequency_notes: "Mon / Thu grounds; leaf sweeps after wind events.",
    season_start: seasonStart,
    season_end: seasonEnd,
    submitted_for_approval_at: approvedAt,
    manager_approved_at: approvedAt,
    draft_contract_id: null,
    survey_id: null,
  });

  await upsertDraftContract(DRAFT_CONTRACT_ID, {
    customer_id: customerId,
    title: "Riverside Parking Lot Beds — Irrigation & Seasonal Color",
    status: "draft",
    approval_state: "draft",
    season_start: seasonStart,
    season_end: seasonEnd,
    monthly_fee: parkingLotMonthly,
    visits_per_week: 1,
    billing_method: "monthly",
    notes: [
      "Demo job B: Separate Riverside scope (parking lot beds), not the office-park grounds job.",
      "Visit frequency: Weekly irrigation check; color beds monthly refresh.",
    ].join("\n"),
    assigned_crew: "Alex Rivera",
    account_manager: "Operations",
    quote_id: DRAFT_QUOTE_ID,
    drafted_by_role: "operations",
    manager_approved_at: approvedAt,
    customer_signed_at: null,
    customer_signature_name: null,
  });

  // Ensure contract_services exist for the draft (replace on re-run)
  await sb.from("contract_services").delete().eq("contract_id", DRAFT_CONTRACT_ID);
  if (parkingLotItems.length > 0) {
    const { error: svcErr } = await sb.from("contract_services").insert(
      parkingLotItems.map((li) => ({
        contract_id: DRAFT_CONTRACT_ID,
        service_name: li.label,
        included: true,
      }))
    );
    if (svcErr) throw new Error(`contract_services: ${svcErr.message}`);
  }

  await upsertQuote(DRAFT_QUOTE_ID, {
    customer_id: customerId,
    service_description:
      "Riverside parking lot beds — irrigation & seasonal color add-on",
    notes:
      "Demo job B: Separate Riverside job (parking lot beds). Draft contract started; not sent to customer yet.",
    property_address: address,
    status: "contract_drafted",
    line_items: parkingLotItems,
    monthly_fee: parkingLotMonthly,
    visits_per_week: 1,
    visit_frequency_notes: "Weekly irrigation check; color beds monthly refresh.",
    season_start: seasonStart,
    season_end: seasonEnd,
    submitted_for_approval_at: approvedAt,
    manager_approved_at: approvedAt,
    draft_contract_id: DRAFT_CONTRACT_ID,
    survey_id: null,
  });

  // Job C — sent to customer (matches sendContractToCustomer: pending_customer + draft status)
  await upsertDraftContract(SENT_CONTRACT_ID, {
    customer_id: customerId,
    title: "Riverside Front Entrance — Monument Beds & Weekly Detail",
    status: "draft",
    approval_state: "pending_customer",
    season_start: seasonStart,
    season_end: seasonEnd,
    monthly_fee: entranceMonthly,
    visits_per_week: 2,
    billing_method: "monthly",
    notes: [
      "Demo job C: Third Riverside scope (front entrance monument beds).",
      "Ops already sent to customer — awaiting Approve & Sign.",
      "Visit frequency: Tue / Fri entrance detail; color beds monthly.",
    ].join("\n"),
    assigned_crew: "Alex Rivera",
    account_manager: "Operations",
    quote_id: SENT_QUOTE_ID,
    drafted_by_role: "operations",
    manager_approved_at: approvedAt,
    customer_signed_at: null,
    customer_signature_name: null,
    created_at: sentCreatedAt,
  });

  await sb.from("contract_services").delete().eq("contract_id", SENT_CONTRACT_ID);
  if (entranceItems.length > 0) {
    const { error: sentSvcErr } = await sb.from("contract_services").insert(
      entranceItems.map((li) => ({
        contract_id: SENT_CONTRACT_ID,
        service_name: li.label,
        included: true,
      }))
    );
    if (sentSvcErr) throw new Error(`sent contract_services: ${sentSvcErr.message}`);
  }

  await upsertQuote(SENT_QUOTE_ID, {
    customer_id: customerId,
    service_description:
      "Riverside front entrance — monument beds & weekly detail",
    notes:
      "Demo job C: Separate Riverside job (front entrance). Contract sent to customer; awaiting signature.",
    property_address: address,
    status: "contract_drafted",
    line_items: entranceItems,
    monthly_fee: entranceMonthly,
    visits_per_week: 2,
    visit_frequency_notes: "Tue / Fri entrance detail; color beds monthly.",
    season_start: seasonStart,
    season_end: seasonEnd,
    submitted_for_approval_at: approvedAt,
    manager_approved_at: approvedAt,
    draft_contract_id: SENT_CONTRACT_ID,
    survey_id: null,
  });

  const { data: verifyQuotes, error: vErr } = await sb
    .from("quote_requests")
    .select(
      "id, status, monthly_fee, draft_contract_id, manager_approved_at, customer_id, service_description"
    )
    .in("id", [
      PENDING_QUOTE_ID,
      APPROVED_QUOTE_ID,
      DRAFT_QUOTE_ID,
      SENT_QUOTE_ID,
    ])
    .order("status");

  if (vErr) throw new Error(`verify quotes: ${vErr.message}`);

  const { data: verifyContracts, error: cErr } = await sb
    .from("contracts")
    .select("id, title, status, approval_state, quote_id, customer_signed_at")
    .in("id", [DRAFT_CONTRACT_ID, SENT_CONTRACT_ID])
    .order("title");

  if (cErr) throw new Error(`verify contracts: ${cErr.message}`);

  console.log("Done. Riverside pipeline quotes:");
  for (const q of verifyQuotes ?? []) {
    console.log(
      `  ${q.id} | ${q.status} | $${q.monthly_fee}/mo | draft_contract_id=${q.draft_contract_id ?? "null"}`
    );
    console.log(`    ${q.service_description}`);
  }
  console.log("Contracts:");
  for (const c of verifyContracts ?? []) {
    console.log(
      `  ${c.id} | ${c.approval_state} | signed=${c.customer_signed_at ?? "null"} | ${c.title}`
    );
  }
  console.log("");
  console.log("Demo:");
  console.log(
    "  Manager → Contracts → Quotes Pending Approval (Riverside fall grounds)"
  );
  console.log(
    "  Operations → Contracts → Draft Contracts:"
  );
  console.log(
    "    • Office Park grounds → Create Contract"
  );
  console.log(
    "    • Parking lot beds (Draft) → Continue Editing"
  );
  console.log(
    "  Operations → Contracts table (top): Front Entrance — Sent To Customer — Awaiting Approval"
  );
  console.log(
    "  Customer → Contracts → Proposed Contract: Front Entrance (Approve & Sign)"
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
