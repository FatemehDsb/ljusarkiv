import Link from "next/link";
import { requireDesigner } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { cancelRequest } from "@/lib/actions/designer";
import { Flash, StatusTag } from "@/lib/ui";
import ConfirmButton from "@/components/ConfirmButton";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireDesigner();
  const sp = await searchParams;

  const quotes = await query<{
    id: number; product_id: number; product: string; manufacturer: string; project: string | null;
    quantity: number; message: string | null; status: string; answer: string | null; offered_price: string | null;
    created_at: string; answered_at: string | null;
  }>(
    `SELECT q.id, q.product_id, p.name AS product, c.name AS manufacturer, pr.name AS project, q.quantity, q.message,
            q.status, q.answer, q.offered_price, q.created_at, q.answered_at
       FROM quote_requests q JOIN products p ON p.id = q.product_id JOIN companies c ON c.id = p.manufacturer_id
       LEFT JOIN projects pr ON pr.id = q.project_id
      WHERE q.designer_id = $1 ORDER BY q.created_at DESC`,
    [user.id]
  );
  const samples = await query<{
    id: number; product_id: number; product: string; manufacturer: string; project: string | null;
    status: string; tracking_note: string | null; created_at: string; updated_at: string; delivery_address: string;
  }>(
    `SELECT s.id, s.product_id, p.name AS product, c.name AS manufacturer, pr.name AS project, s.status,
            s.tracking_note, s.created_at, s.updated_at, s.delivery_address
       FROM sample_requests s JOIN products p ON p.id = s.product_id JOIN companies c ON c.id = p.manufacturer_id
       LEFT JOIN projects pr ON pr.id = s.project_id
      WHERE s.designer_id = $1 ORDER BY s.created_at DESC`,
    [user.id]
  );

  return (
    <>
      <h1>Mina förfrågningar</h1>
      <Flash sp={sp} />

      <h2>Offertförfrågningar</h2>
      {quotes.length === 0 ? (
        <div className="notice info">Inga offertförfrågningar ännu. <Link href="/sok">Sök en armatur</Link> och välj &quot;Begär offert&quot;.</div>
      ) : (
        <div className="tablewrap"><table>
          <thead><tr><th>Armatur</th><th>Antal</th><th>Projekt</th><th>Skickad</th><th>Status</th><th>Svar</th><th></th></tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td><Link href={`/armatur/${q.product_id}`}>{q.product}</Link><div className="small muted">{q.manufacturer}</div></td>
                <td>{q.quantity}</td>
                <td>{q.project ?? "–"}</td>
                <td>{fmtDate(q.created_at)}</td>
                <td><StatusTag status={q.status} /></td>
                <td>
                  {q.offered_price && <div><strong>{q.offered_price}</strong></div>}
                  {q.answer && <div className="small">{q.answer}</div>}
                  {q.answered_at && <div className="small muted">{fmtDate(q.answered_at)}</div>}
                </td>
                <td>
                  {q.status === "Ny" && (
                    <form action={cancelRequest}>
                      <input type="hidden" name="id" value={q.id} /><input type="hidden" name="kind" value="offert" />
                      <ConfirmButton message="Dra tillbaka förfrågan?">Dra tillbaka</ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      <h2>Provarmaturer</h2>
      {samples.length === 0 ? (
        <div className="notice info">Inga provarmaturförfrågningar ännu.</div>
      ) : (
        <div className="tablewrap"><table>
          <thead><tr><th>Armatur</th><th>Projekt</th><th>Skickad</th><th>Status</th><th>Information från tillverkaren</th><th></th></tr></thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/armatur/${s.product_id}`}>{s.product}</Link><div className="small muted">{s.manufacturer}</div></td>
                <td>{s.project ?? "–"}</td>
                <td>{fmtDate(s.created_at)}</td>
                <td><StatusTag status={s.status} /><div className="small muted">{fmtDate(s.updated_at)}</div></td>
                <td>{s.tracking_note ?? "–"}</td>
                <td>
                  {s.status === "Ny" && (
                    <form action={cancelRequest}>
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="kind" value="prov" />
                      <ConfirmButton message="Dra tillbaka förfrågan?">Dra tillbaka</ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
