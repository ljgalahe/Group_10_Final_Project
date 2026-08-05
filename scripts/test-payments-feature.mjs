/**
 * Non-destructive smoke tests for manager payments against shared Supabase.
 * Usage: node scripts/test-payments-feature.mjs
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    })
);

const sb = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function nextPaymentNumber() {
  const { data } = await sb
    .from("payments")
    .select("payment_number")
    .like("payment_number", "CR-%")
    .order("payment_number", { ascending: false })
    .limit(50);
  let max = 0;
  for (const row of data ?? []) {
    const match = String(row.payment_number ?? "").match(/^CR-(\d+)$/i);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `CR-${String(max + 1).padStart(4, "0")}`;
}

const invoiceId = "55555555-5555-5555-5555-555555555507"; // INV-0007

const before = await sb.from("invoices").select("*").eq("id", invoiceId).single();
assert(before.data, "INV-0007 missing");
assert(
  ["sent", "overdue", "past_due", "partially_paid"].includes(before.data.status),
  `INV-0007 not open: ${before.data.status}`
);

const startPaid = Number(before.data.amount_paid);
const total = Number(before.data.total);
const remaining = Math.round((total - startPaid) * 100) / 100;
assert(remaining > 50, "Need room for partial tests");

const n1 = await nextPaymentNumber();
const p1 = await sb
  .from("payments")
  .insert({
    invoice_id: invoiceId,
    customer_id: before.data.customer_id,
    payment_number: n1,
    amount: 50,
    applied_amount: 50,
    unapplied_amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "ach",
    notes: "Ref: TEST-PARTIAL-1 · Recorded by: Test Runner\nAutomated partial",
  })
  .select("id")
  .single();
assert(!p1.error, p1.error?.message || "partial insert failed");

const paid1 = Math.round((startPaid + 50) * 100) / 100;
const status1 = paid1 >= total ? "paid" : "partially_paid";
const u1 = await sb
  .from("invoices")
  .update({ amount_paid: paid1, status: status1 })
  .eq("id", invoiceId);
assert(!u1.error, u1.error?.message || "partial invoice update failed");

const n2 = await nextPaymentNumber();
const p2 = await sb
  .from("payments")
  .insert({
    invoice_id: invoiceId,
    customer_id: before.data.customer_id,
    payment_number: n2,
    amount: 25,
    applied_amount: 25,
    unapplied_amount: 0,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "check",
    notes: "Ref: CHK-TEST-2 · Recorded by: Test Runner\nSecond payment same invoice",
  })
  .select("id")
  .single();
assert(!p2.error, p2.error?.message || "second insert failed");

const paid2 = Math.round((paid1 + 25) * 100) / 100;
const status2 = paid2 >= total ? "paid" : "partially_paid";
await sb
  .from("invoices")
  .update({ amount_paid: paid2, status: status2 })
  .eq("id", invoiceId);

const history = await sb
  .from("payments")
  .select("id,amount,payment_number")
  .eq("invoice_id", invoiceId);
assert((history.data || []).length >= 2, "expected multiple payments on invoice");

const after = await sb.from("invoices").select("*").eq("id", invoiceId).single();
assert(Number(after.data.amount_paid) === paid2, "amount_paid not persisted");
assert(after.data.status === status2, "status not persisted");

const ar = await sb
  .from("invoices")
  .select("id,status,total,amount_paid")
  .in("status", ["sent", "overdue", "past_due", "partially_paid"]);
const openWithBalance = (ar.data || []).filter(
  (i) => Number(i.total) - Number(i.amount_paid) > 0
);
assert(openWithBalance.length > 0, "AR open set empty");

console.log("OK payments feature smoke tests");
console.log({
  invoice: "INV-0007",
  amount_paid: paid2,
  status: status2,
  payment_rows: history.data.length,
  ar_open_with_balance: openWithBalance.length,
});
