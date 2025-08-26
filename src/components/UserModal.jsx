// src/components/UserModal.jsx
import { useEffect, useState } from "react";
import { usersApi } from "../services/api";
import { ROLES } from "../../shared/consts";

export default function UserModal({ mode = "create", initial = null, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({
    name: "",
    username: "",
    role: ROLES.WORKER,
    password: "",
    confirm: "",
  });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && initial) {
      setForm((f) => ({
        ...f,
        name: initial.name || "",
        username: initial.username || "",
        role: initial.role || ROLES.WORKER,
        password: "",
        confirm: "",
      }));
    }
  }, [isEdit, initial]);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return "Nombre requerido";
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(form.username)) return "Usuario inválido";
    if (!isEdit) {
      if (!form.password || form.password.length < 8) return "Contraseña mínima de 8 caracteres";
      if (form.password !== form.confirm) return "Las contraseñas no coinciden";
    } else if (form.password) {
      if (form.password.length < 8) return "Contraseña mínima de 8 caracteres";
      if (form.password !== form.confirm) return "Las contraseñas no coinciden";
    }
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const v = validate();
    if (v) return setErr(v);
    setSaving(true);
    try {
      if (isEdit) {
        const payload = { id: initial.id, name: form.name.trim(), role: form.role };
        if (form.password) payload.password = form.password;
        const res = await usersApi.update(payload);
        if (res?.ok === false) throw new Error(res.error || "Error al actualizar");
      } else {
        const res = await usersApi.create({
          name: form.name.trim(),
          username: form.username.trim().toLowerCase(),
          role: form.role,
          password: form.password,
        });
        if (res?.ok === false) throw new Error(res.error || "Error al crear");
      }
      onSaved?.();
    } catch (e2) {
      setErr(e2?.message || "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center">
      <form onSubmit={submit} className="w-[520px] rounded-xl bg-[#111827] ring-1 ring-white/10 p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">{isEdit ? "Editar usuario" : "Añadir Usuario"}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-white/80">Nombre Completo</label>
            <input className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                   value={form.name} onChange={onChange("name")} autoFocus />
          </div>

          <div>
            <label className="block text-sm mb-1 text-white/80">Nombre de Usuario</label>
            <input disabled={isEdit}
                   className={`w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${isEdit ? "opacity-70 cursor-not-allowed" : ""}`}
                   value={form.username} onChange={onChange("username")} placeholder="usuario" />
          </div>

          <div>
            <label className="block text-sm mb-1 text-white/80">Rol</label>
            <select className="w-full h-10 px-3 rounded-md bg-gray-900 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400/40 appearance-none"
                    value={form.role} onChange={onChange("role")}>
              <option className="bg-gray-600 text-white" value={ROLES.WORKER}>trabajador</option>
              <option className="bg-gray-600 text-white" value={ROLES.ADMIN}>admin</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm mb-1 text-white/80">Contraseña {isEdit ? "(opcional)" : ""}</label>
              <input type="password"
                     className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                     value={form.password} onChange={onChange("password")}
                     placeholder={isEdit ? "Contraseña nueva" : "Mínimo 8 caracteres"} />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/80">Confirmar contraseña</label>
              <input type="password"
                     className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                     value={form.confirm} onChange={onChange("confirm")}
                     placeholder={isEdit ? "Confirmar contraseña" : "Confirmar contraseña"} />
            </div>
          </div>

          {err && <div className="text-red-400 text-sm">{err}</div>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
                  className="px-4 h-10 rounded-md bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10">
            Cancelar
          </button>
          <button disabled={saving}
                  className="px-4 h-10 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/60 disabled:opacity-60">
            {saving ? "Guardando..." : (isEdit ? "Guardar" : "Añadir Usuario")}
          </button>
        </div>
      </form>
    </div>
  );
}
