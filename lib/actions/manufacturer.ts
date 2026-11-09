"use server";

import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { requireManufacturer } from "@/lib/auth";
import { FormError, dec, int, reqStr, str, url } from "@/lib/validate";
import { MOUNTINGS, PRODUCT_TYPES, SAMPLE_STATUSES } from "@/lib/constants";
import { parsePhotometry, type Parsed } from "@/lib/photometry";

export type PreviewState = { parsed?: Parsed; error?: string; filename?: string } | undefined;

export async function previewPhotometry(_prev: PreviewState, fd: FormData): Promise<PreviewState> {
  await requireManufacturer();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Välj en LDT- eller IES-fil." };
  if (file.size > 1_500_000) return { error: "Filen är för stor (max 1,5 MB)." };
  const name = file.name;
  if (!/\.(ldt|ies)$/i.test(name)) return { error: "Bara .ldt och .ies-filer stöds." };
  try {
    const parsed = parsePhotometry(name, new Uint8Array(await file.arrayBuffer()));
    return { parsed, filename: name };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Filen kunde inte läsas." };
  }
}

function readProduct(fd: FormData) {
  const type = reqStr(fd.get("type"), 40);
  if (!PRODUCT_TYPES.includes(type)) throw new FormError("Ogiltig typ.");
  const mounting = str(fd.get("mounting"), 40);
  if (mounting && !MOUNTINGS.includes(mounting)) throw new FormError("Ogiltig montering.");
  return {
    name: reqStr(fd.get("name"), 160),
    article_no: str(fd.get("article_no"), 80),
    type,
    power_w: dec(fd.get("power_w"), 0, 5000),
    lumen: int(fd.get("lumen"), 0, 1_000_000),
    cct_k: int(fd.get("cct_k"), 1000, 10000),
    cri: int(fd.get("cri"), 0, 100),
    ip: int(fd.get("ip"), 0, 69),
    mounting,
    dimmable: fd.get("dimmable") === "on",
    beam_angle: dec(fd.get("beam_angle"), 0, 360),
    description: str(fd.get("description"), 2000),
    image_url: url(fd.get("image_url")),
    source_url: url(fd.get("source_url")),
    price_text: str(fd.get("price_text"), 80) ?? "Offereras",
    lead_time: str(fd.get("lead_time"), 80),
    sample_available: fd.get("sample_available") === "on",
  };
}

export type SaveState = { error?: string } | undefined;

export async function saveProduct(_prev: SaveState, fd: FormData): Promise<SaveState> {
  const user = await requireManufacturer();
  const id = int(fd.get("id"), 1, 2147483647);
  let p: ReturnType<typeof readProduct>;
  try {
    p = readProduct(fd);
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    throw e;
  }
  const vals = [
    p.name, p.article_no, p.type, p.power_w, p.lumen, p.cct_k, p.cri, p.ip, p.mounting, p.dimmable,
    p.beam_angle, p.description, p.image_url, p.source_url, p.price_text, p.lead_time, p.sample_available,
  ];
  if (id) {
    const row = await queryOne(
      `UPDATE products SET name=$1, article_no=$2, type=$3, power_w=$4, lumen=$5, cct_k=$6, cri=$7, ip=$8,
              mounting=$9, dimmable=$10, beam_angle=$11, description=$12, image_url=$13, source_url=$14,
              price_text=$15, lead_time=$16, sample_available=$17, checked_at=CURRENT_DATE, updated_at=now()
        WHERE id=$18 AND manufacturer_id=$19 RETURNING id`,
      [...vals, id, user.company_id]
    );
    if (!row) return { error: "Produkten hittades inte." };
  } else {
    await query(
      `INSERT INTO products (name, article_no, type, power_w, lumen, cct_k, cri, ip, mounting, dimmable,
         beam_angle, description, image_url, source_url, price_text, lead_time, sample_available, manufacturer_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [...vals, user.company_id]
    );
  }
  redirect("/tillverkare/produkter?ok=" + encodeURIComponent("Produkten sparades."));
}

export async function deleteProduct(fd: FormData) {
  const user = await requireManufacturer();
  const id = int(fd.get("id"), 1, 2147483647);
  await query("DELETE FROM products WHERE id = $1 AND manufacturer_id = $2", [id, user.company_id]);
  redirect("/tillverkare/produkter?ok=" + encodeURIComponent("Produkten togs bort."));
}

export async function answerQuote(quoteId: number, choice: "svara" | "avvisa", fd: FormData) {
  const user = await requireManufacturer();
  const id = int(String(quoteId), 1, 2147483647);
  const decision = choice === "avvisa" ? "Avvisad" : "Besvarad";
  const answer = str(fd.get("answer"), 2000);
  const price = str(fd.get("offered_price"), 120);
  if (decision === "Besvarad" && !answer && !price) {
    redirect("/tillverkare/offerter?fel=" + encodeURIComponent("Skriv ett svar eller ett pris."));
  }
  await query(
    `UPDATE quote_requests q SET status = $1, answer = $2, offered_price = $3, answered_at = now()
       FROM products p WHERE q.id = $4 AND q.status = 'Ny' AND p.id = q.product_id AND p.manufacturer_id = $5`,
    [decision, answer, price, id, user.company_id]
  );
  redirect("/tillverkare/offerter?ok=" + encodeURIComponent("Svaret skickades till designern."));
}

export async function updateSample(sampleId: number, status: string, fd: FormData) {
  const user = await requireManufacturer();
  const id = int(String(sampleId), 1, 2147483647);
  if (!(SAMPLE_STATUSES as readonly string[]).includes(status)) {
    redirect("/tillverkare/prov?fel=" + encodeURIComponent("Ogiltig status."));
  }
  const ALLOWED: Record<string, string[]> = {
    Godkänd: ["Ny"],
    Avvisad: ["Ny", "Godkänd"],
    Skickad: ["Godkänd"],
    Återlämnad: ["Skickad"],
  };
  const from = ALLOWED[status];
  if (!from) redirect("/tillverkare/prov?fel=" + encodeURIComponent("Ogiltig statusändring."));
  await query(
    `UPDATE sample_requests s SET status = $1, tracking_note = COALESCE($2, s.tracking_note), updated_at = now()
       FROM products p WHERE s.id = $3 AND s.status = ANY($5) AND p.id = s.product_id AND p.manufacturer_id = $4`,
    [status, str(fd.get("tracking_note"), 500), id, user.company_id, from]
  );
  redirect("/tillverkare/prov?ok=" + encodeURIComponent("Statusen uppdaterades."));
}
