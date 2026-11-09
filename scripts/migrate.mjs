import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const f = path.join(here, "..", ".env.local");
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const sql = fs.readFileSync(path.join(here, "..", "db", "schema.sql"), "utf8");
await client.query(sql);
console.log("Schemat är på plats.");
await client.end();
