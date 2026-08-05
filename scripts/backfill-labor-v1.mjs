/**
 * Encodes existing visit_costs labor rows as LABOR_V1 (hours × rate) for accountant sync.
 * Does not require visit_labor_entries table.
 *
 * Usage: node scripts/backfill-labor-v1.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

loadEnv();

const ROSTER = [
  { id: "crew-1", name: "Jordan Miles", role: "Crew Member", rate: 28 },
  { id: "crew-2", name: "Alex Rivera", role: "Crew Member", rate: 28 },
  { id: "crew-3", name: "Sam Patel", role: "Crew Member", rate: 28 },
  { id: "crew-4", name: "Casey Nguyen", role: "Equipment Operator", rate: 32 },
];

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function assignedFor(visitId) {
  const start = hashString(visitId) % ROSTER.length;
  const count = 2 + (hashString(visitId + "-count") % 2);
  const assigned = [];
  for (let i = 0; i < count; i += 1) {
    assigned.push(ROSTER[(start + i) % ROSTER.length]);
  }
  return assigned;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: costs, error } = await supabase
  .from("visit_costs")
  .select("id, visit_id, description, quantity, amount")
  .eq("cost_type", "labor");

if (error) {
  console.error(error.message);
  process.exit(1);
}

let updated = 0;
for (const cost of costs ?? []) {
  if (String(cost.description || "").startsWith("LABOR_V1|")) continue;
  const assigned = assignedFor(cost.visit_id);
  const quantity =
    cost.quantity != null && Number(cost.quantity) > 0
      ? Number(cost.quantity)
      : assigned.length * 3;
  const hoursEach = Number((quantity / assigned.length).toFixed(2));
  const body = assigned
    .map((m) => `${m.id}:${m.name}:${m.role}:${hoursEach}:${m.rate}`)
    .join("|");
  const description = `LABOR_V1|${body}`;
  const amount = Number(
    assigned.reduce((sum, m) => sum + hoursEach * m.rate, 0).toFixed(2)
  );

  const { error: updateError } = await supabase
    .from("visit_costs")
    .update({ description, quantity, amount })
    .eq("id", cost.id);

  if (updateError) {
    console.error("Failed", cost.id, updateError.message);
    continue;
  }
  updated += 1;
}

console.log(`Updated ${updated} labor cost row(s) with LABOR_V1 encoding.`);
