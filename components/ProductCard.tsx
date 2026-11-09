import Link from "next/link";
import type { Product } from "@/lib/types";
import { fmt, efficacy } from "@/lib/format";
import ProductImage from "./ProductImage";

export default function ProductCard({ p, selectable = false }: { p: Product; selectable?: boolean }) {
  const eff = efficacy(p.lumen, p.power_w);
  return (
    <article className="card pcard">
      <div className="img">
        <ProductImage url={p.image_url} type={p.type} alt={`${p.manufacturer_name} ${p.name}`} />
      </div>
      <div className="body">
        <div className="small muted">{p.manufacturer_name}</div>
        <Link className="title" href={`/armatur/${p.id}`}>{p.name}</Link>
        <div className="tags">
          <span className="tag">{p.type}</span>
          {p.mounting && p.mounting !== p.type && <span className="tag">{p.mounting}</span>}
          {p.ip !== null && <span className="tag">IP{p.ip}</span>}
          {p.dimmable && <span className="tag">Dimbar</span>}
          {p.sample_available && <span className="tag warm">Provarmatur</span>}
        </div>
        <div className="small">
          {fmt(p.power_w, "W")} · {fmt(p.lumen, "lm")}
          {p.cct_k ? ` · ${p.cct_k} K` : ""}
          {eff ? ` · ${eff} lm/W` : ""}
        </div>
        {selectable && (
          <label className="inline small" style={{ marginTop: "auto" }}>
            <input type="checkbox" name="id" value={p.id} /> Jämför
          </label>
        )}
      </div>
    </article>
  );
}
