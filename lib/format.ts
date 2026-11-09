export function fmtDate(d: Date | string | null): string {
  if (!d) return "–";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("sv-SE", { year: "numeric", month: "short", day: "numeric" });
}
export function fmt(n: number | string | null | undefined, unit = ""): string {
  if (n === null || n === undefined || n === "") return "–";
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (!Number.isFinite(v)) return "–";
  return `${Number.isInteger(v) ? v : v.toFixed(1)}${unit ? " " + unit : ""}`;
}
export function efficacy(lumen: number | null, power: number | string | null): number | null {
  const p = typeof power === "string" ? parseFloat(power) : power;
  if (!lumen || !p || p <= 0) return null;
  return Math.round(lumen / p);
}
