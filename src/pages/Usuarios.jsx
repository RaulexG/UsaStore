import { useEffect, useMemo, useState } from "react";
import { usersApi, authApi } from "../services/api";
import { ROLES } from "../../shared/consts";
import UserModal from "../components/UserModal";

function RoleBadge({ role }) {
  const isAdmin = role === ROLES.ADMIN;
  const classes = isAdmin
    ? "bg-yellow-500/20 text-yellow-300 ring-yellow-400/30"
    : "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30";
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ring-1 ${classes}`}>
      {isAdmin ? "admin" : "trabajador"}
    </span>
  );
}

export default function Usuarios() {
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);       // siempre array
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [modal, setModal] = useState({ open: false, mode: "create", initial: null });

  useEffect(() => {
    // saludo
    authApi.getSession().then((res) => setSession(res?.session || null)).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      const arr =
        Array.isArray(res) ? res :
        Array.isArray(res?.data) ? res.data :
        Array.isArray(res?.rows) ? res.rows : [];
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((u) => {
      const roleLabel = u.role === ROLES.ADMIN ? "admin" : "trabajador";
      return (
        u.name?.toLowerCase().includes(needle) ||
        u.username?.toLowerCase().includes(needle) ||
        roleLabel.includes(needle)
      );
    });
  }, [items, q]);

  const openCreate = () => setModal({ open: true, mode: "create", initial: null });
  const openEdit = (row) => setModal({ open: true, mode: "edit", initial: row });
  const closeModal = () => setModal({ open: false, mode: "create", initial: null });
  const onSaved = async () => { closeModal(); await load(); };

  
  const onRemove = async (row) => {
    if (!confirm(`¿Eliminar a "${row.name}" (${row.username})?`)) return;
    try {
      setBusyId(row.id);
      await usersApi.remove(row.id);
      setItems((prev) => prev.filter((x) => x.id !== row.id));
    } finally {
      setBusyId(null);
    }
  };

  const greetingName = session?.name || "Usuario";
  const greetingRole = session?.role === ROLES.ADMIN ? "Admin" : "Trabajador";

  return (
    <div className="p-6 h-full w-full flex flex-col bg-[#0b1324] text-white">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-400">
          Bienvenido <span className="font-semibold text-gray-200">{greetingName}, {greetingRole}</span>
        </h2>
      </div>
      
      <div className="flex justify-end items-center mb-6">
          <button 
            onClick={openCreate}
            className="w-full sm:w-auto flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-6 flex items-center justify-center rounded-md transition-colors space-x-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            <span>Añadir Usuario</span>
          </button>
      </div>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, usuario o rol..."
          className="w-full bg-gray-700 border border-gray-600 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:outline-none text-white placeholder-gray-400"
        />
      </div>

      <div className="bg-gray-800 rounded-lg shadow-lg flex-grow overflow-y-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-400 uppercase bg-gray-700 sticky top-0">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3 text-center">Eliminar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading && (
              <tr><td colSpan="4" className="text-center py-10 text-gray-500">Cargando…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan="4" className="text-center py-10 text-gray-500">No se encontraron usuarios.</td></tr>
            )}
            {!loading && filtered.map((user) => (
              <tr 
                key={user.id} 
                className="hover:bg-gray-700 cursor-pointer"
                onClick={() => openEdit(user)}
              >
                <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                <td className="px-4 py-3 text-gray-400">{user.username}</td>
                <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                <td className="px-4 py-3 text-center">
                  <button
                    disabled={busyId === user.id}
                    onClick={(e) => { e.stopPropagation(); onRemove(user); }}
                    className="text-gray-500 hover:text-red-600 p-1 disabled:opacity-50 cursor-pointer group"
                    title="Eliminar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg"  
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24"
                    className="fill-white group-hover:fill-red-600 transition-colors duration-200"
                    >
                    <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/>
                    </svg>                 
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal.open && (
        <UserModal
          mode={modal.mode}
          initial={modal.initial}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
