import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required (Supabase Postgres connection string).");
const schema = process.env.DATABASE_SCHEMA ?? "staffhub";
const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)/.test(connectionString);

const client = new Client({ connectionString, ssl: isLocal ? undefined : { rejectUnauthorized: false } });
await client.connect();
await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
await client.query(`SET search_path TO "${schema}", public`);
await client.query(`CREATE TABLE IF NOT EXISTS _migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);

for (const name of (await readdir("migrations")).filter((f) => f.endsWith(".sql")).sort()) {
  const exists = await client.query(`SELECT 1 FROM _migrations WHERE name=$1`, [name]);
  if (exists.rowCount) continue;
  const sql = await readFile(`migrations/${name}`, "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(`INSERT INTO _migrations(name) VALUES ($1)`, [name]);
    await client.query("COMMIT");
    console.log(`Applied ${name}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}
await client.end();
