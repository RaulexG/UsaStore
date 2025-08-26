-- data/migrations/0001_init.sql

BEGIN IMMEDIATE;

PRAGMA foreign_keys = ON;

------------------------------------------------------------
-- Tabla: users (cuentas del sistema)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL CHECK(length(name) BETWEEN 2 AND 80),
  username      TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK(role IN ('ADMIN','WORKER')),
  password_hash TEXT    NOT NULL,
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Unicidad de username SIN distinguir mayúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_nocase
  ON users(username COLLATE NOCASE);

-- Búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at;
CREATE TRIGGER trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = strftime('%s','now') WHERE id = NEW.id;
END;

------------------------------------------------------------
-- Tabla: products (inventario)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL,                           -- código de barra/sku
  name          TEXT    NOT NULL,
  price         REAL    NOT NULL CHECK(price >= 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  active        INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- Código único (insensible a mayúsculas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code_nocase
  ON products(code COLLATE NOCASE);

-- Búsqueda por nombre
CREATE INDEX IF NOT EXISTS idx_products_name_nocase
  ON products(name COLLATE NOCASE);

DROP TRIGGER IF EXISTS trg_products_updated_at;
CREATE TRIGGER trg_products_updated_at
AFTER UPDATE ON products
FOR EACH ROW
BEGIN
  UPDATE products SET updated_at = strftime('%s','now') WHERE id = NEW.id;
END;

------------------------------------------------------------
-- Tabla: sales (ventas de contado)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  date       INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  user_id    INTEGER NOT NULL,
  total      REAL    NOT NULL CHECK(total >= 0),
  note       TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);

------------------------------------------------------------
-- Tabla: sale_items (líneas de venta)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id    INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK(qty > 0),
  price      REAL    NOT NULL CHECK(price >= 0), -- precio unitario al momento
  FOREIGN KEY(sale_id)    REFERENCES sales(id)    ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

------------------------------------------------------------
-- Tabla: layaways (apartados)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS layaways (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name   TEXT    NOT NULL,
  phone           TEXT,
  status          TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','CANCELLED','PAID')),
  initial_deposit REAL    NOT NULL DEFAULT 0 CHECK(initial_deposit >= 0),
  created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  closed_at       INTEGER,
  cancelled_at    INTEGER,
  created_by      INTEGER NOT NULL, -- usuario que lo creó
  FOREIGN KEY(created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_layaways_status ON layaways(status);
CREATE INDEX IF NOT EXISTS idx_layaways_created_at ON layaways(created_at);

------------------------------------------------------------
-- Tabla: layaway_items (productos en el apartado)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS layaway_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  layaway_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty        INTEGER NOT NULL CHECK(qty > 0),
  price      REAL    NOT NULL CHECK(price >= 0), -- precio unitario al momento
  FOREIGN KEY(layaway_id) REFERENCES layaways(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_layaway_items_layaway ON layaway_items(layaway_id);
CREATE INDEX IF NOT EXISTS idx_layaway_items_product ON layaway_items(product_id);

------------------------------------------------------------
-- Tabla: layaway_payments (abonos)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS layaway_payments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  layaway_id INTEGER NOT NULL,
  amount     REAL    NOT NULL CHECK(amount > 0),
  date       INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  user_id    INTEGER NOT NULL,
  note       TEXT,
  FOREIGN KEY(layaway_id) REFERENCES layaways(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY(user_id)    REFERENCES users(id)    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_layaway_payments_layaway ON layaway_payments(layaway_id);
CREATE INDEX IF NOT EXISTS idx_layaway_payments_date    ON layaway_payments(date);

------------------------------------------------------------
-- Tabla: expenses (gastos)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  concept  TEXT    NOT NULL,
  amount   REAL    NOT NULL CHECK(amount >= 0),
  date     INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  user_id  INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

------------------------------------------------------------
-- Tabla: settings (clave/valor para configuración)
------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Algunas llaves típicas (se editarán en Configuración)
-- INSERT OR IGNORE INTO settings(key, value) VALUES
--   ('store.name', ''),
--   ('store.address', ''),
--   ('store.phone', ''),
--   ('ticket.footer', ''),
--   ('printer.default', ''),
--   ('stock.low_threshold', '5');

------------------------------------------------------------
-- (Opcional) Tabla de auditoría mínima
------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS audit_log (
--   id         INTEGER PRIMARY KEY AUTOINCREMENT,
--   event      TEXT    NOT NULL,   -- user.create / user.update / user.delete / login.fail ...
--   actor_id   INTEGER,            -- puede ser NULL si no hay sesión
--   payload    TEXT,               -- JSON resumido
--   created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
-- );

-- PRAGMA de versión de esquema para control simple (opcional)
PRAGMA user_version = 1;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  kind       TEXT    NOT NULL,      -- CREATE | IN | OUT | ADJUST | UPDATE | DELETE
  quantity   INTEGER NOT NULL DEFAULT 0,
  note       TEXT,
  user_id    INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inv_mov_product   ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created   ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inv_mov_kind      ON inventory_movements(kind);

PRAGMA user_version = 1;
COMMIT;

