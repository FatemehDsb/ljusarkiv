export const PRODUCT_TYPES = ["Downlight", "Pendel", "Spot", "Vägg", "Linjär", "Skenspot", "Utomhus", "Golv", "Bord"];
export const MOUNTINGS = ["Infälld", "Utanpåliggande", "Pendel", "Skena", "Vägg", "Golv", "Mark"];
export const IP_OPTIONS = [20, 44, 54, 65, 67];
export const CCT_BUCKETS = [
  { value: "varm", label: "Varm (upp till 3000 K)", min: 0, max: 3000 },
  { value: "neutral", label: "Neutral (3001–4000 K)", min: 3001, max: 4000 },
  { value: "kall", label: "Kall (över 4000 K)", min: 4001, max: 100000 },
];
export const SAMPLE_STATUSES = ["Ny", "Godkänd", "Skickad", "Återlämnad", "Avvisad"] as const;
export const PAGE_SIZE = 24;
