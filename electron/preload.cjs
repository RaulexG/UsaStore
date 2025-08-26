const { contextBridge, ipcRenderer } = require("electron");

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

const deepFreeze = (obj) => {
  Object.getOwnPropertyNames(obj).forEach((k) => {
    const v = obj[k];
    if (v && typeof v === "object") deepFreeze(v);
  });
  return Object.freeze(obj);
};

const api = {
  auth: {
    needsSetup: () => invoke("auth:needsSetup"),
    createInitialAdmin: (data) => invoke("auth:createInitialAdmin", data),
    login: (data) => invoke("auth:login", data),
    getSession: () => invoke("auth:getSession"),
    logout: () => invoke("auth:logout"),
  },
  users: {
    list: () => invoke("users:list"),
    create: (data) => invoke("users:create", data),
    update: (data) => invoke("users:update", data),
    remove: (id) => invoke("users:remove", id),
  },
  inventory: {
    list: (params = {}) => invoke("inventory:list", params),
    create: (product) => invoke("inventory:create", product),
    update: (id, patch) => invoke("inventory:update", id, patch),
    remove: (id) => invoke("inventory:delete", id),
    stockMove: (payload) => invoke("inventory:stockMove", payload),
    movements: (params = {}) => invoke("inventory:movements", params),
  },
};

contextBridge.exposeInMainWorld("api", deepFreeze(api));

contextBridge.exposeInMainWorld(
  "electron",
  deepFreeze({
    ipcRenderer: {
      invoke: (...args) => ipcRenderer.invoke(...args),
    },
  })
);
