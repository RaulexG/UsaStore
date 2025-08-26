import { useEffect, useState } from "react";

export default function ProductModal({ open, mode = "create", initial = null, onClose, onSave }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState({ code: "", name: "", price: "", stock: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErr("");
    setForm(
      initial
        ? {
            code: initial.code ?? "",
            name: initial.name ?? "",
            price: String(initial.price ?? ""),
            stock: String(initial.stock ?? ""),
          }
        : { code: "", name: "", price: "", stock: "" }
    );
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === "name" ? e.target.value : e.target.value.trimStart() }));

  const validate = () => {
    const code = form.code.trim();
    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!code) return "Código requerido";
    if (!name) return "Nombre requerido";
    if (!Number.isFinite(price) || price < 0) return "Precio inválido (≥ 0)";
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) return "Stock inválido (entero ≥ 0)";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    const v = validate();
    if (v) return setErr(v);

    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    };

    setLoading(true);
    try {
      await onSave(payload);
      onClose?.();
    } catch (e2) {
      setErr(e2?.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={(e) => e.key === "Escape" && onClose?.()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl bg-[#0f1a2b] p-6 text-white shadow-xl ring-1 ring-white/10">
        <h3 className="mb-4 text-lg font-semibold">
          {isEdit ? `Editando: ${initial?.name ?? ""}` : "Añadir Nuevo Producto"}
        </h3>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-sm text-white/70">Código del Producto</label>
            <input
              autoFocus
              value={form.code}
              onChange={set("code")}
              className="mt-1 w-full rounded-md bg-white/10 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-blue-500"
              placeholder="B650"
            />
          </div>

          <div>
            <label className="text-sm text-white/70">Nombre del Producto</label>
            <input
              value={form.name}
              onChange={set("name")}
              className="mt-1 w-full rounded-md bg-white/10 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-blue-500"
              placeholder="Perfume Hugo Boss"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/70">Precio de Venta</label>
              <input
                value={form.price}
                onChange={set("price")}
                inputMode="decimal"
                className="mt-1 w-full rounded-md bg-white/10 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-blue-500"
                placeholder="900"
              />
            </div>
            <div>
              <label className="text-sm text-white/70">Stock Actual</label>
              <input
                value={form.stock}
                onChange={set("stock")}
                inputMode="numeric"
                className="mt-1 w-full rounded-md bg-white/10 px-3 py-2 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-blue-500"
                placeholder="15"
              />
            </div>
          </div>

          {err && <div className="text-sm text-red-400">{err}</div>}

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md bg-white/10 px-4 py-2 text-white hover:bg-white/15" disabled={loading}>
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {isEdit ? "Guardar Cambios" : "Añadir Producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

