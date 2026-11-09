export type Product = {
  id: number;
  manufacturer_id: number;
  manufacturer_name: string;
  manufacturer_website: string | null;
  name: string;
  article_no: string | null;
  type: string;
  power_w: string | null;
  lumen: number | null;
  cct_k: number | null;
  cri: number | null;
  ip: number | null;
  mounting: string | null;
  dimmable: boolean;
  beam_angle: string | null;
  description: string | null;
  image_url: string | null;
  source_url: string | null;
  price_text: string;
  lead_time: string | null;
  sample_available: boolean;
  checked_at: string;
};

export const PRODUCT_SELECT = `
  p.id, p.manufacturer_id, c.name AS manufacturer_name, c.website AS manufacturer_website,
  p.name, p.article_no, p.type, p.power_w, p.lumen, p.cct_k, p.cri, p.ip, p.mounting,
  p.dimmable, p.beam_angle, p.description, p.image_url, p.source_url, p.price_text,
  p.lead_time, p.sample_available, p.checked_at`;
