// Godkänn (eller lista) tillverkarkonton.  Användning:
//   node scripts/godkann.mjs            -> listar konton som väntar
//   node scripts/godkann.mjs 7          -> godkänner företag med id 7
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(here, "..", ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const id = process.argv[2];
if (!id) {
  const r = await client.query(
    "SELECT c.id, c.name, c.website, c.created_at, (SELECT count(*) FROM products p WHERE p.manufacturer_id = c.id) AS produkter FROM companies c WHERE kind = 'manufacturer' AND NOT approved ORDER BY created_at"
  );
  console.table(r.rows);
} else {
  const r = await client.query("UPDATE companies SET approved = true WHERE id = $1 AND kind = 'manufacturer' RETURNING name", [Number(id)]);
  console.log(r.rows[0] ? `Godkände ${r.rows[0].name}.` : "Hittade inget tillverkarföretag med det id:t.");
}
await client.end();
