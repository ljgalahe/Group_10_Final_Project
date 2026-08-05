/**
 * Applies the payments manager migration via direct Postgres connection.
 * Prefers DATABASE_URL, otherwise tries common Supabase hosts with
 * SUPABASE_DB_PASSWORD or SUPABASE_SERVICE_ROLE_KEY as the password.
 *
 * Usage: node scripts/apply-payments-migration.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

const sql = readFileSync(
  join(__dirname, "..", "supabase/migrations/20260805010000_payments_manager_fields.sql"),
  "utf8"
);

const ref = "ashhludptczpogtwmzvd";
const password =
  process.env.SUPABASE_DB_PASSWORD ||
  process.env.DATABASE_PASSWORD ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const candidates = [];

if (process.env.DATABASE_URL) {
  candidates.push({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
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

if (candidates.length === 0) {
  console.error("No DATABASE_URL or DB password found in .env.local");
  process.exit(1);
}

let applied = false;
for (const cfg of candidates) {
  const client = new pg.Client(cfg);
  const label = cfg.connectionString || `${cfg.user}@${cfg.host}:${cfg.port}`;
  try {
    await client.connect();
    console.log("Connected:", label);
    await client.query(sql);
    console.log("Migration applied successfully.");
    applied = true;
    await client.end();
    break;
  } catch (error) {
    console.log("Failed:", label, "-", error.message.slice(0, 160));
    try {
      await client.end();
    } catch {
      // ignore
    }
  }
}

if (!applied) {
  console.error("\nCould not apply migration automatically.");
  console.error(
    "Run supabase/migrations/20260805010000_payments_manager_fields.sql in the Supabase SQL Editor."
  );
  process.exit(1);
}
