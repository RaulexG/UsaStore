// src/services/api.js
const ensure = (obj, name) => {
  if (!obj) throw new Error(`window.api no disponible: falta ${name}`);
  return obj;
};
const _api = ensure(window.api, "preload");

// Extrae dato de forma uniforme (res.session o res.data.session)
const pick = (res, key) =>
  res?.[key] ?? res?.data?.[key] ?? null;

export const authApi = {
  async needsSetup() {
    const res = await _api.auth.needsSetup();
    return { ok: res?.ok !== false, needsSetup: pick(res, "needsSetup") === true };
  },
  async createInitialAdmin(data) {
    return await _api.auth.createInitialAdmin(data);
  },
  async login(data) {
    const res = await _api.auth.login(data);
    return {
      ok: res?.ok === true,
      session: pick(res, "session"),
      error: res?.error || null,
    };
  },
  async logout() {
    return await _api.auth.logout();
  },
  async getSession() {
    const res = await _api.auth.getSession();
    return { ok: true, session: pick(res, "session") };
  },
};

export const usersApi = {
  list: () => _api.users.list(),
  create: (data) => _api.users.create(data),
  update: (data) => _api.users.update(data),
  remove: (id) => _api.users.remove(id),
};

export const inventoryApi = {
  list: () => _api.inventory.list?.(),
};
