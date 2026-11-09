import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { efficacy, fmt, fmtDate } from "@/lib/format";
import { safeHref } from "@/lib/validate";
import { addToProject, requestQuote, requestSample } from "@/lib/actions/designer";
import ProductImage from "@/components/ProductImage";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SP;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const pid = Number(id);
  if (!Number.isInteger(pid) || pid < 1) notFound();

  const p = await queryOne<Product & { approved: boolean }>(
    `SELECT ${PRODUCT_SELECT}, c.approved FROM products p JOIN companies c ON c.id = p.manufacturer_id WHERE p.id = $1`,
    [pid]
  );
  // Andra tillverkares ogranskade produkter är dolda; en tillverkare får se sina egna.
  if (!p || (!p.approved && user.company_id !== p.manufacturer_id)) notFound();

  const projects =
    user.role === "designer"
      ? await query<{ id: number; name: string }>("SELECT id, name FROM projects WHERE owner_id = $1 ORDER BY created_at DESC", [user.id])
      : [];
  const eff = efficacy(p.lumen, p.power_w);
  const source = safeHref(p.source_url);
  const fel = typeof sp.fel === "string" ? sp.fel : null;

  return (
    <>
      <Link className="back" href="/sok">← Tillbaka till sök</Link>
      {fel && <div className="notice err" role="alert">{fel}</div>}
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ background: "#eceae4", aspectRatio: "4 / 3", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ProductImage url={p.image_url} type={p.type} alt={`${p.manufacturer_name} ${p.name}`} />
          </div>
        </div>
        <div>
          <div className="muted">{p.manufacturer_name}</div>
          <h1>{p.name}</h1>
          <div className="tags" style={{ margin: ".5rem 0 1rem" }}>
            <span className="tag">{p.type}</span>
            {p.sample_available && <span className="tag warm">Provarmatur finns</span>}
            {!p.approved && <span className="tag bad">Syns inte för designers än</span>}
          </div>
          {p.description && <p>{p.description}</p>}
          <dl className="specs">
            <dt>Artikelnummer</dt><dd>{p.article_no ?? "–"}</dd>
            <dt>Montering</dt><dd>{p.mounting ?? "–"}</dd>
            <dt>Effekt</dt><dd>{fmt(p.power_w, "W")}</dd>
            <dt>Ljusflöde</dt><dd>{fmt(p.lumen, "lm")}{eff ? ` (${eff} lm/W)` : ""}</dd>
            <dt>Färgtemperatur</dt><dd>{fmt(p.cct_k, "K")}</dd>
            <dt>CRI</dt><dd>{fmt(p.cri)}</dd>
            <dt>Ljusvinkel</dt><dd>{fmt(p.beam_angle, "°")}</dd>
            <dt>Skyddsklass</dt><dd>{p.ip !== null ? `IP${p.ip}` : "–"}</dd>
            <dt>Dimbar</dt><dd>{p.dimmable ? "Ja" : "Nej"}</dd>
            <dt>Pris</dt><dd>{p.price_text}</dd>
            <dt>Leveranstid</dt><dd>{p.lead_time ?? "–"}</dd>
            <dt>Senast kontrollerad</dt><dd>{fmtDate(p.checked_at)}</dd>
          </dl>
          <div className="row" style={{ marginTop: "1rem" }}>
            {source ? (
              <a className="btn secondary" href={source} target="_blank" rel="noopener noreferrer">Visa hos tillverkaren ↗</a>
            ) : null}
            <Link className="btn secondary" href={`/jamfor?id=${p.id}`}>Jämför</Link>
          </div>
          <p className="small muted">Uppgifterna kommer från tillverkaren och kan ändras. Kontrollera alltid mot tillverkarens datablad innan du specificerar.</p>
        </div>
      </div>

      {user.role === "designer" && (
        <div className="grid cols-3" style={{ marginTop: "1.5rem", alignItems: "start" }}>
          <form action={addToProject} className="card">
            <h3>Lägg i projekt</h3>
            <input type="hidden" name="product_id" value={p.id} />
            <label htmlFor="project_id">Befintligt projekt</label>
            <select id="project_id" name="project_id" defaultValue="">
              <option value="">Välj…</option>
              {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
            <label htmlFor="new_project">…eller nytt projekt</label>
            <input id="new_project" name="new_project" type="text" maxLength={120} />
            <label htmlFor="zone">Zon / rum (valfritt)</label>
            <input id="zone" name="zone" type="text" maxLength={100} placeholder="t.ex. Reception" />
            <label htmlFor="note">Anteckning (valfritt)</label>
            <textarea id="note" name="note" maxLength={1000} />
            <div style={{ marginTop: ".75rem" }}><button type="submit">Lägg till</button></div>
          </form>

          <form action={requestQuote} className="card">
            <h3>Begär offert</h3>
            <input type="hidden" name="product_id" value={p.id} />
            <label htmlFor="quantity">Antal</label>
            <input id="quantity" name="quantity" type="number" min={1} max={1000000} defaultValue={1} required />
            <label htmlFor="q_project">Projekt (valfritt)</label>
            <select id="q_project" name="project_id" defaultValue="">
              <option value="">Inget</option>
              {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
            <label htmlFor="q_message">Meddelande</label>
            <textarea id="q_message" name="message" maxLength={2000} />
            <div style={{ marginTop: ".75rem" }}><button type="submit">Skicka offertförfrågan</button></div>
          </form>

          {p.sample_available ? (
            <form action={requestSample} className="card">
              <h3>Begär provarmatur</h3>
              <input type="hidden" name="product_id" value={p.id} />
              <label htmlFor="address">Leveransadress</label>
              <textarea id="address" name="delivery_address" maxLength={500} required />
              <label htmlFor="s_project">Projekt (valfritt)</label>
              <select id="s_project" name="project_id" defaultValue="">
                <option value="">Inget</option>
                {projects.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
              </select>
              <label htmlFor="s_message">Meddelande</label>
              <textarea id="s_message" name="message" maxLength={2000} />
              <div style={{ marginTop: ".75rem" }}><button type="submit">Skicka förfrågan</button></div>
            </form>
          ) : (
            <div className="card"><h3>Provarmatur</h3><p className="muted small">Tillverkaren erbjuder ingen provarmatur för den här armaturen. Du kan fråga i en offertförfrågan.</p></div>
          )}
        </div>
      )}
    </>
  );
}
