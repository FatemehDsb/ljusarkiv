import Link from "next/link";
import { notFound } from "next/navigation";
import { requireManufacturer } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import ProductEditor from "@/components/ProductEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireManufacturer();
  const { id } = await params;
  const pid = Number(id);
  if (!Number.isInteger(pid) || pid < 1) notFound();
  const p = await queryOne<Record<string, unknown>>(
    `SELECT id, name, article_no, type, power_w, lumen, cct_k, cri, ip, mounting, dimmable, beam_angle,
            description, image_url, source_url, price_text, lead_time, sample_available
       FROM products WHERE id = $1 AND manufacturer_id = $2`,
    [pid, user.company_id]
  );
  if (!p) notFound();
  return (
    <>
      <Link className="back" href="/tillverkare/produkter">← Tillbaka till produkter</Link>
      <h1>Redigera produkt</h1>
      <p className="small muted">När du sparar uppdateras &quot;senast kontrollerad&quot; till dagens datum.</p>
      <ProductEditor product={p as never} />
    </>
  );
}
