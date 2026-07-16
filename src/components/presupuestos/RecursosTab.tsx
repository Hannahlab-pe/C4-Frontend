import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Loader2, Check, X, Boxes } from 'lucide-react'
import AppDialog from '../AppDialog'
import {
  presupuestosApi, soles, TIPO_RECURSO_META,
  type Recurso, type TipoRecurso,
} from '../../lib/presupuestos'

const TIPOS: TipoRecurso[] = ['MO', 'MAT', 'EQP', 'SUB']

export default function RecursosTab({ onCambio }: { onCambio?: () => void }) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoRecurso | 'todos'>('todos')
  const [showModal, setShowModal] = useState(false)

  // edición inline de precio
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  // form nuevo recurso
  const [form, setForm] = useState<Partial<Recurso>>({ tipo: 'MAT', moneda: 'PEN' })
  const [guardando, setGuardando] = useState(false)

  const cargar = () => {
    setLoading(true)
    presupuestosApi.listarRecursos().then(setRecursos).catch(() => setRecursos([])).finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  const filtrados = useMemo(() => recursos.filter((r) => {
    const okTipo = filtroTipo === 'todos' || r.tipo === filtroTipo
    const q = busqueda.toLowerCase()
    const okQ = !q || r.codigo.toLowerCase().includes(q) || r.nombre.toLowerCase().includes(q)
    return okTipo && okQ
  }), [recursos, filtroTipo, busqueda])

  async function crear() {
    if (!form.codigo?.trim() || !form.nombre?.trim() || !form.unidad?.trim()) return
    setGuardando(true)
    try {
      await presupuestosApi.crearRecurso({
        codigo: form.codigo!.trim(), nombre: form.nombre!.trim(), tipo: form.tipo as TipoRecurso,
        familia: form.familia?.trim() || '', unidad: form.unidad!.trim(),
        precioUnitario: String(Number(form.precioUnitario ?? 0)), moneda: 'PEN',
      })
      setShowModal(false)
      setForm({ tipo: 'MAT', moneda: 'PEN' })
      cargar(); onCambio?.()
    } finally { setGuardando(false) }
  }

  async function guardarPrecio(id: string) {
    const precio = Number(editVal)
    setEditId(null)
    if (Number.isNaN(precio)) return
    await presupuestosApi.actualizarPrecio(id, precio)
    setRecursos((rs) => rs.map((r) => (r.id === id ? { ...r, precioUnitario: String(precio) } : r)))
    onCambio?.()
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-64">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar recurso..."
              className="text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full bg-transparent"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['todos', ...TIPOS] as const).map((t) => (
              <button
                key={t} onClick={() => setFiltroTipo(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filtroTipo === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo recurso
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Boxes className="w-9 h-9 text-slate-200" />
            <p className="text-sm text-slate-400">
              {recursos.length === 0 ? 'Aún no hay recursos. Crea el primero (cemento, peón, mezcladora…).' : 'Sin resultados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold">Código</th>
                  <th className="px-4 py-3 font-semibold">Recurso</th>
                  <th className="px-4 py-3 font-semibold">Tipo</th>
                  <th className="px-4 py-3 font-semibold">Und</th>
                  <th className="px-4 py-3 font-semibold text-right">Precio (S/)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtrados.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.codigo}</td>
                    <td className="px-4 py-2.5 text-slate-800">{r.nombre}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${TIPO_RECURSO_META[r.tipo].badge}`}>
                        {r.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{r.unidad}</td>
                    <td className="px-4 py-2.5 text-right">
                      {editId === r.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            autoFocus type="number" step="0.01" value={editVal}
                            onChange={(e) => setEditVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') guardarPrecio(r.id); if (e.key === 'Escape') setEditId(null) }}
                            className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-100"
                          />
                          <button onClick={() => guardarPrecio(r.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditId(r.id); setEditVal(String(Number(r.precioUnitario))) }}
                          className="font-semibold text-slate-800 tabular-nums hover:text-blue-600 hover:underline decoration-dotted underline-offset-4"
                          title="Editar precio (recalcula los APU que lo usan)"
                        >
                          {soles(r.precioUnitario)}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && filtrados.length > 0 && (
        <p className="text-[11px] text-slate-400 px-1">
          {filtrados.length} recurso(s). El precio es la <b>fuente única</b>: al cambiarlo se recalculan los APU que lo usan (los presupuestos ya armados conservan su snapshot).
        </p>
      )}

      {/* Modal nuevo recurso */}
      <AppDialog open={showModal} onClose={() => setShowModal(false)} title="Nuevo recurso">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Código" required>
              <input value={form.codigo ?? ''} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="MAT-001" className={inputCls} />
            </Field>
            <Field label="Tipo" required>
              <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as TipoRecurso }))} className={inputCls}>
                {TIPOS.map((t) => <option key={t} value={t}>{t} — {TIPO_RECURSO_META[t].label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Nombre" required>
            <input value={form.nombre ?? ''} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Cemento Portland Tipo I" className={inputCls} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Unidad" required>
              <input value={form.unidad ?? ''} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                placeholder="bol / m³ / hh" className={inputCls} />
            </Field>
            <Field label="Familia">
              <input value={form.familia ?? ''} onChange={(e) => setForm((f) => ({ ...f, familia: e.target.value }))}
                placeholder="opcional" className={inputCls} />
            </Field>
            <Field label="Precio S/" required>
              <input type="number" step="0.01" value={form.precioUnitario ?? ''} onChange={(e) => setForm((f) => ({ ...f, precioUnitario: e.target.value }))}
                placeholder="0.00" className={inputCls} />
            </Field>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={crear} disabled={guardando || !form.codigo?.trim() || !form.nombre?.trim() || !form.unidad?.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear recurso
          </button>
        </div>
      </AppDialog>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  )
}
