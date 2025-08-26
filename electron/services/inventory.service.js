// electron/services/inventory.service.js
import { run, get, all } from "./db.js";

const now = () => Math.floor(Date.now() / 1000);

async function ensureSchema() {
  await run(`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('CREATE','UPDATE','IN','OUT','DELETE','ADJUST')),
      quantity INTEGER NOT NULL DEFAULT 0,
      note TEXT,
      user_id INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);
  try { await run(`ALTER TABLE products ADD COLUMN created_at INTEGER`); } catch {}
  try { await run(`ALTER TABLE products ADD COLUMN updated_at INTEGER`); } catch {}
  await run(`CREATE INDEX IF NOT EXISTS idx_movements_prod_time ON inventory_movements(product_id, created_at DESC)`);
}

const schemaReady = ensureSchema();

function err(code, msg) {
  const e = new Error(msg || code);
  e.code = code;
  return e;
}

export async function listProducts({ q = "", limit = 100, offset = 0 } = {}) {
  await schemaReady;
  let sql = "SELECT id, code, name, price, stock FROM products";
  const params = [];
  if (q) {
    sql += " WHERE code LIKE ? OR name LIKE ?";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY name COLLATE NOCASE ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);
  return all(sql, params);
}

async function getProduct(id) {
  return get("SELECT id, code, name, price, stock FROM products WHERE id = ?", [id]);
}

export async function createProduct({ code, name, price = 0, stock = 0 }, ctx = {}) {
  await schemaReady;
  if (!code || !name) throw err("VALIDATION", "CODE_NAME_REQUIRED");
  if (price < 0 || stock < 0) throw err("VALIDATION", "NEGATIVE_VALUES");

  const t = now();
  await run(
    `INSERT INTO products (code, name, price, stock, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code.trim(), name.trim(), Number(price) || 0, Number(stock) || 0, t, t]
  );

  const row = await get("SELECT id FROM products WHERE code = ?", [code.trim()]);

  await run(
    `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
     VALUES (?, 'CREATE', 0, 'Alta de producto', ?, ?)`,
    [row.id, ctx.userId || null, t]
  );

  if (Number(stock) > 0) {
    await run(
      `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
       VALUES (?, 'IN', ?, 'Stock inicial', ?, ?)`,
      [row.id, Number(stock), ctx.userId || null, t]
    );
  }

  return getProduct(row.id);
}

export async function updateProduct(id, patch = {}, ctx = {}) {
  await schemaReady;
  const cur = await get("SELECT * FROM products WHERE id = ?", [id]);
  if (!cur) throw err("NOT_FOUND", "Producto no existe");

  const next = {
    code: patch.code?.trim() ?? cur.code,
    name: patch.name?.trim() ?? cur.name,
    price: patch.price !== undefined ? Number(patch.price) : cur.price,
    stock: patch.stock !== undefined ? Number(patch.stock) : cur.stock,
  };
  if (!next.code || !next.name) throw err("VALIDATION", "CODE_NAME_REQUIRED");
  if (next.price < 0 || next.stock < 0) throw err("VALIDATION", "NEGATIVE_VALUES");

  const t = now();
  await run(
    `UPDATE products SET code=?, name=?, price=?, stock=?, updated_at=? WHERE id=?`,
    [next.code, next.name, next.price, next.stock, t, id]
  );

  const delta = Number(next.stock) - Number(cur.stock);
  if (delta !== 0) {
    await run(
      `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
       VALUES (?, ?, ?, 'Ajuste por edición', ?, ?)`,
      [id, delta > 0 ? "IN" : "OUT", Math.abs(delta), ctx.userId || null, t]
    );
  }

  await run(
    `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
     VALUES (?, 'UPDATE', 0, 'Edición de producto', ?, ?)`,
    [id, ctx.userId || null, t]
  );

  return getProduct(id);
}

export async function deleteProduct(id, ctx = {}) {
  await schemaReady;
  const cur = await get("SELECT id FROM products WHERE id = ?", [id]);
  if (!cur) return { deleted: 0 };

  const t = now();
  await run(
    `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
     VALUES (?, 'DELETE', 0, 'Baja de producto', ?, ?)`,
    [id, ctx.userId || null, t]
  );

  const res = await run("DELETE FROM products WHERE id = ?", [id]);
  return { deleted: res.changes };
}

export async function addStockMovement({ productId, kind, quantity, note = "" }, ctx = {}) {
  await schemaReady;
  const p = await get("SELECT id, stock FROM products WHERE id = ?", [productId]);
  if (!p) throw err("NOT_FOUND", "Producto no existe");

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) throw err("VALIDATION", "QTY_POSITIVE");

  const K = String(kind || "").toUpperCase();
  let delta = 0;
  if (K === "IN") delta = qty;
  else if (K === "OUT") delta = -qty;
  else if (K === "ADJUST") delta = qty;
  else throw err("VALIDATION", "KIND_INVALID");

  const newStock = Number(p.stock) + delta;
  if (newStock < 0) throw err("STOCK_NEGATIVE", "Stock insuficiente");

  const t = now();
  await run("UPDATE products SET stock=?, updated_at=? WHERE id=?", [newStock, t, productId]);

  await run(
    `INSERT INTO inventory_movements (product_id, kind, quantity, note, user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [productId, K, Math.abs(delta), note || (K === "IN" ? "Entrada" : K === "OUT" ? "Salida" : "Ajuste"), ctx.userId || null, t]
  );

  return { productId, stock: newStock };
}

export async function listMovements({ productId = null, limit = 100, offset = 0, from = null, to = null } = {}) {
  await schemaReady;
  const where = [];
  const params = [];
  if (productId) { where.push("m.product_id = ?"); params.push(productId); }
  if (from) { where.push("m.created_at >= ?"); params.push(from); }
  if (to) { where.push("m.created_at <= ?"); params.push(to); }

  const sql = `
    SELECT m.id, m.product_id, p.code, p.name,
           m.kind, m.quantity, m.note, m.user_id, m.created_at
    FROM inventory_movements m
    JOIN products p ON p.id = m.product_id
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY m.id DESC
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  return all(sql, params);
}

export default {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addStockMovement,
  listMovements,
};
