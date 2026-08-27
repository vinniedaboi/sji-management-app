import { db } from "../lib/db";
import { seedRun } from "./seed-core";

const client = db();
const summary = await seedRun((statement) => client.execute(statement));
console.log(
  `Seeded ${summary.users} users, ${summary.notices} notices, ${summary.posts} posts, ` +
    `${summary.coverSlots} cover slots, ${summary.events} events, ${summary.documents} documents and ${summary.links} quick links.`,
);
console.log("Demo password for every account: SchoolHub123!");
await client.close();
