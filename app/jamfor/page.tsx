import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PRODUCT_SELECT, type Product } from "@/lib/types";
import { efficacy, fmt, fmtDate } from "@/lib/format";
import { safeHref } from "@/lib/validate";
import ProductImage from "@/components/ProductImage";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SP }) {
  await requireUser();
  const sp = await searchParams;
  const ids = ([] as string[])
    .concat(sp.id ?? [])
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 4);

  if (ids.length < 2) {
    return (
      <>
        <Link className="back" href="/sok">← Tillbaka till sök</Link>
        <h1>Jämför armaturer</h1>
        <div className="notice info">Välj minst två armaturer i sökningen för att jämföra dem.</div>
      </>
    );
  }

  const rows = await query<Product>(
    `SELECT ${PRODUCT_SELECT} FROM products p JOIN companies c ON c.id = p.manufacturer_id
      WHERE p.id = ANY($1) AND c.approved = true`,
    [ids]
  );
  const products = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as Product[];

  type Row = { label: string; get: (p: Product) => string; value?: (p: Product) => number | null; best?: "max" | "min" };
  const spec: Row[] = [
    { label: "Tillverkare", get: (p) => p.manufacturer_name },
    { label: "Artikelnummer", get: (p) => p.article_no ?? "–" },
    { label: "Typ", get: (p) => p.type },
    { label: "Montering", get: (p) => p.mounting ?? "–" },
    { label: "Effekt", get: (p) => fmt(p.power_w, "W"), value: (p) => (p.power_w ? Number(p.power_w) : null), best: "min" },
    { label: "Ljusflöde", get: (p) => fmt(p.lumen, "lm"), value: (p) => p.lumen, best: "max" },
    { label: "Effektivitet", get: (p) => { const e = efficacy(p.lumen, p.power_w); return e ? `${e} lm/W` : "–"; }, value: (p) => efficacy(p.lumen, p.power_w), best: "max" },
    { label: "Färgtemperatur", get: (p) => fmt(p.cct_k, "K") },
    { label: "CRI", get: (p) => fmt(p.cri), value: (p) => p.cri, best: "max" },
    { label: "Ljusvinkel", get: (p) => fmt(p.beam_angle, "°") },
    { label: "Skyddsklass", get: (p) => (p.ip !== null ? `IP${p.ip}` : "–"), value: (p) => p.ip, best: "max" },
    { label: "Dimbar", get: (p) => (p.dimmable ? "Ja" : "Nej") },
    { label: "Provarmatur", get: (p) => (p.sample_available ? "Finns" : "Nej") },
    { label: "Pris", get: (p) => p.price_text },
    { label: "Leveranstid", get: (p) => p.lead_time ?? "–" },
    { label: "Senast kontrollerad", get: (p) => fmtDate(p.checked_at) },
  ];

  return (
    <>
      <Link className="back" href="/sok">← Tillbaka till sök</Link>
      <h1>Jämför armaturer</h1>
      <p className="muted small">Grön cell = bästa värdet i raden (där det går att jämföra). Kontrollera alltid mot tillverkarens datablad.</p>
      <div className="tablewrap">
        <table className="cmp">
          <thead>
            <tr>
              <th className="rowhead"></th>
              {products.map((p) => (
                <th key={p.id} style={{ textTransform: "none", letterSpacing: 0, color: "inherit", minWidth: 190 }}>
                  <div style={{ background: "#eceae4", borderRadius: 8, aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: ".5rem" }}>
                    <ProductImage url={p.image_url} type={p.type} alt={p.name} />
                  </div>
                  <Link href={`/armatur/${p.id}`}>{p.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {spec.map((r) => {
              let bestVal: number | null = null;
              if (r.value && r.best) {
                const vals = products.map((p) => r.value!(p)).filter((v): v is number => v !== null);
                if (vals.length >= 2) bestVal = r.best === "max" ? Math.max(...vals) : Math.min(...vals);
              }
              return (
                <tr key={r.label}>
                  <th className="rowhead">{r.label}</th>
                  {products.map((p) => {
                    const v = r.value?.(p) ?? null;
                    const isBest = bestVal !== null && v === bestVal;
                    return <td key={p.id} className={isBest ? "best" : ""}>{r.get(p)}</td>;
                  })}
                </tr>
              );
            })}
            <tr>
              <th className="rowhead">Hos tillverkaren</th>
              {products.map((p) => {
                const href = safeHref(p.source_url);
                return (
                  <td key={p.id}>
                    {href ? <a href={href} target="_blank" rel="noopener noreferrer">Produktsida ↗</a> : "–"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
