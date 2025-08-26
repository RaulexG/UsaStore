// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { authApi } from "../services/api";
import { ROUTES } from "../../shared/consts";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authApi.getSession();
        if (!alive) return;
        // ⬇️ CLAVE: guardar SOLO la sesión
        setSession(res?.session ?? null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Puedes poner un spinner aquí si quieres
  if (loading) return null;

  if (!session) return <Navigate to={ROUTES.LOGIN} replace />;

  const role = session.role;
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Pasamos la sesión a los hijos (MainLayout la consume con useOutletContext)
  return <Outlet context={{ session }} />;
}
