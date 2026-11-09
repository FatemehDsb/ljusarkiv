-- Ljusarkiv: databasschema (PostgreSQL)

CREATE TABLE IF NOT EXISTS companies (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('designer', 'manufacturer')),
  website     TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('designer', 'manufacturer')),
  company_id    INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id               SERIAL PRIMARY KEY,
  manufacturer_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  article_no       TEXT,
  type             TEXT NOT NULL,            -- Downlight, Pendel, Spot, Vägg, Linjär ...
  power_w          NUMERIC(8,2),
  lumen            INTEGER,
  cct_k            INTEGER,
  cri              INTEGER,
  ip               INTEGER,
  mounting         TEXT,                     -- Infälld, Pendel, Utanpåliggande, Skena, Vägg
  dimmable         BOOLEAN NOT NULL DEFAULT false,
  beam_angle       NUMERIC(6,1),
  description      TEXT,
  image_url        TEXT,
  source_url       TEXT,                     -- länk till tillverkarens egen produktsida
  price_text       TEXT NOT NULL DEFAULT 'Offereras',
  lead_time        TEXT,
  sample_available BOOLEAN NOT NULL DEFAULT false,
  checked_at       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_manufacturer_idx ON products(manufacturer_id);
CREATE INDEX IF NOT EXISTS products_type_idx ON products(type);
CREATE INDEX IF NOT EXISTS products_search_idx ON products
  USING gin (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(article_no,'') || ' ' || coalesce(description,'')));

CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  client      TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_items (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  zone       TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, product_id)
);

CREATE TABLE IF NOT EXISTS quote_requests (
  id          SERIAL PRIMARY KEY,
  designer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'Ny' CHECK (status IN ('Ny', 'Besvarad', 'Avvisad')),
  answer      TEXT,
  offered_price TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sample_requests (
  id               SERIAL PRIMARY KEY,
  designer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  project_id       INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  message          TEXT,
  delivery_address TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Ny'
                   CHECK (status IN ('Ny', 'Godkänd', 'Skickad', 'Återlämnad', 'Avvisad')),
  tracking_note    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tillverkarkonton måste godkännas av plattformens administratör innan produkter syns.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false;
