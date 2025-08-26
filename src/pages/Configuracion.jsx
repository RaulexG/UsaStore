import { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { ROUTES } from "../../shared/consts";

export default function Config() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    authApi.getSession().then((r) => mounted && setSession(r?.session || null));
    return () => (mounted = false);
  }, []);

  const onLogout = async () => {
    await authApi.logout();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Configuración</h1>

      <div className="bg-[#152033] border border-[#22324f] rounded-lg p-4">
        <div className="text-sm text-white/70 mb-2">Sesión actual</div>
        <div className="text-white font-medium mb-4">
          {session ? `${session.name} — ${session.role}` : "—"}
        </div>
        <button
          onClick={onLogout}
          className="bg-red-600 hover:bg-red-700 text-white text-sm rounded px-3 py-2"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

