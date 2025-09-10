import { ipcMain } from "electron";
import {
  needsInitialSetup,
  createInitialAdmin,
  login as loginService,
} from "../services/auth.service.js";

let CURRENT_SESSION = null;

function errRes(err) {
  return {
    ok: false,
    code: err?.code || "UNEXPECTED",
    error: err?.message || String(err),
  };
}

ipcMain.removeHandler("auth:needsSetup");
ipcMain.handle("auth:needsSetup", async () => {
  try {
    const needs = await needsInitialSetup();
    return { ok: true, needs };
  } catch (err) {
    return errRes(err);
  }
});

ipcMain.removeHandler("auth:createInitialAdmin");
ipcMain.handle("auth:createInitialAdmin", async (_evt, payload) => {
  try {
    await createInitialAdmin(payload);
    return { ok: true };
  } catch (err) {
    return errRes(err);
  }
});

ipcMain.removeHandler("auth:login");
ipcMain.handle("auth:login", async (_evt, payload) => {
  try {
    const res = await loginService(payload);
    CURRENT_SESSION = res.session || null;
    return { ok: true, session: CURRENT_SESSION };
  } catch (err) {
    return errRes(err);
  }
});

ipcMain.removeHandler("auth:getSession");
ipcMain.handle("auth:getSession", async () => {
  return { ok: true, session: CURRENT_SESSION || null };
});

ipcMain.removeHandler("auth:logout");
ipcMain.handle("auth:logout", async () => {
  CURRENT_SESSION = null;
  return { ok: true };
});
