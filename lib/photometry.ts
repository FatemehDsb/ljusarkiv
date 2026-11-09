// Läser fotometrifiler (Eulumdat .ldt och IES LM-63 .ies) och plockar ut
// de fält som Ljusarkiv använder: namn, effekt, ljusflöde, ljusvinkel, mått.
// Filerna innehåller INTE skyddsklass, CRI (oftast), monteringssätt, bild eller pris.

export type Parsed = {
  format: "LDT" | "IES";
  manufacturer: string | null;
  name: string | null;
  article_no: string | null;
  power_w: number | null;
  lumen: number | null;
  cri: number | null;
  cct_k: number | null;
  beam_angle: number | null;
  dimensions_mm: { length: number | null; width: number | null; height: number | null };
  warnings: string[];
};

export function decodeText(buf: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("latin1").decode(buf);
  }
}

function num(s: string | undefined): number | null {
  if (s === undefined) return null;
  const v = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(v) ? v : null;
}

function round(v: number | null, d = 0): number | null {
  if (v === null) return null;
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

/** Ljusvinkel (full bredd vid 50 % av maxintensiteten), i grader. */
export function beamAngle(gammas: number[], intensities: number[]): number | null {
  if (gammas.length < 2 || gammas.length !== intensities.length) return null;
  let maxI = 0;
  let maxIdx = 0;
  intensities.forEach((v, i) => {
    if (v > maxI) {
      maxI = v;
      maxIdx = i;
    }
  });
  if (maxI <= 0) return null;
  const half = maxI / 2;

  const cross = (dir: 1 | -1): number | null => {
    for (let i = maxIdx; i + dir >= 0 && i + dir < gammas.length; i += dir) {
      const a = intensities[i];
      const b = intensities[i + dir];
      if (a >= half && b < half) {
        const t = (a - half) / (a - b);
        return gammas[i] + t * (gammas[i + dir] - gammas[i]);
      }
    }
    return null;
  };

  const up = cross(1);
  const down = cross(-1);
  const peak = gammas[maxIdx];
  if (up !== null && down !== null) return up - down;
  if (up !== null) return 2 * (up - peak);
  if (down !== null) return 2 * (peak - down);
  return null;
}

// ---------------------------------------------------------------- LDT

export function parseLdt(text: string): Parsed {
  const lines = text.replace(/\r/g, "").split("\n");
  const warnings: string[] = [];
  const L = (n: number) => (lines[n - 1] ?? "").trim();

  const ityp = num(L(2));
  const isym = num(L(3));
  const mc = num(L(4));
  const ng = num(L(6));
  if (mc === null || ng === null || isym === null || ityp === null) {
    throw new Error("Filen ser inte ut som en giltig LDT-fil.");
  }

  const length = num(L(13));
  const width = num(L(14));
  const height = num(L(15));
  const lorl = num(L(23));
  const nSets = num(L(26)) ?? 0;

  let idx = 27;
  let totalFlux = 0;
  let totalWatt = 0;
  let cct: string | null = null;
  let cri: string | null = null;
  for (let s = 0; s < nSets; s++) {
    // 6 rader per lampsats: antal, typ, ljusflöde, färgtemp, CRI-grupp, effekt
    totalFlux += num(L(idx + 2)) ?? 0;
    if (!cct) cct = L(idx + 3) || null;
    if (!cri) cri = L(idx + 4) || null;
    totalWatt += num(L(idx + 5)) ?? 0;
    idx += 6;
  }
  idx += 10; // direkta ljusflödesandelar (DR1–DR10)

  const nums: number[] = [];
  for (let i = idx; i <= lines.length; i++) {
    const v = num(L(i));
    if (v !== null) nums.push(v);
  }

  const cAngles = nums.slice(0, mc);
  const gAngles = nums.slice(mc, mc + ng);
  let setsListed = mc;
  if (isym === 1) setsListed = 1;
  else if (isym === 2 || isym === 3) setsListed = mc / 2 + 1;
  else if (isym === 4) setsListed = mc / 4 + 1;
  setsListed = Math.max(1, Math.floor(setsListed));

  const data = nums.slice(mc + ng);
  let beam: number | null = null;
  if (data.length >= ng) {
    const firstPlane = data.slice(0, ng);
    beam = beamAngle(gAngles, firstPlane);
  } else {
    warnings.push("Intensitetstabellen är ofullständig – ljusvinkel kunde inte beräknas.");
  }
  if (data.length < setsListed * ng) {
    warnings.push("Färre intensitetsvärden än väntat – kontrollera filen.");
  }
  void cAngles;

  let luminaireFlux: number | null = totalFlux > 0 ? totalFlux : null;
  if (luminaireFlux !== null && lorl !== null && lorl > 0 && lorl <= 100) {
    luminaireFlux = luminaireFlux * (lorl / 100);
  }

  const cctNum = cct ? num(cct.replace(/[^0-9.,]/g, "")) : null;
  // CRI står ibland som grupp ("1B") eller som "1/80" – godta bara ett tal mellan 50 och 100.
  let criNum: number | null = null;
  if (cri) {
    for (const tok of cri.split(/[^0-9]+/)) {
      const v = parseInt(tok, 10);
      if (v >= 50 && v <= 100) {
        criNum = v;
        break;
      }
    }
    if (criNum === null) {
      warnings.push(`CRI kunde inte tolkas ur "${cri}" – fyll i det från tillverkarens datablad.`);
    }
  }

  const w = width ?? 0;
  return {
    format: "LDT",
    manufacturer: L(1) || null,
    name: L(9) || null,
    article_no: L(10) || null,
    power_w: round(totalWatt > 0 ? totalWatt : null, 1),
    lumen: round(luminaireFlux, 0),
    cri: criNum,
    cct_k: cctNum !== null && cctNum >= 1500 ? Math.round(cctNum) : null,
    beam_angle: round(beam, 1),
    dimensions_mm: {
      length: length && length > 0 ? length : null,
      width: w > 0 ? w : null,
      height: height && height > 0 ? height : null,
    },
    warnings,
  };
}

// ---------------------------------------------------------------- IES

export function parseIes(text: string): Parsed {
  const warnings: string[] = [];
  const raw = text.replace(/\r/g, "").split("\n");
  const kw: Record<string, string> = {};
  let i = 0;
  let last = "";
  for (; i < raw.length; i++) {
    const line = raw[i].trim();
    if (/^TILT\s*=/i.test(line)) break;
    const m = line.match(/^\[([A-Z0-9_]+)\]\s*(.*)$/i);
    if (m) {
      last = m[1].toUpperCase();
      kw[last] = (kw[last] ? kw[last] + " " : "") + m[2];
    } else if (last && line) {
      kw[last] = (kw[last] ?? "") + " " + line;
    }
  }
  if (i >= raw.length) throw new Error("Filen ser inte ut som en giltig IES-fil (TILT saknas).");

  const tilt = raw[i].split("=")[1]?.trim().toUpperCase() ?? "NONE";
  i++;
  const rest: string[] = [];
  let tokens = raw.slice(i).join(" ").split(/[\s,]+/).filter(Boolean);
  if (tilt === "INCLUDE") {
    // lampgeometri, antal par, vinklar, faktorer
    const n = parseInt(tokens[1], 10);
    tokens = tokens.slice(2 + 2 * n);
  }
  void rest;
  const t = tokens.map((x) => parseFloat(x));
  if (t.length < 13 || t.slice(0, 13).some((x) => Number.isNaN(x))) {
    throw new Error("IES-filens talrader kunde inte läsas.");
  }

  const [nLamps, lumPerLamp, multiplier, nV, nH, , units, w, l, h, , , watts] = t;
  const vert = t.slice(13, 13 + nV);
  const horiz = t.slice(13 + nV, 13 + nV + nH);
  const cdStart = 13 + nV + nH;
  const cd = t.slice(cdStart, cdStart + nV * nH);
  if (cd.length < nV * nH) warnings.push("Intensitetstabellen är ofullständig.");

  const plane = (k: number) => cd.slice(k * nV, (k + 1) * nV).map((x) => x * multiplier);

  // Ljusflöde: angivet per lampa, annars (absolut fotometri, -1) integrerat ur tabellen.
  let lumen: number | null = null;
  if (lumPerLamp > 0) {
    lumen = lumPerLamp * nLamps;
  } else if (cd.length === nV * nH && nV > 1) {
    const meanI: number[] = [];
    for (let j = 0; j < nV; j++) {
      if (nH === 1) meanI.push(cd[j] * multiplier);
      else {
        let sum = 0;
        for (let k = 0; k < nH - 1; k++) {
          sum += ((cd[k * nV + j] + cd[(k + 1) * nV + j]) / 2) * (horiz[k + 1] - horiz[k]);
        }
        meanI.push((sum / (horiz[nH - 1] - horiz[0])) * multiplier);
      }
    }
    let flux = 0;
    for (let j = 0; j < nV - 1; j++) {
      const g0 = (vert[j] * Math.PI) / 180;
      const g1 = (vert[j + 1] * Math.PI) / 180;
      const iAvg = (meanI[j] + meanI[j + 1]) / 2;
      flux += iAvg * 2 * Math.PI * (Math.cos(g0) - Math.cos(g1));
    }
    lumen = flux;
    warnings.push(
      "Ljusflödet är beräknat ur intensitetstabellen (absolut fotometri) – kontrollera mot tillverkarens datablad."
    );
  }

  const beam = nH > 0 && nV > 1 ? beamAngle(vert, plane(0)) : null;

  const toMm = (v: number) => {
    const a = Math.abs(v);
    if (!a) return null;
    return units === 1 ? Math.round(a * 304.8) : Math.round(a * 1000);
  };

  const luminaire = kw["LUMINAIRE"]?.trim() || kw["LUMCAT"]?.trim() || null;
  return {
    format: "IES",
    manufacturer: kw["MANUFAC"]?.trim() || null,
    name: luminaire,
    article_no: kw["LUMCAT"]?.trim() || null,
    power_w: round(Number.isFinite(watts) && watts > 0 ? watts : null, 1),
    lumen: round(lumen, 0),
    cri: null,
    cct_k: null,
    beam_angle: round(beam, 1),
    dimensions_mm: { length: toMm(l), width: toMm(w), height: toMm(h) },
    warnings,
  };
}

export function parsePhotometry(filename: string, buf: Uint8Array): Parsed {
  const text = decodeText(buf);
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ies")) return parseIes(text);
  if (lower.endsWith(".ldt")) return parseLdt(text);
  if (text.trimStart().startsWith("IESNA")) return parseIes(text);
  return parseLdt(text);
}
