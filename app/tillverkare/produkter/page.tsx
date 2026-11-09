import Link from "next/link";
import { requireManufacturer } from "@/lib/auth";
import { query } from "@/lib/db";
import { fmt, fmtDate } from "@/lib/format";
import { deleteProduct } from "@/lib/actions/manufacturer";
import { Flash } from "@/lib/ui";
import ConfirmButton from "@/components/ConfirmButton";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  const user = await requireManufacturer();
  const sp = await searchParams;
  const rows = await query<{
    id: number; name: string; article_no: string | null; type: string; power_w: string | null;
    lumen: number | null; sample_available: boolean; checked_at: string;
  }>(
    "SELECT id, name, article_no, type, power_w, lumen, sample_available, checked_at FROM products WHERE manufacturer_id = $1 ORDER BY name",
    [user.company_id]
  );
  return (
    <>
      <Link className="back" href="/tillverkare">← Tillbaka till översikt</Link>
      <div className="row between">
        <h1>Produkter</h1>
        <Link href="/tillverkare/produkter/ny" className="btn">Lägg till produkt</Link>
      </div>
      <Flash sp={sp} />
      {rows.length === 0 ? (
        <div className="notice info">Ni har inga produkter ännu.</div>
      ) : (
        <div className="tablewrap"><table>
          <thead><tr><th>Namn</th><th>Art.nr</th><th>Typ</th><th>Effekt</th><th>Ljusflöde</th><th>Prov</th><th>Kontrollerad</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/tillverkare/produkter/${r.id}`}>{r.name}</Link></td>
                <td>{r.article_no ?? "–"}</td>
                <td>{r.type}</td>
                <td>{fmt(r.power_w, "W")}</td>
                <td>{fmt(r.lumen, "lm")}</td>
                <td>{r.sample_available ? "Ja" : "Nej"}</td>
                <td>{fmtDate(r.checked_at)}</td>
                <td>
                  <div className="row">
                    <Link className="btn secondary small" href={`/tillverkare/produkter/${r.id}`}>Redigera</Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmButton message={`Ta bort ${r.name}? Förfrågningar kopplade till produkten tas också bort.`}>Ta bort</ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );
}
