export function str(v: FormDataEntryValue | null | undefined, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

export function reqStr(v: FormDataEntryValue | null | undefined, max = 2000): string {
  const s = str(v, max);
  if (!s) throw new FormError("Obligatoriskt fält saknas.");
  return s;
}

export function int(
  v: FormDataEntryValue | null | undefined,
  min: number,
  max: number
): number | null {
  const s = str(v, 20);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) {
    throw new FormError(`Ogiltigt värde (${min}–${max}).`);
  }
  return n;
}

export function dec(
  v: FormDataEntryValue | null | undefined,
  min: number,
  max: number
): number | null {
  const s = str(v, 20);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new FormError(`Ogiltigt värde (${min}–${max}).`);
  }
  return n;
}

/** Bara http(s)-länkar släpps igenom (skyddar mot javascript:-länkar). */
export function url(v: FormDataEntryValue | null | undefined): string | null {
  const s = str(v, 500);
  if (s === null) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    throw new FormError("Ogiltig webbadress.");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new FormError("Ogiltig webbadress.");
  }
  return u.toString();
}

export function safeHref(v: string | null | undefined): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function intParam(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n < 2147483647 ? n : null;
}

export function numParam(v: string | string[] | undefined): number | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function strParam(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t.slice(0, 100) : null;
}

export class FormError extends Error {}
