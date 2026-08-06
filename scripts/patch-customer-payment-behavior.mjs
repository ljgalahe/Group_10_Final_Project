/**
 * Patch demo payment_date values so each customer has a distinct
 * Average Days to Pay (payment date − invoice issue date).
 *
 * Not a migration — safe to re-run against the live demo database.
 * Uses SUPABASE_SERVICE_ROLE_KEY from .env.local.
 *
 * Usage: node scripts/patch-customer-payment-behavior.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

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

/** Preferred target ADTP (days) by customer name substring / exact match. */
const NAMED_TARGETS = {
  "Square Civic Plaza": 9,
  "West End Medical": 14,
  "Whisper Lake": 18,
  "Harbor View": 27,
  "North MS Logistics": 33,
  "Metro Industrial": 43,
  "Riverside Office": 55,
  "Summit Retail": 14,
};

/** Fallback targets cycled for any other customers (spread across bands). */
const FALLBACK_TARGETS = [8, 12, 17, 22, 28, 35, 40, 48, 52, 60];

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const ms =
    new Date(`${b}T12:00:00Z`).getTime() -
    new Date(`${a}T12:00:00Z`).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function targetForName(name, index) {
  for (const [key, days] of Object.entries(NAMED_TARGETS)) {
    if (name.includes(key) || key.includes(name)) return days;
  }
  return FALLBACK_TARGETS[index % FALLBACK_TARGETS.length];
}

async function main() {
  const env = loadEnv(envPath);
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: customers, error: custErr } = await supabase
    .from("customers")
    .select("id, name")
    .order("name");
  if (custErr) throw custErr;

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("id, customer_id, issue_date, status, total, amount_paid");
  if (invErr) throw invErr;

  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("id, invoice_id, customer_id, payment_date");
  if (payErr) throw payErr;

  const invoiceById = new Map(invoices.map((i) => [i.id, i]));
  const targetByCustomer = new Map();
  customers.forEach((c, i) => {
    targetByCustomer.set(c.id, targetForName(c.name, i));
  });

  let updated = 0;
  const updates = [];

  for (const payment of payments) {
    const invoice = invoiceById.get(payment.invoice_id);
    if (!invoice?.issue_date) continue;

    const customerId = payment.customer_id ?? invoice.customer_id;
    const target = targetByCustomer.get(customerId);
    if (target == null) continue;

    // Slight per-payment jitter (±2 days) so averages look natural but land near target.
    const hash = [...payment.id].reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const jitter = (hash % 5) - 2; // -2..+2
    const lag = Math.max(1, target + jitter);
    const newDate = addDays(invoice.issue_date, lag);

    if (payment.payment_date === newDate) continue;
    updates.push({ id: payment.id, payment_date: newDate, customerId, lag });
  }

  // Batch update in chunks
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (u) => {
        const { error } = await supabase
          .from("payments")
          .update({ payment_date: u.payment_date })
          .eq("id", u.id);
        if (error) throw error;
        updated += 1;
      })
    );
  }

  // Verify per-customer averages (paid invoices only)
  const lastPayByInvoice = new Map();
  const { data: refreshed } = await supabase
    .from("payments")
    .select("invoice_id, payment_date");
  for (const p of refreshed ?? []) {
    const prev = lastPayByInvoice.get(p.invoice_id);
    if (!prev || p.payment_date > prev) {
      lastPayByInvoice.set(p.invoice_id, p.payment_date);
    }
  }

  const averages = [];
  for (const customer of customers) {
    const days = [];
    for (const inv of invoices) {
      if (inv.customer_id !== customer.id) continue;
      if (inv.status === "canceled" || inv.status === "voided") continue;
      const balance =
        Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
      const paid =
        inv.status === "paid" ||
        (balance <= 0.001 && Number(inv.amount_paid) > 0);
      if (!paid) continue;
      const payDate = lastPayByInvoice.get(inv.id);
      if (!inv.issue_date || !payDate) continue;
      days.push(daysBetween(inv.issue_date, payDate));
    }
    const avg =
      days.length > 0
        ? Math.round(days.reduce((a, b) => a + b, 0) / days.length)
        : null;
    averages.push({
      name: customer.name,
      target: targetByCustomer.get(customer.id),
      averageDaysToPay: avg,
      paidInvoices: days.length,
    });
  }

  console.log(`Updated ${updated} payment_date values.`);
  console.log("\nCustomer Average Days to Pay after patch:");
  for (const row of averages.sort((a, b) =>
    (a.averageDaysToPay ?? 999) - (b.averageDaysToPay ?? 999)
  )) {
    console.log(
      `  ${row.name}: ${
        row.averageDaysToPay == null
          ? "No Payment History"
          : `${row.averageDaysToPay} days`
      } (target ~${row.target}, ${row.paidInvoices} paid invoices)`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
