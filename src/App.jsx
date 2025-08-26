// src/App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import { ROLES, ROUTES } from "../shared/consts";

import SetupInicial from "./pages/SetupInicial";
import Login from "./auth/Loginp";
import Dashboard from "./pages/Dashboard";
import Ventas from "./pages/Ventas";
import Apartados from "./pages/Apartados";
import Inventario from "./pages/Inventario";
import Reportes from "./pages/Reportes";
import Gastos from "./pages/Gastos";
import Usuarios from "./pages/Usuarios";
import Configuracion from "./pages/Configuracion";

function RoleHome() {
  const [to, setTo] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await window.api.auth.getSession();
      const session = res?.session ?? res ?? null;
      const role = session?.role;
      const target = role === ROLES.WORKER ? ROUTES.VENTAS : ROUTES.DASHBOARD;
      if (alive) setTo(target);
    })();
    return () => { alive = false; };
  }, []);
  if (!to) return null;
  return <Navigate to={to} replace />;
}

export default function App() {
  const [needsSetup, setNeedsSetup] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await window.api.auth.needsSetup();
      if (mounted) setNeedsSetup(Boolean(res?.needs ?? res));
    })();
    return () => { mounted = false; };
  }, []);

  if (needsSetup === null) return null;
  if (needsSetup) return <SetupInicial onDone={() => setNeedsSetup(false)} />;

  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.WORKER]} />}>
        <Route element={<MainLayout />}>
          <Route index element={<RoleHome />} />

          <Route path={ROUTES.VENTAS} element={<Ventas />} />
          <Route path={ROUTES.APARTADOS} element={<Apartados />} />

          <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
            <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
            <Route path={ROUTES.INVENTARIO} element={<Inventario />} />
            <Route path={ROUTES.REPORTES} element={<Reportes />} />
            <Route path={ROUTES.GASTOS} element={<Gastos />} />
            <Route path={ROUTES.USUARIOS} element={<Usuarios />} />
            <Route path={ROUTES.CONFIG} element={<Configuracion />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
