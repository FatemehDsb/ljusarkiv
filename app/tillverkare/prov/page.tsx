import Link from "next/link";
import { requireManufacturer } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { updateSample } from "@/lib/actions/manufacturer";
import { Flash, StatusTag } from "@/lib/ui";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireManufacturer();
  const sp = await searchParams;
  const rows = await query<{
    id: number; product: string; message: string | null; status: string; tracking_note: string | null; delivery_address: string;
    created_at: string; updated_at: string; designer: string; company: string | null; email: string; project: string | null;
  }>(
    `SELECT s.id, p.name AS product, s.message, s.status, s.tracking_note, s.delivery_address, s.created_at, s.updated_at,
            u.name AS designer, c.name AS company, u.email, pr.name AS project
       FROM sample_requests s JOIN products p ON p.id = s.product_id JOIN users u ON u.id = s.designer_id
       LEFT JOIN companies c ON c.id = u.company_id LEFT JOIN projects pr ON pr.id = s.project_id
      WHERE p.manufacturer_id = $1
      ORDER BY (s.status = 'Ny') DESC, (s.status = 'Skickad') DESC, s.created_at DESC`,
    [user.company_id]
  );
  const next: Record<string, string[]> = {
    Ny: ["Godkänd", "Avvisad"],
    Godkänd: ["Skickad", "Avvisad"],
    Skickad: ["Återlämnad"],
    Återlämnad: [],
    Avvisad: [],
  };
  return (
    <>
      <Link className="back" href="/tillverkare">← Tillbaka till översikt</Link>
      <h1>Provarmaturer</h1>
      <Flash sp={sp} />
      {rows.length === 0 ? (
        <div className="notice info">Inga förfrågningar ännu.</div>
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <div key={r.id} className="card">
              <div className="row between">
                <strong>{r.product}</strong>
                <div className="row"><StatusTag status={r.status} /><span className="small muted">{fmtDate(r.created_at)}</span></div>
              </div>
              <div className="small muted">
                {r.designer}{r.company ? `, ${r.company}` : ""} · {r.email}{r.project ? ` · Projekt: ${r.project}` : ""}
              </div>
              <div className="small" style={{ whiteSpace: "pre-line", margin: ".4rem 0" }}><strong>Leverans:</strong> {r.delivery_address}</div>
              {r.message && <p style={{ margin: ".4rem 0" }}>{r.message}</p>}
              {r.tracking_note && <div className="small"><strong>Notering:</strong> {r.tracking_note}</div>}
              {next[r.status].length > 0 && (
                <form style={{ marginTop: ".5rem" }}>
                  <label htmlFor={`t${r.id}`}>Notering till designern (t.ex. spårningsnummer)</label>
                  <input id={`t${r.id}`} name="tracking_note" type="text" maxLength={500} />
                  <div className="row" style={{ marginTop: ".6rem" }}>
                    {next[r.status].map((s) => (
                      <button key={s} type="submit" formAction={updateSample.bind(null, r.id, s)} className={s === "Avvisad" ? "danger" : ""}>
                        {s === "Godkänd" ? "Godkänn" : s === "Skickad" ? "Markera som skickad" : s === "Återlämnad" ? "Markera som återlämnad" : "Avvisa"}
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
