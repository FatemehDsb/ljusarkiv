import Link from "next/link";
import { requireManufacturer } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { answerQuote } from "@/lib/actions/manufacturer";
import { Flash, StatusTag } from "@/lib/ui";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireManufacturer();
  const sp = await searchParams;
  const rows = await query<{
    id: number; product: string; quantity: number; message: string | null; status: string; answer: string | null;
    offered_price: string | null; created_at: string; designer: string; company: string | null; email: string; project: string | null;
  }>(
    `SELECT q.id, p.name AS product, q.quantity, q.message, q.status, q.answer, q.offered_price, q.created_at,
            u.name AS designer, c.name AS company, u.email, pr.name AS project
       FROM quote_requests q JOIN products p ON p.id = q.product_id JOIN users u ON u.id = q.designer_id
       LEFT JOIN companies c ON c.id = u.company_id LEFT JOIN projects pr ON pr.id = q.project_id
      WHERE p.manufacturer_id = $1
      ORDER BY (q.status = 'Ny') DESC, q.created_at DESC`,
    [user.company_id]
  );
  return (
    <>
      <Link className="back" href="/tillverkare">← Tillbaka till översikt</Link>
      <h1>Offertförfrågningar</h1>
      <Flash sp={sp} />
      {rows.length === 0 ? (
        <div className="notice info">Inga förfrågningar ännu.</div>
      ) : (
        <div className="stack">
          {rows.map((r) => (
            <div key={r.id} className="card">
              <div className="row between">
                <div><strong>{r.product}</strong> × {r.quantity}</div>
                <div className="row"><StatusTag status={r.status} /><span className="small muted">{fmtDate(r.created_at)}</span></div>
              </div>
              <div className="small muted">
                {r.designer}{r.company ? `, ${r.company}` : ""} · {r.email}{r.project ? ` · Projekt: ${r.project}` : ""}
              </div>
              {r.message && <p style={{ margin: ".5rem 0" }}>{r.message}</p>}
              {r.status === "Ny" ? (
                <form>
                  <div className="grid cols-2">
                    <div><label htmlFor={`p${r.id}`}>Pris / offert</label><input id={`p${r.id}`} name="offered_price" type="text" maxLength={120} placeholder="t.ex. 1 250 kr/st exkl. moms" /></div>
                    <div><label htmlFor={`a${r.id}`}>Svar</label><input id={`a${r.id}`} name="answer" type="text" maxLength={2000} /></div>
                  </div>
                  <div className="row" style={{ marginTop: ".6rem" }}>
                    <button type="submit" formAction={answerQuote.bind(null, r.id, "svara")}>Skicka svar</button>
                    <button type="submit" formAction={answerQuote.bind(null, r.id, "avvisa")} className="danger">Avvisa</button>
                  </div>
                </form>
              ) : (
                <div className="small">{r.offered_price && <strong>{r.offered_price}. </strong>}{r.answer}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
