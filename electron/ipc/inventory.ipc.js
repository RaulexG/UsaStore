// electron/ipc/inventory.ipc.js  (ESM)
import { ipcMain } from "electron";
import * as inv from "../services/inventory.service.js";

// Helpers uniformes
const ok = (data) => ({ ok: true, data });
const err = (e) => ({ ok: false, code: e?.code || "IPC_ERROR", message: e?.message || "Error" });

// TODO (próximo paso): inyectar userId real desde auth.ipc.js
const ctxUser = () => ({ userId: null });

// Evita duplicados en recargas
const channels = [
  "inventory:list",
  "inventory:create",
  "inventory:update",
  "inventory:delete",
  "inventory:stockMove",
  "inventory:movements",
];
channels.forEach((ch) => ipcMain.removeHandler(ch));

ipcMain.handle("inventory:list", async (_e, params = {}) => {
  try {
    const data = await inv.listProducts(params);
    return ok(data);
  } catch (e) {
    return err(e);
  }
});

ipcMain.handle("inventory:create", async (_e, payload) => {
  try {
    const data = await inv.createProduct(payload, ctxUser());
    return ok(data);
  } catch (e) {
    return err(e);
  }
});

ipcMain.handle("inventory:update", async (_e, id, patch) => {
  try {
    const data = await inv.updateProduct(id, patch, ctxUser());
    return ok(data);
  } catch (e) {
    return err(e);
  }
});

ipcMain.handle("inventory:delete", async (_e, id) => {
  try {
    const data = await inv.deleteProduct(id, ctxUser());
    return ok(data);
  } catch (e) {
    return err(e);
  }
});

ipcMain.handle("inventory:stockMove", async (_e, payload) => {
  try {
    const data = await inv.addStockMovement(payload, ctxUser());
    return ok(data);
  } catch (e) {
    return err(e);
  }
});

// Listado de movimientos para Reportes/Dashboard
ipcMain.handle("inventory:movements", async (_e, params = {}) => {
  try {
    const data = await inv.listMovements(params);
    return ok(data);
  } catch (e) {
    return err(e);
  }
});


