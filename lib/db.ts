import { Pool, types } from "pg";

// Return date/time columns as raw strings (mirrors the text values the app's
// date helpers expect) instead of JS Date objects, and bigint COUNT(*) as a
// JS number instead of a string.
types.setTypeParser(1082, (v) => v); // date
types.setTypeParser(1114, (v) => v); // timestamp
types.setTypeParser(1184, (v) => v); // timestamptz
types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // int8 -> number

const SCHEMA = process.env.DATABASE_SCHEMA ?? "staffhub";

const globalDb = globalThis as typeof globalThis & { schoolHubPool?: Pool };

function pool(): Pool {
  if (!globalDb.schoolHubPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is required. Set it to your Supabase Postgres connection string " +
          "(use the connection pooler string for serverless/Vercel).",
      );
    }
    const isLocal = /(^|@|\/\/)(localhost|127\.0\.0\.1)/.test(connectionString);
    const p = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 5),
      // Resolve unqualified table names against the app's isolated schema.
      options: `-c search_path=${SCHEMA},public`,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
    // Never let an idle-client error crash the process.
    p.on("error", (err) => console.error("Postgres pool error", err));
    globalDb.schoolHubPool = p;
  }
  return globalDb.schoolHubPool;
}

type Args = ReadonlyArray<unknown>;
type Statement = string | { sql: string; args?: Args };

/**
 * Translates a SQLite-flavoured statement to Postgres:
 *  - `?` positional placeholders become `$1`, `$2`, … (skipping any inside string literals)
 *  - camelCase column aliases (`... as fullName`) are double-quoted so Postgres
 *    preserves their case instead of folding to lowercase.
 */
export function convert(sql: string): string {
  let out = "";
  let n = 0;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (ch === "'") {
      out += ch;
      i++;
      while (i < sql.length) {
        out += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") { out += sql[i + 1]; i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "?") { out += "$" + ++n; i++; continue; }
    if ((ch === "a" || ch === "A") && (i === 0 || /[\s,()]/.test(sql[i - 1]))) {
      const m = /^as\s+([a-z_][A-Za-z0-9_]*)/i.exec(sql.slice(i));
      if (m && /[A-Z]/.test(m[1])) {
        out += sql.slice(i, i + m[0].length - m[1].length) + '"' + m[1] + '"';
        i += m[0].length;
        continue;
      }
    }
    out += ch;
    i++;
  }
  return out;
}

function normalize(stmt: Statement): { text: string; values: unknown[] } {
  if (typeof stmt === "string") return { text: convert(stmt), values: [] };
  return { text: convert(stmt.sql), values: (stmt.args ?? []) as unknown[] };
}

type Result = { rows: Record<string, unknown>[]; rowsAffected: number };

export type Db = {
  execute(statement: Statement): Promise<Result>;
  batch(statements: Statement[], mode?: string): Promise<Result[]>;
  close(): Promise<void>;
};

export function db(): Db {
  const p = pool();
  return {
    async execute(statement) {
      const { text, values } = normalize(statement);
      const r = await p.query(text, values);
      return { rows: r.rows as Record<string, unknown>[], rowsAffected: r.rowCount ?? 0 };
    },
    async batch(statements) {
      const client = await p.connect();
      try {
        await client.query("BEGIN");
        const results: Result[] = [];
        for (const statement of statements) {
          const { text, values } = normalize(statement);
          const r = await client.query(text, values);
          results.push({ rows: r.rows as Record<string, unknown>[], rowsAffected: r.rowCount ?? 0 });
        }
        await client.query("COMMIT");
        return results;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      if (globalDb.schoolHubPool) {
        await globalDb.schoolHubPool.end();
        globalDb.schoolHubPool = undefined;
      }
    },
  };
}

export function rows<T>(result: { rows: unknown[] }) {
  return result.rows as T[];
}
