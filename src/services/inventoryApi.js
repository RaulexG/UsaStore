// src/services/inventoryApi.js
const invoke = (ch, ...args) => window.electron.ipcRenderer.invoke(ch, ...args);

const unwrap = (res) => {
  if (!res?.ok) {
    const err = new Error(res?.message || "Error IPC");
    err.code = res?.code || "IPC_ERROR";
    throw err;
  }
  return res.data;
};

export const inventoryApi = {
  list: async (params = {}) => unwrap(await invoke("inventory:list", params)),
  create: async (product) => unwrap(await invoke("inventory:create", product)),
  update: async (id, patch) => unwrap(await invoke("inventory:update", id, patch)),
  remove: async (id) => unwrap(await invoke("inventory:delete", id)),
  stockMove: async (payload) => unwrap(await invoke("inventory:stockMove", payload)),

  // NUEVO: obtener movimientos (para Reportes/Dashboard)
  movements: async (params = {}) => unwrap(await invoke("inventory:movements", params)),
};
