/**
 * Applies ops survey→quote pipeline migration to ashhludptczpogtwmzvd.
 * Prefers DATABASE_URL / SUPABASE_DB_PASSWORD via pg; falls back to
 * Management API when SUPABASE_ACCESS_TOKEN is set.
 *
 * Usage: node scripts/apply-ops-survey-pipeline-migration.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = join(
  __dirname,
  "..",
  "supabase",
  "migrations",
  "20260806140000_ops_survey_quote_pipeline.sql"
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
const ref = "ashhludptczpogtwmzvd";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && serviceKey) {
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const probe = await supabase.from("site_surveys").select("id").limit(1);
  if (!probe.error) {
    // Still ensure new columns exist by re-running idempotent SQL when possible.
    console.log("site_surveys already reachable; will still apply idempotent SQL.");
  } else {
    console.log("Probe site_surveys:", probe.error.code, probe.error.message);
  }
}

const password =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.DATABASE_PASSWORD ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const candidates = [];
if (process.env.DATABASE_URL) {
  candidates.push({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}
if (password) {
  for (const host of [
    `db.${ref}.supabase.co`,
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-us-east-2.pooler.supabase.com",
    "aws-0-us-west-2.pooler.supabase.com",
  ]) {
    const isPooler = host.includes("pooler");
    candidates.push({
      host,
      port: isPooler ? 6543 : 5432,
      user: isPooler ? `postgres.${ref}` : "postgres",
      password,
      database: "postgres",
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
  }
}

let applied = false;
for (const cfg of candidates) {
  const client = new pg.Client(cfg);
  const label =
    cfg.connectionString || `${cfg.user}@${cfg.host}:${cfg.port}`;
  try {
    await client.connect();
    console.log("Connected:", label);
    await client.query(sql);
    console.log("Migration applied successfully via Postgres.");
    applied = true;
    await client.end();
    break;
  } catch (error) {
    console.log("Failed:", label, "-", String(error.message || error).slice(0, 200));
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

if (!applied) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (res.ok) {
      console.log("Migration applied via Management API.");
      applied = true;
    } else {
      console.error("Management API failed:", res.status, await res.text());
    }
  }
}

if (!applied) {
  console.error("\nCould not apply migration automatically.");
  console.error(
    `Run ${migrationPath} in the Supabase SQL Editor:`
  );
  console.error(`https://supabase.com/dashboard/project/${ref}/sql/new`);
  process.exit(1);
}
