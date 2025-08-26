import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router-dom";
import { useMemo } from "react";
import { authApi } from "../services/api";
import { ROLES, ROUTES } from "../../shared/consts";

// ===== Icons (camelCase en atributos SVG) =====
const I = {
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#fff" d="M4 13h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1m0 8h6c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1m10 0h6c.55 0 1-.45 1-1v-8c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1v8c0 .55.45 1 1 1M13 4v4c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V4c0-.55-.45-1-1-1h-6c-.55 0-1 .45-1 1"/>
    </svg>
  ),
  ventas: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#fff" d="M20 5c-.6 0-1 .5-1 1.1V16c0 .6.4 1 1 1.1c.6 0 1-.5 1-1.1V6.1c0-.6-.4-1.1-1-1.1m-3.6-3H4.6C3.7 2 3 2.7 3 3.6v13.8c0 .9.7 1.6 1.6 1.6H6v2c0 .6.4 1 1 1h6c.6 0 1-.4 1-1v-2h2.4c.9 0 1.6-.7 1.6-1.6V3.6c0-.9-.7-1.6-1.6-1.6M5 8h3v2H5zm7 3v2H9v-2zm-3-1V8h3v2zm3 4v2H9v-2zm-7-3h3v2H5zm0 5v-2h3v2zm3 5H7v-2h1zm5 0h-3v-2h3zm3-5h-3v-2h3zm0-3h-3v-2h3zm0-3h-3V8h3zm0-4H5V4h11z"/>
    </svg>
  ),
  apartados: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#fff" d="M7 12c2.2 0 4-1.8 4-4S9.2 4 7 4S3 5.8 3 8s1.8 4 4 4m4 8v-5.3c-1.1-.4-2.5-.7-4-.7c-3.9 0-7 1.8-7 4v2zM22 4h-7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m-4 14h-2V6h2z"/>
    </svg>
  ),
  inventario: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#fff" d="M2 2v6.7h1V22h18V8.7h1V2zm13 12H9v-2h6zm5-7H4V4h16z"/>
    </svg>
  ),
  reportes: (
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24">
      <path fill="#fff" d="M8.885 12.308h6.23q.213 0 .357-.144t.144-.357t-.144-.356t-.356-.143H8.885q-.213 0-.357.144q-.143.144-.143.356q0 .213.143.357t.357.143m0 2.769h6.23q.213 0 .357-.144t.144-.357t-.144-.356t-.356-.143H8.885q-.213 0-.357.144q-.143.144-.143.357t.143.356t.357.143m0 2.77h3.23q.213 0 .357-.145t.144-.356t-.144-.356t-.356-.144H8.885q-.213 0-.357.144q-.143.144-.143.357t.143.356t.357.143M6.615 21q-.69 0-1.152-.462T5 19.385V4.615q0-.69.463-1.152T6.616 3h7.213q.331 0 .632.13t.518.349L18.52 7.02q.217.218.348.518t.131.632v11.214q0 .69-.463 1.153T17.385 21zM14 7.2q0 .34.23.57t.57.23H18l-4-4z"/>
    </svg>
  ),
  gastos: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16">
      <path fill="#fff" d="M2 3.75C2 2.784 2.784 2 3.75 2h5.5c.966 0 1.75.784 1.75 1.75V10h3v1.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 11.5zM11 13h.5a1.5 1.5 0 0 0 1.5-1.5V11h-2zM4.5 5.5A.5.5 0 0 0 5 6h3a.5.5 0 0 0 0-1H5a.5.5 0 0 0-.5.5m.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1zm-.5 3a.5.5 0 0 0 .5.5h1.5a.5.5 0 0 0 0-1H5a.5.5 0 0 0-.5.5"/>
    </svg>
  ),
  usuarios: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path fill="#fff" d="M16 17v2H2v-2s0-4 7-4s7 4 7 4m-3.5-9.5A3.5 3.5 0 1 0 9 11a3.5 3.5 0 0 0 3.5-3.5m3.44 5.5A5.32 5.32 0 0 1 18 17v2h4v-2s0-3.63-6.06-4M15 4a3.4 3.4 0 0 0-1.93.59a5 5 0 0 1 0 5.82A3.4 3.4 0 0 0 15 11a3.5 3.5 0 0 0 0-7"/>
    </svg>
  ),
  config: (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.279 2.152C13.909 2 13.439 2 12.5 2s-1.408 0-1.779.152a2 2 0 0 0-1.09 1.083c-.094.223-.13.484-.145.863a1.62 1.62 0 0 1-.796 1.353a1.64 1.64 0 0 1-1.579.008c-.338-.178-.583-.276-.825-.308a2.03 2.03 0 0 0-1.49.396c-.318.242-.553.646-1.022 1.453c-.47.807-.704 1.21-.757 1.605c-.07.526.074 1.058.4 1.479c.148.192.357.353.68.555c.477.297.783.803.783 1.361s-.306 1.064-.782 1.36c-.324.203-.533.364-.682.556a2 2 0 0 0-.399 1.479c.053.394.287.798.757 1.605s.704 1.21 1.022 1.453c.424.323.96.465 1.49.396c.242-.032.487-.13.825-.308a1.64 1.64 0 0 1 1.58.008c.486.28.774.795.795 1.353c.015.38.051.64.145.863c.204.49.596.88 1.09 1.083c.37.152.84.152 1.779.152s1.409 0 1.779-.152a2 2 0 0 0 1.09-1.083c.094-.223.13-.483.145-.863c.02-.558.309-1.074.796-1.353a1.64 1.64 0 0 1 1.579-.008c.338.178.583.276.825.308c.53.07 1.066-.073 1.49-.396c.318-.242.553-.646 1.022-1.453c.47-.807.704-1.21.757-1.605a2 2 0 0 0-.4-1.479c-.148-.192-.357-.353-.68-.555c-.477-.297-.783-.803-.783-1.361s.306-1.064.782-1.36c.324-.203.533-.364.682-.556a2 2 0 0 0 .399-1.479c-.053-.394-.287-.798-.757-1.605s-.704-1.21-1.022-1.453a2.03 2.03 0 0 0-1.49-.396c-.242.032-.487.13-.825.308a1.64 1.64 0 0 1-1.58-.008a1.62 1.62 0 0 1-.795-1.353c-.015-.38-.051-.64-.145-.863a2 2 0 0 0-1.09-1.083M12.5 15c1.67 0 3.023-1.343 3.023-3S14.169 9 12.5 9s-3.023 1.343-3.023 3s1.354 3 3.023 3"
      />
    </svg>
  ),
  logout: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path fill="#fff" d="M10 17v2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5v2H5v10zm9-5l-3-3v2H9v2h7v2z" />
    </svg>
  ),
};

// Ítems visibles por rol
const NAV_ITEMS = [
  { to: ROUTES.DASHBOARD, label: "Dashboard", icon: I.dashboard, roles: [ROLES.ADMIN] },
  { to: ROUTES.VENTAS, label: "Ventas", icon: I.ventas, roles: [ROLES.ADMIN, ROLES.WORKER] },
  { to: ROUTES.APARTADOS, label: "Apartados", icon: I.apartados, roles: [ROLES.ADMIN, ROLES.WORKER] },
  { to: ROUTES.INVENTARIO, label: "Inventario", icon: I.inventario, roles: [ROLES.ADMIN] },
  { to: ROUTES.REPORTES, label: "Reportes", icon: I.reportes, roles: [ROLES.ADMIN] },
  { to: ROUTES.GASTOS, label: "Gastos", icon: I.gastos, roles: [ROLES.ADMIN] },
  { to: ROUTES.USUARIOS, label: "Usuarios", icon: I.usuarios, roles: [ROLES.ADMIN] },
  { to: ROUTES.CONFIG, label: "Configuración", icon: I.config, roles: [ROLES.ADMIN] },
];

function PillLink({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-2 transition ${
          isActive ? "bg-blue-600 text-white" : "text-white/90 hover:bg-white/10"
        }`
      }
    >
      <span className="leading-none">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </NavLink>
  );
}

export default function MainLayout() {
  const navigate = useNavigate();
  // sesión viene del ProtectedRoute
  const { session } = useOutletContext() || {};
  const role = session?.role;

  const visibleItems = useMemo(() => (role ? NAV_ITEMS.filter(i => i.roles.includes(role)) : []), [role]);

  const onLogout = async () => {
    await authApi.logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0b1324] text-white">
      <header className="bg-[#16243b] border-b border-white/10">
        <div className="container mx-auto px-4 flex items-center">
          {/* Marca a la izquierda */}
          <div className="text-3xl font-bold">USA STORE</div>

          {/* Menú a la derecha */}
          <nav className="ml-auto flex items-center gap-3">
            {visibleItems.map(item => (
              <PillLink key={item.to} to={item.to} label={item.label} icon={item.icon} />
            ))}

            {/* WORKER: botón Salir visible en la barra */}
            {role === ROLES.WORKER && (
              <button
                onClick={onLogout}
                className="flex flex-col items-center gap-1  bg-red-600 hover:bg-red-700"
                title="Cerrar sesión"
              >
                {I.logout}
                <span className="text-xs font-medium">Salir</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="p-6">
        <div className="container mx-auto px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
