// electron/services/backup.service.js
import fs from "node:fs";
import path from "node:path";
import { close, initDb, getDbPath } from "./db.js";

function ensureDir(p) {
  if (!p) return;
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export async function backupDatabase(destFile) {
  if (!destFile) throw new Error("DEST_REQUIRED");
  const dbPath = getDbPath();
  ensureDir(path.dirname(destFile));
  await close();
  await fs.promises.copyFile(dbPath, destFile);
  await initDb();
  return { ok: true, path: destFile };
}

export async function restoreDatabase(srcFile) {
  if (!srcFile) throw new Error("SRC_REQUIRED");
  const dbPath = getDbPath();
  if (!fs.existsSync(srcFile)) throw new Error("SRC_NOT_FOUND");
  ensureDir(path.dirname(dbPath));
  await close();
  await fs.promises.copyFile(srcFile, dbPath);
  await initDb();
  return { ok: true };
}

