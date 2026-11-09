import { safeHref } from "@/lib/validate";

const ICONS: Record<string, string> = {
  Downlight: "M20 20h40M30 20v6h20v-6M32 26l-8 22h32l-8-22",
  Pendel: "M40 8v22M28 30h24l6 14H22z",
  Spot: "M40 14v10M30 24h20l4 12H26zM34 40l-6 18M46 40l6 18",
  Vägg: "M14 14v52M14 30h16c10 0 16 8 16 18",
  Linjär: "M12 36h56v8H12M20 44v14M60 44v14",
  Skenspot: "M12 16h56M40 16v10M32 26h16l4 10H28z",
  Utomhus: "M40 12c-10 0-14 8-14 16h28c0-8-4-16-14-16zM40 28v34M30 62h20",
  Golv: "M40 10c-9 0-13 8-13 14h26c0-6-4-14-13-14zM40 24v40M28 64h24",
  Bord: "M24 22l14-8 16 20-14 8zM40 42v20M28 62h24",
};

export default function ProductImage({ url, type, alt }: { url: string | null; type: string; alt: string }) {
  const href = safeHref(url);
  if (href) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={href} alt={alt} loading="lazy" referrerPolicy="no-referrer" />;
  }
  return (
    <svg viewBox="0 0 80 72" width="96" height="86" role="img" aria-label={`${type} – bild saknas`}>
      <path d={ICONS[type] ?? ICONS.Downlight} fill="none" stroke="#8a8f9c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
