// electron/services/auth.service.js

import bcrypt from "bcryptjs";
import { run, get, all } from "./db.js";

/** Config de seguridad */
const BCRYPT_ROUNDS = 10;                  // costo de hash (ajustable)
const MAX_FAILED_ATTEMPTS = 5;             // intentos antes de bloqueo
const LOCKOUT_MS = 2 * 60 * 1000;          // 2 minutos de bloqueo temporal
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

/** Estado en memoria para lockout (reinicia al cerrar app) */
const failedLogins = new Map(); // usernameLower -> { count, until }

/** Normaliza username para búsquedas y unicidad */
function normalizeUsername(u = "") {
  return String(u).trim().toLowerCase();
}

/** Valida reglas de entrada para crear/editar usuario (sin password) */
function validateUserData({ name, username, role }) {
  const errors = [];
  if (!name || name.trim().length < 2 || name.trim().length > 80) {
    errors.push("NAME_INVALID");
  }
  if (!username || !USERNAME_RE.test(username)) {
    errors.push("USERNAME_INVALID");
  }
  if (!["ADMIN", "WORKER"].includes(role)) {
    errors.push("ROLE_INVALID");
  }
  return errors;
}

/** Valida contraseña (mínimo 8 chars, ajustable) */
function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 8) return false;
  return true;
}

/** Cuenta usuarios totales */
export async function getUsersCount() {
  const row = await get("SELECT COUNT(*) as c FROM users", []);
  return row?.c ?? 0;
}

/** ¿Se requiere Setup Inicial? (no hay usuarios) */
export async function needsInitialSetup() {
  return (await getUsersCount()) === 0;
}

/** Crea el primer ADMIN (solo si no hay usuarios) */
export async function createInitialAdmin({ name, username, password }) {
  if (!(await needsInitialSetup())) {
    throw makeError("SETUP_NOT_ALLOWED", "Ya existe al menos un usuario.");
  }
  if (!validatePassword(password)) {
    throw makeError("PASSWORD_WEAK", "La contraseña no cumple la política mínima.");
  }
  const role = "ADMIN";
  const baseErrors = validateUserData({ name, username, role });
  if (baseErrors.length) {
    throw makeError("VALIDATION_ERROR", baseErrors.join(","));
  }

  const usernameLower = normalizeUsername(username);
  const exists = await get(
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
    [usernameLower]
  );
  if (exists) {
    throw makeError("USERNAME_TAKEN", "El nombre de usuario ya existe.");
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = Math.floor(Date.now() / 1000);

  await run(
    `INSERT INTO users (name, username, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name.trim(), usernameLower, role, password_hash, now, now]
  );

  return { ok: true };
}

/** Crea un usuario (para la sección Usuarios) */
export async function createUser({ name, username, role, password }) {
  const errors = validateUserData({ name, username, role });
  if (!validatePassword(password)) {
    errors.push("PASSWORD_WEAK");
  }
  if (errors.length) throw makeError("VALIDATION_ERROR", errors.join(","));

  const usernameLower = normalizeUsername(username);
  const exists = await get(
    "SELECT id FROM users WHERE username = ? COLLATE NOCASE",
    [usernameLower]
  );
  if (exists) throw makeError("USERNAME_TAKEN", "El nombre de usuario ya existe.");

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = Math.floor(Date.now() / 1000);

  await run(
    `INSERT INTO users (name, username, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name.trim(), usernameLower, role, password_hash, now, now]
  );

  return { ok: true };
}

/** Lista básica de usuarios (para tabla) */
export async function listUsers() {
  const rows = await all(
    `SELECT id, name, username, role, created_at, updated_at
     FROM users
     ORDER BY name COLLATE NOCASE ASC`,
    []
  );
  return rows ?? [];
}

/** Obtiene un usuario por id (sin hash) */
export async function getUserById(id) {
  const row = await get(
    `SELECT id, name, username, role, created_at, updated_at
     FROM users WHERE id = ?`,
    [id]
  );
  return row || null;
}

/** Actualiza usuario (nombre/rol). Si viene password, lo cambia con validación */
export async function updateUser({ id, name, role, password }) {
  if (!id) throw makeError("VALIDATION_ERROR", "ID_REQUIRED");
  const fields = [];
  const params = [];
  const errors = [];

  if (name !== undefined) {
    if (!name || name.trim().length < 2 || name.trim().length > 80) {
      errors.push("NAME_INVALID");
    } else {
      fields.push("name = ?");
      params.push(name.trim());
    }
  }
  if (role !== undefined) {
    if (!["ADMIN", "WORKER"].includes(role)) {
      errors.push("ROLE_INVALID");
    } else {
      // Más adelante: proteger “último admin” en IPC/servicio de dominio.
      fields.push("role = ?");
      params.push(role);
    }
  }
  if (password !== undefined && password !== "") {
    if (!validatePassword(password)) {
      errors.push("PASSWORD_WEAK");
    } else {
      const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      fields.push("password_hash = ?");
      params.push(hash);
    }
  }

  if (errors.length) throw makeError("VALIDATION_ERROR", errors.join(","));
  if (fields.length === 0) return { ok: true, changed: 0 };

  const now = Math.floor(Date.now() / 1000);
  fields.push("updated_at = ?");
  params.push(now, id);

  const res = await run(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    params
  );
  return { ok: true, changed: res.changes };
}

/** Elimina usuario por id (reglas de “último admin” se aplicarán a nivel servicio/IPC de usuarios) */
export async function removeUser(id) {
  if (!id) throw makeError("VALIDATION_ERROR", "ID_REQUIRED");
  const res = await run("DELETE FROM users WHERE id = ?", [id]);
  return { ok: true, changed: res.changes };
}

/** Login: verifica lockout, credenciales, y devuelve datos mínimos de sesión */
export async function login({ username, password }) {
  const usernameLower = normalizeUsername(username);

  // Lockout check
  const now = Date.now();
  const fl = failedLogins.get(usernameLower);
  if (fl?.until && now < fl.until) {
    const msLeft = fl.until - now;
    throw makeError("LOCKED", `Intentos excedidos. Intenta en ${Math.ceil(msLeft / 1000)}s.`);
  }

  // Buscar usuario (nocase)
  const user = await get(
    `SELECT id, name, username, role, password_hash
     FROM users WHERE username = ? COLLATE NOCASE`,
    [usernameLower]
  );
  if (!user) {
    registerFailed(usernameLower);
    throw makeError("INVALID_CREDENTIALS", "Usuario o contraseña inválidos.");
  }

  // Verificar password
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    registerFailed(usernameLower);
    throw makeError("INVALID_CREDENTIALS", "Usuario o contraseña inválidos.");
  }

  // Reset contador si fue exitoso
  failedLogins.delete(usernameLower);

  // Sesión mínima (no exponemos hash)
  const session = {
    userId: user.id,
    name: user.name,
    role: user.role,
  };
  return { ok: true, session };
}

/** Registra intento fallido y aplica lockout si corresponde */
function registerFailed(usernameLower) {
  const entry = failedLogins.get(usernameLower) || { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= MAX_FAILED_ATTEMPTS) {
    entry.until = Date.now() + LOCKOUT_MS;
    entry.count = 0; // reinicia contador para el siguiente ciclo
  }
  failedLogins.set(usernameLower, entry);
}

/** Utilidad para construir errores controlados */
function makeError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}
