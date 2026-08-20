import { rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
if((process.env.DATABASE_URL??"file:./data/school-staff-hub.db").startsWith("file:")) await rm("data/school-staff-hub.db",{force:true});
else throw new Error("Refusing to reset a remote database. Reset it explicitly through its provider.");
execFileSync(process.execPath,["--import","tsx","scripts/migrate.ts"],{stdio:"inherit"});
execFileSync(process.execPath,["--import","tsx","scripts/seed.ts"],{stdio:"inherit"});
