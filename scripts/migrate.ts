import { mkdir, readFile, readdir } from "node:fs/promises";
import { createClient } from "@libsql/client";

await mkdir("data", { recursive: true });
const client=createClient({url:process.env.DATABASE_URL??"file:./data/school-staff-hub.db",authToken:process.env.DATABASE_AUTH_TOKEN||undefined});
await client.execute(`CREATE TABLE IF NOT EXISTS _migrations(name TEXT PRIMARY KEY,applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
for(const name of (await readdir("migrations")).filter((x)=>x.endsWith(".sql")).sort()){
  const exists=await client.execute({sql:`SELECT 1 FROM _migrations WHERE name=?`,args:[name]});
  if(exists.rows.length) continue;
  const sql=await readFile(`migrations/${name}`,"utf8");
  for(const statement of sql.split("-- statement-breakpoint").map((x)=>x.trim()).filter(Boolean)) await client.execute(statement);
  await client.execute({sql:`INSERT INTO _migrations(name) VALUES (?)`,args:[name]});
  console.log(`Applied ${name}`);
}
client.close();
