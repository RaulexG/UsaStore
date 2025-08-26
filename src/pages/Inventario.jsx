import { useEffect, useMemo, useState } from "react";
import { inventoryApi } from "../services/inventoryApi";
import { authApi } from "../services/api";
import ProductModal from "../components/ProductModal";

const fmtMoney = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const classCell = "px-3 py-2 text-sm";
const classTh = "px-3 py-2 text-xs font-semibold text-white/80 uppercase tracking-wide";

export default function Inventario() {
  const [session, setSession] = useState(null);

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [current, setCurrent] = useState(null);

  // Paginación
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(false); 

  useEffect(() => {
    authApi.getSession().then((r) => setSession(r?.session || null));
  }, []);

  const fetchPage = async ({ qArg = q, pageArg = page } = {}) => {
    setLoading(true);
    setError("");
    try {
      const data = await inventoryApi.list({
        q: qArg,
        limit: pageSize + 1, 
        offset: pageArg * pageSize,
      });
      setHasMore(data.length > pageSize);
      setItems(data.slice(0, pageSize));
    } catch (e) {
      setError(e.message || "Error al listar inventario");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      fetchPage({ qArg: q, pageArg: 0 });
    }, 250);
    return () => clearTimeout(t);
    
  }, [q]);

  useEffect(() => {
    fetchPage();
    
  }, []);

  const onAdd = () => {
    setMode("create");
    setCurrent(null);
    setOpen(true);
  };

  const onRow = (it) => {
    setMode("edit");
    setCurrent(it);
    setOpen(true);
  };

  const onSave = async (payload) => {
    if (mode === "edit" && current?.id) {
      await inventoryApi.update(current.id, payload);
    } else {
      await inventoryApi.create(payload);
    }
    await fetchPage({ qArg: q, pageArg: 0 });
    setPage(0);
  };

  const onDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("¿Eliminar este producto?")) return;
    await inventoryApi.remove(id);
    const goBackIfEmpty = items.length === 1 && page > 0;
    const newPage = goBackIfEmpty ? page - 1 : page;
    setPage(newPage);
    await fetchPage({ qArg: q, pageArg: newPage });
  };

  const onPrev = async () => {
    if (page === 0) return;
    const p = page - 1;
    setPage(p);
    await fetchPage({ qArg: q, pageArg: p });
  };

  const onNext = async () => {
    if (!hasMore) return;
    const p = page + 1;
    setPage(p);
    await fetchPage({ qArg: q, pageArg: p });
  };

  const showingFrom = useMemo(() => page * pageSize + 1, [page]);
  const showingTo = useMemo(() => page * pageSize + items.length, [page, items]);

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/70">
          {session ? (
            <>
              Bienvenido <span className="font-semibold text-white">{session.name}</span>,{" "}
              <span className="uppercase">{session.role}</span>
            </>
          ) : (
            <span className="text-white/60">Inventario</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código o nombre"
            className="w-64 rounded-md bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/15 placeholder-white/40 focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onAdd}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Añadir Producto
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-white/10 bg-[#0f1a2b] shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/5">
              <tr>
                <th className={classTh}>Código</th>
                <th className={classTh}>Nombre</th>
                <th className={classTh + " text-right"}>Precio</th>
                <th className={classTh + " text-right"}>Stock</th>
                <th className={classTh + " text-center"}>Eliminar</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-white/70">
                    Cargando…
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-red-400">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-white/70">
                    {q ? "Sin resultados para tu búsqueda." : "No hay productos. Agrega el primero."}
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                items.map((it) => (
                  <tr
                    key={it.id}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/5"
                    onClick={() => onRow(it)}
                  >
                    <td className={classCell + " font-medium"}>{it.code}</td>
                    <td className={classCell}>{it.name}</td>
                    <td className={classCell + " text-right"}>{fmtMoney.format(it.price)}</td>
                    <td className={classCell + " text-right"}>
                      <span
                        className={
                          "inline-flex min-w-[40px] justify-center rounded-full px-2 py-0.5 text-xs " +
                          (it.stock <= 3
                            ? "bg-red-500/20 text-red-300"
                            : it.stock <= 10
                            ? "bg-yellow-500/20 text-yellow-200"
                            : "bg-emerald-500/20 text-emerald-200")
                        }
                      >
                        {it.stock}
                      </span>
                    </td>
                    <td className={classCell + " text-center"} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onDelete(it.id)}
                        className=" px-2 py-1 text-xs text-white cursor-pointer hoover:text-red-600 transition-colors duration-200 disabled:opacity-50 group"
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
      </div>

      {/* Modal */}
      <ProductModal
        open={open}
        mode={mode}
        initial={current}
        onClose={() => setOpen(false)}
        onSave={onSave}
      />
    </div>
  );
}
