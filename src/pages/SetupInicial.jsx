import { useEffect, useState } from "react";

export default function SetupInicial({ onDone }) {
  const [f, setF] = useState({ name: "", username: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await window.api.auth.needsSetup();
        if (!alive) return;
        if (!res?.needs) onDone?.();
      } catch {}
    })();
    return () => { alive = false; };
  }, [onDone]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!f.name.trim()) return setErr("Nombre requerido");
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(f.username)) return setErr("Usuario inválido");
    if (!f.password || f.password.length < 8) return setErr("La contraseña debe tener al menos 8 caracteres");
    if (f.password !== f.confirm) return setErr("Las contraseñas no coinciden");

    setLoading(true);
    const res = await window.api.auth.createInitialAdmin({
      name: f.name.trim(),
      username: f.username.trim().toLowerCase(),
      password: f.password,
    });
    setLoading(false);

    if (!res?.ok) {
      setErr(res?.error || "Error al crear administrador");
      return;
    }
    onDone?.();
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0b1324]">
      <form onSubmit={submit} className="bg-[#1b2537] rounded-2xl shadow-xl p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-white">Configuración Inicial</h1>
        <p className="text-sm text-gray-400">Crea la primera cuenta de administrador.</p>

        <div>
          <label className="text-sm text-gray-300">Nombre</label>
          <input
            className="w-full bg-[#0f172a] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-blue-500/60"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-300">Usuario</label>
          <input
            className="w-full bg-[#0f172a] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-blue-500/60"
            value={f.username}
            onChange={(e) => setF({ ...f, username: e.target.value })}
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
          />
        </div>

        <div>
          <label className="text-sm text-gray-300">Contraseña</label>
          <input
            type="password"
            className="w-full bg-[#0f172a] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-blue-500/60"
            value={f.password}
            onChange={(e) => setF({ ...f, password: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-gray-300">Confirmar contraseña</label>
          <input
            type="password"
            className="w-full bg-[#0f172a] border border-white/10 rounded-md px-3 py-2 text-white outline-none focus:border-blue-500/60"
            value={f.confirm}
            onChange={(e) => setF({ ...f, confirm: e.target.value })}
          />
        </div>

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button
          disabled={loading}
          className="w-full h-10 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium"
        >
          {loading ? "Creando..." : "Crear administrador"}
        </button>
      </form>
    </div>
  );
}
