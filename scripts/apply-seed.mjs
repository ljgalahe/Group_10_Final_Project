/**
 * Loads scripts/seed.sql into the GreenScape Supabase Postgres database.
 * Usage: node scripts/apply-seed.mjs
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

const sqlPath = join(__dirname, "seed.sql");
const sql = readFileSync(sqlPath, "utf8");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = url ? new URL(url).hostname.split(".")[0] : "ashhludptczpogtwmzvd";

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
      connectionTimeoutMillis: 20000,
    });
  }
}

async function applyViaManagementApi() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return false;
  console.log("Trying Management API (may fail on large SQL)...");
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
  if (!res.ok) {
    console.log("Management API:", res.status, (await res.text()).slice(0, 500));
    return false;
  }
  console.log("Seed applied via Management API.");
  return true;
}

async function applyViaPg() {
  if (candidates.length === 0) {
    console.log("No DATABASE_URL / SUPABASE_DB_PASSWORD for direct Postgres.");
    return false;
  }
  for (const cfg of candidates) {
    const client = new pg.Client({
      ...cfg,
      // large seed
      statement_timeout: 0,
    });
    const label =
      cfg.connectionString || `${cfg.user}@${cfg.host}:${cfg.port}`;
    try {
      await client.connect();
      console.log("Connected:", label);
      console.log(
        `Running seed.sql (${(sql.length / 1024 / 1024).toFixed(2)} MB)...`
      );
      await client.query("set statement_timeout = 0");
      await client.query(sql);
      console.log("Seed applied successfully.");
      await client.end();
      return true;
    } catch (error) {
      console.log("Failed:", label, "-", String(error.message).slice(0, 220));
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return false;
}

let ok = await applyViaPg();
if (!ok) ok = await applyViaManagementApi();

if (!ok) {
  console.error("\nCould not load seed automatically.");
  console.error(
    `Paste scripts/seed.sql here: https://supabase.com/dashboard/project/${ref}/sql/new`
  );
  process.exit(1);
}
