import { createClient, type Client } from "@libsql/client";

const globalDb = globalThis as typeof globalThis & { schoolHubDb?: Client };

export function db() {
  if (!globalDb.schoolHubDb) {
    globalDb.schoolHubDb = createClient({
      url: process.env.DATABASE_URL ?? "file:./data/school-staff-hub.db",
      authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    });
  }
  return globalDb.schoolHubDb;
}

export function rows<T>(result: { rows: unknown[] }) {
  return result.rows as T[];
}
