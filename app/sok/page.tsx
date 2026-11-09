import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { CCT_BUCKETS, IP_OPTIONS, MOUNTINGS, PAGE_SIZE, PRODUCT_TYPES } from "@/lib/constants";
import { intParam, numParam, strParam } from "@/lib/validate";
import ProductCard from "@/components/ProductCard";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;

  const q = strParam(sp.q);
  const types = ([] as string[]).concat(sp.typ ?? []).filter((t) => PRODUCT_TYPES.includes(t));
  const manufacturer = intParam(sp.tillverkare);
  const pMin = numParam(sp.effekt_min);
  const pMax = numParam(sp.effekt_max);
  const lumenMin = numParam(sp.lumen_min);
  const cct = CCT_BUCKETS.find((b) => b.value === strParam(sp.farg));
  const ipMin = intParam(sp.ip_min);
  const mounting = MOUNTINGS.includes(strParam(sp.montering) ?? "") ? strParam(sp.montering) : null;
  const dimmable = sp.dimbar === "1";
  const sample = sp.prov === "1";
  const sort = strParam(sp.sortera) ?? "namn";
  const page = Math.max(1, intParam(sp.sida) ?? 1);

  const where: string[] = ["c.approved = true"];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };

  if (q) {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
    params.push(like);
    const n = params.length;
    where.push(
      `(p.name ILIKE $${n} OR p.article_no ILIKE $${n} OR p.description ILIKE $${n} OR c.name ILIKE $${n} OR p.type ILIKE $${n})`
    );
  }
  if (types.length) add("p.type = ANY(?)", types);
  if (manufacturer !== null) add("p.manufacturer_id = ?", manufacturer);
  if (pMin !== null) add("p.power_w >= ?", pMin);
  if (pMax !== null) add("p.power_w <= ?", pMax);
  if (lumenMin !== null) add("p.lumen >= ?", lumenMin);
  if (cct) {
    add("p.cct_k >= ?", cct.min);
    add("p.cct_k <= ?", cct.max);
  }
  if (ipMin !== null) add("p.ip >= ?", ipMin);
  if (mounting) add("p.mounting = ?", mounting);
  if (dimmable) where.push("p.dimmable = true");
  if (sample) where.push("p.sample_available = true");

  const ORDER: Record<string, string> = {
    namn: "p.name ASC",
    effekt: "p.power_w ASC NULLS LAST",
    lumen: "p.lumen DESC NULLS LAST",
    effektivitet: "(p.lumen / NULLIF(p.power_w,0)) DESC NULLS LAST",
    kontrollerad: "p.checked_at DESC",
  };
  const orderBy = ORDER[sort] ?? ORDER.namn;
  const whereSql = where.join(" AND ");

  const countRow = await queryOne<{ n: string }>(
    `SELECT count(*) AS n FROM products p JOIN companies c ON c.id = p.manufacturer_id WHERE ${whereSql}`,
    params
  );
  const total = Number(countRow?.n ?? 0);
  const products = await query<Product>(
    `SELECT ${PRODUCT_SELECT} FROM products p JOIN companies c ON c.id = p.manufacturer_id
      WHERE ${whereSql} ORDER BY ${orderBy}, p.id LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params
  );
  const manufacturers = await query<{ id: number; name: string }>(
    `SELECT DISTINCT c.id, c.name FROM companies c JOIN products p ON p.manufacturer_id = c.id
      WHERE c.approved = true ORDER BY c.name`
  );

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (overrides: Record<string, string>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "sida") continue;
      for (const x of ([] as string[]).concat(v ?? [])) u.append(k, x);
    }
    for (const [k, v] of Object.entries(overrides)) u.set(k, v);
    return `/sok?${u.toString()}`;
  };

  return (
    <>
      <h1>Sök armaturer</h1>
      <p className="muted">{total} {total === 1 ? "armatur" : "armaturer"}{user.role === "manufacturer" ? " (du ser vad designers ser)" : ""}</p>
      <div className="layout-search">
        <form method="get" className="card" aria-label="Filter">
          <label htmlFor="q">Sök</label>
          <input id="q" name="q" type="text" defaultValue={q ?? ""} placeholder="Namn, artikelnummer, tillverkare" />

          <label>Typ</label>
          {PRODUCT_TYPES.map((t) => (
            <label key={t} className="inline">
              <input type="checkbox" name="typ" value={t} defaultChecked={types.includes(t)} /> {t}
            </label>
          ))}

          <label htmlFor="tillverkare">Tillverkare</label>
          <select id="tillverkare" name="tillverkare" defaultValue={manufacturer ?? ""}>
            <option value="">Alla</option>
            {manufacturers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>

          <label>Effekt (W)</label>
          <div className="row">
            <input name="effekt_min" type="number" step="any" min="0" placeholder="från" defaultValue={pMin ?? ""} style={{ flex: 1, minWidth: 0 }} />
            <input name="effekt_max" type="number" step="any" min="0" placeholder="till" defaultValue={pMax ?? ""} style={{ flex: 1, minWidth: 0 }} />
          </div>

          <label htmlFor="lumen_min">Ljusflöde minst (lm)</label>
          <input id="lumen_min" name="lumen_min" type="number" min="0" defaultValue={lumenMin ?? ""} />

          <label htmlFor="farg">Färgtemperatur</label>
          <select id="farg" name="farg" defaultValue={cct?.value ?? ""}>
            <option value="">Alla</option>
            {CCT_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>

          <label htmlFor="ip_min">Skyddsklass minst</label>
          <select id="ip_min" name="ip_min" defaultValue={ipMin ?? ""}>
            <option value="">Alla</option>
            {IP_OPTIONS.map((v) => <option key={v} value={v}>IP{v}</option>)}
          </select>

          <label htmlFor="montering">Montering</label>
          <select id="montering" name="montering" defaultValue={mounting ?? ""}>
            <option value="">Alla</option>
            {MOUNTINGS.map((m) => <option key={m}>{m}</option>)}
          </select>

          <label className="inline"><input type="checkbox" name="dimbar" value="1" defaultChecked={dimmable} /> Dimbar</label>
          <label className="inline"><input type="checkbox" name="prov" value="1" defaultChecked={sample} /> Provarmatur finns</label>

          <label htmlFor="sortera">Sortera efter</label>
          <select id="sortera" name="sortera" defaultValue={sort}>
            <option value="namn">Namn</option>
            <option value="effekt">Effekt (lägst först)</option>
            <option value="lumen">Ljusflöde (högst först)</option>
            <option value="effektivitet">Effektivitet (lm/W)</option>
            <option value="kontrollerad">Senast kontrollerad</option>
          </select>

          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit">Filtrera</button>
            <Link className="btn secondary" href="/sok">Rensa</Link>
          </div>
        </form>

        <div>
          {products.length === 0 ? (
            <div className="notice info">Inga armaturer matchar. Prova att ta bort några filter.</div>
          ) : (
            <form action="/jamfor" method="get">
              <div className="row between" style={{ marginBottom: ".75rem" }}>
                <span className="small muted">Markera 2–4 armaturer och jämför dem.</span>
                <button type="submit" className="secondary">Jämför valda</button>
              </div>
              <div className="grid cards">
                {products.map((p) => <ProductCard key={p.id} p={p} selectable />)}
              </div>
            </form>
          )}
          {pages > 1 && (
            <div className="pager">
              {page > 1 && <Link className="btn secondary small" href={qs({ sida: String(page - 1) })}>← Föregående</Link>}
              <span className="small muted">Sida {page} av {pages}</span>
              {page < pages && <Link className="btn secondary small" href={qs({ sida: String(page + 1) })}>Nästa →</Link>}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
