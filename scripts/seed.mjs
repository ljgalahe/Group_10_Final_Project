/**
 * Verifies demo seed data is loaded in Supabase.
 * To (re)load data: paste scripts/seed.sql into Supabase SQL Editor.
 *
 * Usage: npm run seed
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = join(__dirname, "..", ".env.local");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    process.env[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase keys in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const expected = {
  customers: 20,
  contracts: 40,
  service_visits: 800,
  visit_costs: 1500,
  visit_labor_entries: 2000,
  extra_work_orders: 4,
  invoices: 200,
  invoice_lines: 200,
  payments: 100,
  equipment: 35,
};

console.log("Checking seed data in Supabase...\n");

let allGood = true;

for (const [table, min] of Object.entries(expected)) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.log(`  FAIL  ${table}: ${error.message}`);
    allGood = false;
  } else if ((count ?? 0) < min) {
    console.log(`  WARN  ${table}: ${count} rows (expected at least ${min})`);
    allGood = false;
  } else {
    console.log(`  OK    ${table}: ${count} rows`);
  }
}

console.log("");

if (allGood) {
  console.log("Seed data looks good! Open http://localhost:3001/demo-enter");
} else {
  console.log("Seed data missing or incomplete.");
  console.log("Fix: open Supabase SQL Editor and run scripts/seed.sql");
  console.log("  https://supabase.com/dashboard/project/ashhludptczpogtwmzvd/sql/new");
  process.exit(1);
}
