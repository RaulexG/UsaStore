// electron/services/db.js  (ESM)
// Dependencias requeridas: "sqlite3" (callback-based)
// npm i sqlite3
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas de la base y migración
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "usa_store.sqlite");
const MIGRATIONS_DIR = path.join(process.cwd(), "data", "migrations");
const INIT_SQL = path.join(MIGRATIONS_DIR, "0001_init.sql");

// Singleton DB
let _db = null;
let _initPromise = null;

// Promisify helpers para sqlite3
function runAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}
function getAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}
function allAsync(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function execAsync(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Crea carpeta data/ si no existe, abre conexión sqlite, activa FK y aplica migraciones.
 */
export async function initDb() {
  if (_initPromise) return _initPromise; // evita doble init concurrente
  _initPromise = (async () => {
    // Asegurar carpeta /data
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Abrir DB
    sqlite3.verbose();
    _db = new sqlite3.Database(DB_PATH);

    // Foreign keys ON
    await execAsync(_db, "PRAGMA foreign_keys = ON;");

    // Aplicar migración inicial
    if (!fs.existsSync(INIT_SQL)) {
      throw new Error(
        `No se encontró la migración inicial en: ${INIT_SQL}. Asegúrate de tener data/migrations/0001_init.sql`
      );
    }
    const sql = fs.readFileSync(INIT_SQL, "utf8");
    if (!sql || !sql.trim()) throw new Error("El archivo 0001_init.sql está vacío.");

    // Ejecuta todo el script (SQLite soporta múltiples sentencias en exec)
    await execAsync(_db, sql);

    // Validación simple: leer versión de esquema (si se definió)
    try {
      const row = await getAsync(_db, "PRAGMA user_version;");
      // console.debug("DB user_version:", row);
    } catch {
      // ignorar si no existe
    }

    return true;
  })();

  return _initPromise;
}

/**
 * Devuelve la ruta absoluta al archivo de base de datos (útil para backups).
 */
export function getDbPath() {
  return DB_PATH;
}

/**
 * Helper genérico para ejecutar INSERT/UPDATE/DELETE.
 * @returns {Promise<{changes:number, lastID:number}>}
 */
export async function run(sql, params = []) {
  await initDb();
  try {
    return await runAsync(_db, sql, params);
  } catch (err) {
    throw decorateSqlError(err, sql);
  }
}

/**
 * Helper para obtener una fila.
 */
export async function get(sql, params = []) {
  await initDb();
  try {
    return await getAsync(_db, sql, params);
  } catch (err) {
    throw decorateSqlError(err, sql);
  }
}

/**
 * Helper para obtener varias filas.
 */
export async function all(sql, params = []) {
  await initDb();
  try {
    return await allAsync(_db, sql, params);
  } catch (err) {
    throw decorateSqlError(err, sql);
  }
}

/**
 * Cierra la base (normalmente no se usa en Electron, pero útil en tests).
 */
export async function close() {
  if (!_db) return;
  await new Promise((resolve, reject) => {
    _db.close((err) => (err ? reject(err) : resolve()));
  });
  _db = null;
  _initPromise = null;
}

/**
 * Añade contexto básico al error SQL sin exponer datos sensibles.
 */
function decorateSqlError(err, sql) {
  const msg = err?.message || String(err);
  // Ocultamos parámetros; sólo mostramos un resumen de la consulta
  const safeSql = String(sql).split("\n").join(" ").slice(0, 160);
  const wrapped = new Error(`SQLite error: ${msg} | SQL: ${safeSql}…`);
  wrapped.code = err?.code;
  return wrapped;
}
