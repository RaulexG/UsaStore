// electron/ipc/users.ipc.js  (ESM)
import { ipcMain } from "electron";
import {
  listUsers,
  createUser,
  updateUser,
  removeUser,
} from "../services/auth.service.js";

// Wrapper uniforme (mismo estilo que auth.ipc)
function handle(channel, fn) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, async (event, payload) => {
    try {
      const data = await fn(payload, event);
      return { ok: true, data };
    } catch (err) {
      return {
        ok: false,
        code: err?.code || "UNEXPECTED",
        error: err?.message || String(err),
      };
    }
  });
}

// Handlers básicos (validación de rol la añadimos luego si quieres)
handle("users:list", async () => {
  return await listUsers();
});

handle("users:create", async (payload) => {
  return await createUser(payload);
});

handle("users:update", async (payload) => {
  return await updateUser(payload);
});

handle("users:remove", async (id) => {
  return await removeUser(id);
});
