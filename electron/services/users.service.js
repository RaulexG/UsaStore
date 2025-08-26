// electron/services/users.service.js
import bcrypt from "bcryptjs";
import { run, get, all } from "./db.js";

const BCRYPT_ROUNDS = 10;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

const ROLES = ["ADMIN", "WORKER"];

const normalize = (s = "") => String(s).trim();
const normUser = (u = "") => String(u).trim().toLowerCase();

function validName(name) { const n = normalize(name); return n.length >= 2 && n.length <= 80; }
function validUsername(username) { return USERNAME_RE.test(username || ""); }
function validRole(role) { return ROLES.includes(role || ""); }
function validPassword(pw) { return typeof pw === "string" && pw.length >= 8; }

async function usernameExists(usernameLower, excludeId = null) {
  if (excludeId) {
    const row = await get(
      "SELECT id FROM users WHERE username = ? COLLATE NOCASE AND id <> ?",
      [usernameLower, excludeId]
    );
    return !!row;
  }
  const row = await get("SELECT id FROM users WHERE username = ? COLLATE NOCASE", [usernameLower]);
  return !!row;
}

async function countAdmins(excludeId = null) {
  if (excludeId) {
    const row = await get(
      "SELECT COUNT(*) AS c FROM users WHERE role = 'ADMIN' AND id <> ?",
      [excludeId]
    );
    return row?.c ?? 0;
  }
  const row = await get("SELECT COUNT(*) AS c FROM users WHERE role = 'ADMIN'", []);
  return row?.c ?? 0;
}

export async function listUsers() {
  return await all(
    "SELECT id, name, username, role, created_at, updated_at FROM users ORDER BY name COLLATE NOCASE ASC",
    []
  );
}

export async function createUser({ name, username, role, password }) {
  const n = normalize(name);
  const u = normUser(username);
  if (!validName(n)) throw mkErr("VALIDATION_ERROR", "NAME_INVALID");
  if (!validUsername(u)) throw mkErr("VALIDATION_ERROR", "USERNAME_INVALID");
  if (!validRole(role)) throw mkErr("VALIDATION_ERROR", "ROLE_INVALID");
  if (!validPassword(password)) throw mkErr("VALIDATION_ERROR", "PASSWORD_WEAK");
  if (await usernameExists(u)) throw mkErr("USERNAME_TAKEN", "USERNAME_TAKEN");

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = ts();
  await run(
    `INSERT INTO users (name, username, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [n, u, role, hash, now, now]
  );
  return { ok: true };
}

export async function updateUser({ id, name, role, password }) {
  if (!id) throw mkErr("VALIDATION_ERROR", "ID_REQUIRED");

  const target = await get("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!target) throw mkErr("NOT_FOUND", "USER_NOT_FOUND");

  const sets = [];
  const params = [];

  if (name !== undefined) {
    const n = normalize(name);
    if (!validName(n)) throw mkErr("VALIDATION_ERROR", "NAME_INVALID");
    sets.push("name = ?"); params.push(n);
  }

  if (role !== undefined) {
    if (!validRole(role)) throw mkErr("VALIDATION_ERROR", "ROLE_INVALID");
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const adminsLeft = await countAdmins(id);
      if (adminsLeft === 0) throw mkErr("LAST_ADMIN", "CANNOT_DOWNGRADE_LAST_ADMIN");
    }
    sets.push("role = ?"); params.push(role);
  }

  if (password !== undefined && password !== "") {
    if (!validPassword(password)) throw mkErr("VALIDATION_ERROR", "PASSWORD_WEAK");
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    sets.push("password_hash = ?"); params.push(hash);
  }

  if (sets.length === 0) return { ok: true, changed: 0 };

  sets.push("updated_at = ?");
  params.push(ts(), id);

  const res = await run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, params);
  return { ok: true, changed: res.changes };
}

export async function removeUser(id) {
  if (!id) throw mkErr("VALIDATION_ERROR", "ID_REQUIRED");
  const target = await get("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!target) return { ok: true, changed: 0 };
  if (target.role === "ADMIN") {
    const adminsLeft = await countAdmins(id);
    if (adminsLeft === 0) throw mkErr("LAST_ADMIN", "CANNOT_DELETE_LAST_ADMIN");
  }
  const res = await run("DELETE FROM users WHERE id = ?", [id]);
  return { ok: true, changed: res.changes };
}

function mkErr(code, message) { const e = new Error(message || code); e.code = code; return e; }
function ts() { return Math.floor(Date.now() / 1000); }
