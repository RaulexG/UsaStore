// electron/ipc/auth.ipc.js  (ESM)
import { ipcMain } from "electron";
import {
  needsInitialSetup,
  createInitialAdmin,
  login as loginService,
} from "../services/auth.service.js";

let CURRENT_SESSION = null;

// Util para respuestas de error uniformes
function errRes(err) {
  return {
    ok: false,
    code: err?.code || "UNEXPECTED",
    error: err?.message || String(err),
  };
}

/** SONDA: needsSetup */
ipcMain.removeHandler("auth:needsSetup");
ipcMain.handle("auth:needsSetup", async () => {
  try {
    const needs = await needsInitialSetup();
    console.log("[IPC] needsSetup ->", needs);
    return { ok: true, needsSetup: needs };
  } catch (err) {
    console.error("[IPC] needsSetup ERROR:", err);
    return errRes(err);
  }
});

/** Crear primer admin */
ipcMain.removeHandler("auth:createInitialAdmin");
ipcMain.handle("auth:createInitialAdmin", async (_evt, payload) => {
  try {
    const r = await createInitialAdmin(payload);
    console.log("[IPC] createInitialAdmin OK");
    return { ok: true };
  } catch (err) {
    console.error("[IPC] createInitialAdmin ERROR:", err);
    return errRes(err);
  }
});

/** Login real */
ipcMain.removeHandler("auth:login");
ipcMain.handle("auth:login", async (_evt, payload) => {
  try {
    const res = await loginService(payload); // { ok:true, session:{...} } desde el service
    CURRENT_SESSION = res.session || null;
    console.log("[IPC] login() OK -> session:", res.session);
    console.log("[IPC] CURRENT_SESSION ahora es:", CURRENT_SESSION);
    return { ok: true, session: CURRENT_SESSION };
  } catch (err) {
    console.error("[IPC] login ERROR:", err);
    return errRes(err);
  }
});

/** Obtener sesión actual */
ipcMain.removeHandler("auth:getSession");
ipcMain.handle("auth:getSession", async () => {
  console.log("[IPC] getSession() devuelve:", CURRENT_SESSION);
  return { ok: true, session: CURRENT_SESSION || null };
});

/** Logout */
ipcMain.removeHandler("auth:logout");
ipcMain.handle("auth:logout", async () => {
  CURRENT_SESSION = null;
  console.log("[IPC] logout -> session null");
  return { ok: true };
});
