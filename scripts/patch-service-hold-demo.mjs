/**
 * Adjust demo unpaid invoice due dates so Service Hold can be demonstrated.
 * Not a migration. Uses SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * As of 2026-08-06:
 *   Metro Industrial Complex → unpaid invoices due 2026-07-05 (~32 days) → Service Hold
 *   Harbor View HOA → unpaid partial due 2026-07-22 (~15 days) → Monitor, not Hold
 *   Other current customers remain Active
 *
 * Usage: node scripts/patch-service-hold-demo.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i <= 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function daysPastDue(due, today) {
  return Math.floor(
    (new Date(`${today}T00:00:00`) - new Date(`${due}T00:00:00`)) /
      (1000 * 60 * 60 * 24)
  );
}

async function main() {
  const env = loadEnv(resolve(__dirname, "../.env.local"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const today = new Date().toISOString().slice(0, 10);

  const { data: customers, error: cErr } = await supabase
    .from("customers")
    .select("id, name");
  if (cErr) throw cErr;

  const byName = new Map(customers.map((c) => [c.name, c.id]));
  const metroId = byName.get("Metro Industrial Complex");
  const harborId = byName.get("Harbor View HOA");
  if (!metroId || !harborId) {
    throw new Error("Expected demo customers Metro / Harbor View not found");
  }

  const { data: invoices, error: iErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, customer_id, status, due_date, total, amount_paid, customers(name)"
    );
  if (iErr) throw iErr;

  const openUnpaid = (inv) => {
    const bal =
      Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
    return (
      bal > 0 &&
      inv.status !== "canceled" &&
      inv.status !== "voided" &&
      inv.status !== "paid" &&
      inv.status !== "draft"
    );
  };

  // Metro: push all open unpaid invoices to 32 days past due → Service Hold
  const metroOpen = invoices.filter(
    (inv) => inv.customer_id === metroId && openUnpaid(inv)
  );
  for (const inv of metroOpen) {
    const { error } = await supabase
      .from("invoices")
      .update({ due_date: "2026-07-05", status: "past_due" })
      .eq("id", inv.id);
    if (error) throw error;
    console.log(
      `Metro ${inv.invoice_number}: due_date → 2026-07-05 (${daysPastDue("2026-07-05", today)} days overdue)`
    );
  }

  // Harbor View: one open unpaid at ~15 days → Monitor, not Hold
  const harborOpen = invoices.filter(
    (inv) => inv.customer_id === harborId && openUnpaid(inv)
  );
  for (const inv of harborOpen) {
    const { error } = await supabase
      .from("invoices")
      .update({ due_date: "2026-07-22" })
      .eq("id", inv.id);
    if (error) throw error;
    console.log(
      `Harbor View ${inv.invoice_number}: due_date → 2026-07-22 (${daysPastDue("2026-07-22", today)} days overdue)`
    );
  }

  // Verify hold candidates
  const { data: refreshed } = await supabase
    .from("invoices")
    .select(
      "invoice_number, customer_id, status, due_date, total, amount_paid, customers(name)"
    );

  console.log("\nService Hold candidates (unpaid, 30+ days past due):");
  for (const inv of refreshed ?? []) {
    const bal =
      Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
    if (bal <= 0) continue;
    if (["canceled", "voided", "paid", "draft"].includes(inv.status)) continue;
    const days = daysPastDue(inv.due_date, today);
    if (days < 30) continue;
    console.log(
      `  ${inv.customers?.name}: ${inv.invoice_number} · ${days} days · $${bal}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
