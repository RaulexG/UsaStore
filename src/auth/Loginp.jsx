// src/pages/Loginp.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../services/api";
import { ROUTES, ROLES } from "../../shared/consts";
import logo from "../assets/Login.png";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password) {
      setError("Ingresa tu usuario y contraseña.");
      return;
    }

    setLoading(true);
    const res = await authApi.login({
      username: form.username.trim(), 
      password: form.password,
    });
    setLoading(false);

    if (!res?.ok) {
      setError(res?.error || "Usuario o contraseña inválidos.");
      return;
    }

    const role = res.session.role;
    navigate(role === ROLES.ADMIN ? ROUTES.DASHBOARD : ROUTES.VENTAS, {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1324]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-[#1b2537] rounded-2xl shadow-xl p-8"
        autoComplete="off"
      >
        <div className="flex justify-center mb-6">
          <img
            src={logo}
            alt="logo"
            className="w-30 h-30 rounded-full ring-2 ring-white/10"
            draggable="false"
          />

        </div>
        <span className="block text-center text-2xl font-semibold text-white mb-4">
            USA STORE
        </span>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Usuario</label>
            <input
              className="w-full bg-[#0f172a] border border-white/10 focus:border-blue-500/60 outline-none rounded-md px-3 py-2 text-white placeholder-gray-400"
              placeholder="Ingresa tu usuario"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full bg-[#0f172a] border border-white/10 focus:border-blue-500/60 outline-none rounded-md px-3 py-2 text-white placeholder-gray-400"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm select-none">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium transition-colors"
          >
            {loading ? "Ingresando…" : "Ingresar"}
          </button>
        </div>
      </form>
    </div>
  );
}
