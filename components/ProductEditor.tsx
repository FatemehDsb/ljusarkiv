"use client";

import { startTransition, useActionState, useState } from "react";
import { previewPhotometry, saveProduct, type PreviewState, type SaveState } from "@/lib/actions/manufacturer";
import { IP_OPTIONS, MOUNTINGS, PRODUCT_TYPES } from "@/lib/constants";

type P = {
  id?: number; name?: string; article_no?: string | null; type?: string; power_w?: string | null; lumen?: number | null;
  cct_k?: number | null; cri?: number | null; ip?: number | null; mounting?: string | null; dimmable?: boolean;
  beam_angle?: string | null; description?: string | null; image_url?: string | null; source_url?: string | null;
  price_text?: string; lead_time?: string | null; sample_available?: boolean;
};

export default function ProductEditor({ product }: { product?: P }) {
  const [preview, previewAction, previewing] = useActionState<PreviewState, FormData>(previewPhotometry, undefined);
  const [save, saveAction, saving] = useActionState<SaveState, FormData>(saveProduct, undefined);
  const [applied, setApplied] = useState(0);

  const parsed = preview?.parsed;
  // Värden från filen skriver över formuläret när man trycker "Använd värdena".
  const [overrides, setOverrides] = useState<Partial<P>>({});
  const v = { ...product, ...overrides } as P;

  return (
    <div className="stack">
      <form action={previewAction} className="card">
        <h3>Läs in från fotometrifil (valfritt)</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          Ladda upp en .ldt- eller .ies-fil så fyller vi i effekt, ljusflöde, ljusvinkel och artikelnummer.
          Skyddsklass, CRI, montering, bild och pris finns inte i filerna och fyller du i själv.
        </p>
        <div className="row">
          <input type="file" name="file" accept=".ldt,.ies" aria-label="Fotometrifil" />
          <button type="submit" className="secondary" disabled={previewing}>{previewing ? "Läser…" : "Läs filen"}</button>
        </div>
        {preview?.error && <div className="notice err" role="alert">{preview.error}</div>}
        {parsed && (
          <div className="notice info" role="status">
            <strong>{preview?.filename}</strong> ({parsed.format}) – hittade:
            <ul style={{ margin: ".4rem 0" }}>
              <li>Namn: {parsed.name ?? "–"} · Artikelnummer: {parsed.article_no ?? "–"}</li>
              <li>Effekt: {parsed.power_w ?? "–"} W · Ljusflöde: {parsed.lumen ?? "–"} lm · Ljusvinkel: {parsed.beam_angle ?? "–"}°</li>
              <li>Färgtemperatur: {parsed.cct_k ?? "–"} K · CRI: {parsed.cri ?? "–"}</li>
            </ul>
            {parsed.warnings.map((w) => <div key={w} className="small">⚠ {w}</div>)}
            <button
              type="button"
              className="small"
              onClick={() => {
                setOverrides({
                  ...(parsed.name ? { name: parsed.name } : {}),
                  ...(parsed.article_no ? { article_no: parsed.article_no } : {}),
                  ...(parsed.power_w !== null ? { power_w: String(parsed.power_w) } : {}),
                  ...(parsed.lumen !== null ? { lumen: parsed.lumen } : {}),
                  ...(parsed.beam_angle !== null ? { beam_angle: String(parsed.beam_angle) } : {}),
                  ...(parsed.cct_k !== null ? { cct_k: parsed.cct_k } : {}),
                  ...(parsed.cri !== null ? { cri: parsed.cri } : {}),
                });
                setApplied((n) => n + 1);
              }}
            >
              Använd värdena i formuläret
            </button>
          </div>
        )}
      </form>

      <form
        className="card"
        key={applied}
        onSubmit={(e) => {
          // Skicka via startTransition så att React inte nollställer fälten när något är fel.
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => saveAction(fd));
        }}
      >
        {save?.error && <div className="notice err" role="alert">{save.error}</div>}
        {v.id && <input type="hidden" name="id" value={v.id} />}
        <div className="grid cols-2">
          <div><label htmlFor="name">Namn *</label><input id="name" name="name" type="text" required maxLength={160} defaultValue={v.name ?? ""} /></div>
          <div><label htmlFor="article_no">Artikelnummer</label><input id="article_no" name="article_no" type="text" maxLength={80} defaultValue={v.article_no ?? ""} /></div>
          <div>
            <label htmlFor="type">Typ *</label>
            <select id="type" name="type" required defaultValue={v.type ?? ""}>
              <option value="" disabled>Välj…</option>
              {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="mounting">Montering</label>
            <select id="mounting" name="mounting" defaultValue={v.mounting ?? ""}>
              <option value="">–</option>
              {MOUNTINGS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label htmlFor="power_w">Effekt (W)</label><input id="power_w" name="power_w" type="number" step="0.1" min="0" defaultValue={v.power_w ?? ""} /></div>
          <div><label htmlFor="lumen">Ljusflöde (lm)</label><input id="lumen" name="lumen" type="number" min="0" defaultValue={v.lumen ?? ""} /></div>
          <div><label htmlFor="cct_k">Färgtemperatur (K)</label><input id="cct_k" name="cct_k" type="number" min="1000" max="10000" defaultValue={v.cct_k ?? ""} /></div>
          <div><label htmlFor="cri">CRI</label><input id="cri" name="cri" type="number" min="0" max="100" defaultValue={v.cri ?? ""} /></div>
          <div>
            <label htmlFor="ip">Skyddsklass (IP)</label>
            <select id="ip" name="ip" defaultValue={v.ip ?? ""}>
              <option value="">–</option>
              {IP_OPTIONS.map((i) => <option key={i} value={i}>IP{i}</option>)}
            </select>
          </div>
          <div><label htmlFor="beam_angle">Ljusvinkel (°)</label><input id="beam_angle" name="beam_angle" type="number" step="0.1" min="0" max="360" defaultValue={v.beam_angle ?? ""} /></div>
          <div><label htmlFor="price_text">Pris (eller &quot;Offereras&quot;)</label><input id="price_text" name="price_text" type="text" maxLength={80} defaultValue={v.price_text ?? "Offereras"} /></div>
          <div><label htmlFor="lead_time">Leveranstid</label><input id="lead_time" name="lead_time" type="text" maxLength={80} placeholder="t.ex. 2–3 veckor" defaultValue={v.lead_time ?? ""} /></div>
        </div>
        <label htmlFor="description">Beskrivning</label>
        <textarea id="description" name="description" maxLength={2000} defaultValue={v.description ?? ""} />
        <div className="grid cols-2">
          <div><label htmlFor="source_url">Länk till produktsidan hos er</label><input id="source_url" name="source_url" type="text" placeholder="https://" defaultValue={v.source_url ?? ""} /></div>
          <div><label htmlFor="image_url">Bildadress (https)</label><input id="image_url" name="image_url" type="text" placeholder="https://" defaultValue={v.image_url ?? ""} /></div>
        </div>
        <label className="inline"><input type="checkbox" name="dimmable" defaultChecked={v.dimmable ?? false} /> Dimbar</label>
        <label className="inline"><input type="checkbox" name="sample_available" defaultChecked={v.sample_available ?? false} /> Provarmatur kan lånas ut</label>
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit" disabled={saving}>{saving ? "Sparar…" : "Spara produkt"}</button>
        </div>
      </form>
    </div>
  );
}
