import { execFileSync } from "node:child_process";

// Re-applies migrations and re-seeds demo data. This only ever touches the
// app's own schema (default "staffhub"); the seed clears and repopulates those
// tables and does not affect anything else in the database.
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required (Supabase Postgres connection string).");
console.warn(`Resetting the "${process.env.DATABASE_SCHEMA ?? "staffhub"}" schema: deleting and re-seeding demo data...`);
execFileSync(process.execPath, ["--import", "tsx", "scripts/migrate.ts"], { stdio: "inherit" });
execFileSync(process.execPath, ["--import", "tsx", "scripts/seed.ts"], { stdio: "inherit" });
