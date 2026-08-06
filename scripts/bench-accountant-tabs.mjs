/**
 * Benchmark accountant nav routes (requires dev server on :3001).
 * Usage: node scripts/bench-accountant-tabs.mjs
 */
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BENCH_BASE_URL ?? "http://localhost:3001";
const ROUTES = [
  "/dashboard",
  "/visits",
  "/chat",
  "/invoices",
  "/equipment",
  "/inventory",
  "/reports/ar-aging",
  "/reports/profitability",
  "/reports/journal-entries",
  "/reports/general-ledger",
];

const LOG_PATH = join(process.cwd(), "debug-13f5f9.log");

function parseSetCookie(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

async function timedGet(url, cookie) {
  const start = performance.now();
  const res = await fetch(url, {
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : {},
  });
  const ms = Math.round(performance.now() - start);
  return { status: res.status, ms, location: res.headers.get("location") };
}

async function main() {
  const cookie =
    "greenscape_demo_session=active; greenscape_view_role=accountant";

  const results = [];
  for (const route of ROUTES) {
    const { status, ms, location } = await timedGet(`${BASE}${route}`, cookie);
    const entry = {
      sessionId: "13f5f9",
      runId: "bench-curl",
      hypothesisId: "A-E",
      location: "scripts/bench-accountant-tabs.mjs",
      message: "route timing",
      data: { route, status, ms, location },
      timestamp: Date.now(),
    };
    appendFileSync(LOG_PATH, `${JSON.stringify(entry)}\n`);
    results.push({ route, status, ms, location });
    console.log(`${route}\t${status}\t${ms}ms`);
  }

  writeFileSync(
    join(process.cwd(), "scripts", "bench-accountant-tabs-last.json"),
    JSON.stringify(results, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
