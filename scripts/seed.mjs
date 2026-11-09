// Fyller databasen med DEMODATA: påhittade tillverkare och produkter (inga verkliga uppgifter).
// Kör inte detta mot en riktig produktionsdatabas.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
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

const existing = await client.query("SELECT count(*) FROM companies");
if (Number(existing.rows[0].count) > 0 && !process.argv.includes("--force")) {
  console.log("Databasen innehåller redan data. Kör med --force för att ändå lägga till demodata.");
  await client.end();
  process.exit(0);
}

const DEMO_PASSWORD = "demo-losenord-1";
const hash = await bcrypt.hash(DEMO_PASSWORD, 10);

async function company(name, kind, website, approved) {
  const r = await client.query(
    "INSERT INTO companies (name, kind, website, approved) VALUES ($1,$2,$3,$4) RETURNING id",
    [name, kind, website, approved]
  );
  return r.rows[0].id;
}
async function user(email, name, role, companyId) {
  await client.query(
    "INSERT INTO users (email, password_hash, name, role, company_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING",
    [email, hash, name, role, companyId]
  );
}

const lumera = await company("Lumera (demo)", "manufacturer", "https://example.com/lumera", true);
const nordvik = await company("Nordvik Ljus (demo)", "manufacturer", "https://example.com/nordvik", true);
const fjord = await company("Fjordlight (demo)", "manufacturer", "https://example.com/fjordlight", true);
const studio = await company("Ljusverkstan AB (demo)", "designer", null, true);

await user("designer@demo.test", "Demo Designer", "designer", studio);
await user("lumera@demo.test", "Lumera Demo", "manufacturer", lumera);
await user("nordvik@demo.test", "Nordvik Demo", "manufacturer", nordvik);

// [tillverkare, namn, artikelnr, typ, W, lm, K, CRI, IP, montering, dimbar, vinkel, beskrivning, pris, leverans, prov]
const P = [
  [lumera, "Slim 90 Downlight", "LU-S90-830", "Downlight", 12, 1100, 3000, 90, 44, "Infälld", true, 36, "Smal downlight med låg bländning för kontor och butik.", "Offereras", "2–3 veckor", true],
  [lumera, "Nova 80", "LU-N80-840", "Downlight", 9, 850, 4000, 80, 20, "Infälld", true, 60, "Enkel downlight för allmänbelysning.", "495 kr", "Lagervara", false],
  [lumera, "Deep 100", "LU-D100-927", "Downlight", 15, 1300, 2700, 95, 44, "Infälld", true, 24, "Djup reflektor, hög färgåtergivning.", "Offereras", "3–4 veckor", true],
  [lumera, "Rail Spot 20", "LU-RS20-930", "Skenspot", 20, 1800, 3000, 90, 20, "Skena", true, 24, "Spot för 3-fas skena, vridbar och tiltbar.", "Offereras", "2 veckor", true],
  [nordvik, "Cirrus Pendel", "NV-CP60-830", "Pendel", 28, 3200, 3000, 80, 20, "Pendel", true, 110, "Pendel med diffus ljusbild för kontor och restaurang.", "Offereras", "4–6 veckor", true],
  [nordvik, "Halo Pendel", "NV-HP45-830", "Pendel", 22, 2400, 3000, 90, 20, "Pendel", true, 120, "Ringformad pendel i anodiserat aluminium.", "Offereras", "4–6 veckor", false],
  [nordvik, "Mono Tune", "NV-MT10-TW", "Spot", 10, 900, 3000, 90, 20, "Utanpåliggande", true, 30, "Spot med inställbar färgtemperatur 2700–4000 K.", "Offereras", "2–3 veckor", true],
  [nordvik, "Arc Vägglampa", "NV-AW12-827", "Vägg", 12, 700, 2700, 90, 44, "Vägg", false, 90, "Vägglampa med uppåt- och nedåtljus.", "1 190 kr", "Lagervara", false],
  [fjord, "Linea 120", "FJ-L120-840", "Linjär", 36, 4600, 4000, 80, 40, "Utanpåliggande", true, 100, "Linjär armatur 1200 mm för kontor och lager.", "Offereras", "2–3 veckor", true],
  [fjord, "Kupol Pendel", "FJ-KP50-830", "Pendel", 18, 1900, 3000, 80, 20, "Pendel", true, 100, "Kupolformad pendel, flera färger.", "Offereras", "3–4 veckor", false],
  [fjord, "Strand Utomhus", "FJ-SU15-830", "Utomhus", 15, 1400, 3000, 80, 65, "Mark", false, 40, "Markarmatur för entréer och gångar.", "Offereras", "4 veckor", true],
  [fjord, "Fokus Spot", "FJ-FS12-830", "Spot", 12, 1100, 3000, 90, 20, "Utanpåliggande", true, 18, "Smal spot för accentbelysning.", "Offereras", "2 veckor", true],
];
for (const p of P) {
  await client.query(
    `INSERT INTO products (manufacturer_id, name, article_no, type, power_w, lumen, cct_k, cri, ip, mounting, dimmable,
       beam_angle, description, price_text, lead_time, sample_available, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [...p, "https://example.com/produkt/" + encodeURIComponent(p[2])]
  );
}
console.log("Demodata tillagd.");
console.log("Inloggningar (lösenord för alla: " + DEMO_PASSWORD + "):");
console.log("  designer@demo.test   (ljusdesigner)");
console.log("  lumera@demo.test     (tillverkare)");
console.log("  nordvik@demo.test    (tillverkare)");
await client.end();
