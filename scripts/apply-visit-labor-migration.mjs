/**
 * Applies visit_labor_entries DDL via Supabase SQL over the Management API
 * when SUPABASE_ACCESS_TOKEN is set; otherwise prints the SQL path to run manually.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260805140000_visit_labor_entries.sql"
);

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

const sql = readFileSync(migrationPath, "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = url ? new URL(url).host.split(".")[0] : null;

if (!url || !serviceKey || !projectRef) {
  console.error("Missing Supabase URL or service role key.");
  process.exit(1);
}

// Probe whether the table already exists via PostgREST.
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const probe = await supabase.from("visit_labor_entries").select("id").limit(1);
if (!probe.error) {
  console.log("visit_labor_entries already exists.");
  process.exit(0);
}

if (!String(probe.error.message || "").includes("does not exist") &&
    probe.error.code !== "PGRST205" &&
    probe.error.code !== "42P01") {
  console.log("Probe error:", probe.error.code, probe.error.message);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.log(
    "Table missing. Set SUPABASE_ACCESS_TOKEN to apply DDL, or run this SQL in the dashboard:"
  );
  console.log(
    `https://supabase.com/dashboard/project/${projectRef}/sql/new`
  );
  console.log(`File: ${migrationPath}`);
  process.exit(2);
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (!res.ok) {
  console.error("Management API failed:", res.status, await res.text());
  process.exit(1);
}

console.log("Migration applied via Management API.");
