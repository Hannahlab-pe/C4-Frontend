import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Search, Loader2, Trash2, Save, Calculator, ChevronRight,
} from 'lucide-react'
import AppDialog from '../AppDialog'
import {
  presupuestosApi, soles, num, cantidadEfectiva, TIPO_RECURSO_META,
  type Partida, type Recurso, type ApuLinea,
} from '../../lib/presupuestos'

export default function PartidasTab({ onCambio }: { onCambio?: () => void }) {
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [sel, setSel] = useState<Partida | null>(null)
  const [showModal, setShowModal] = useState(false)

  // APU en edición
  const [lineas, setLineas] = useState<ApuLinea[]>([])
  const [apuLoading, setApuLoading] = useState(false)
  const [guardandoApu, setGuardandoApu] = useState(false)
  const [costoServidor, setCostoServidor] = useState<string | null>(null)

  // form nueva partida
  const [form, setForm] = useState<Partial<Partida>>({})
  const [creando, setCreando] = useState(false)

  const recursosMap = useMemo(() => new Map(recursos.map((r) => [r.id, r])), [recursos])

  const cargar = () => {
    setLoading(true)
    Promise.all([presupuestosApi.listarPartidas(), presupuestosApi.listarRecursos()])
      .then(([ps, rs]) => { setPartidas(ps); setRecursos(rs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(cargar, [])

  const filtradas = useMemo(() => partidas.filter((p) => {
    const q = busqueda.toLowerCase()
    return !q || p.codigo.toLowerCase().includes(q) || p.descripcion.toLowerCase().includes(q)
  }), [partidas, busqueda])

  async function seleccionar(p: Partida) {
    setSel(p); setApuLoading(true); setCostoServidor(null)
    try {
      const { lineas, calculo } = await presupuestosApi.getApu(p.id)
      setLineas(lineas.map((l) => ({ ...l })))
      setCostoServidor(calculo.costoUnitario)
    } finally { setApuLoading(false) }
  }

  function updateLinea(i: number, patch: Partial<ApuLinea>) {
    setLineas((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function agregarRecurso(recursoId: string) {
    const r = recursosMap.get(recursoId)
    if (!r) return
    const esJornal = r.tipo === 'MO' || r.tipo === 'EQP'
    setLineas((ls) => [...ls, {
      clase: r.tipo, refId: r.id,
      cuadrilla: esJornal ? 1 : null, rendimiento: esJornal ? 1 : null,
      cantidad: esJornal ? null : 1, orden: ls.length,
    }])
  }

  const costoPreview = useMemo(
    () => lineas.reduce((s, l) => s + cantidadEfectiva(l) * Number(recursosMap.get(l.refId)?.precioUnitario ?? 0), 0),
    [lineas, recursosMap],
  )

  async function guardarApu() {
    if (!sel) return
    setGuardandoApu(true)
    try {
      const { lineas: nuevas, calculo } = await presupuestosApi.setApu(
        sel.id,
        lineas.map((l, i) => ({
          clase: l.clase, refId: l.refId,
          cuadrilla: l.cuadrilla != null && l.cuadrilla !== '' ? Number(l.cuadrilla) : null,
          rendimiento: l.rendimiento != null && l.rendimiento !== '' ? Number(l.rendimiento) : null,
          cantidad: l.cantidad != null && l.cantidad !== '' ? Number(l.cantidad) : null,
          orden: i,
        })),
      )
      setLineas(nuevas.map((l) => ({ ...l })))
      setCostoServidor(calculo.costoUnitario)
      onCambio?.()
    } finally { setGuardandoApu(false) }
  }

  async function crearPartida() {
    if (!form.codigo?.trim() || !form.descripcion?.trim() || !form.unidad?.trim()) return
    setCreando(true)
    try {
      const p = await presupuestosApi.crearPartida({
        codigo: form.codigo!.trim(), descripcion: form.descripcion!.trim(),
        unidad: form.unidad!.trim(), especialidad: form.especialidad?.trim() || '',
      })
      setShowModal(false); setForm({})
      setPartidas((ps) => [...ps, p].sort((a, b) => a.codigo.localeCompare(b.codigo)))
      seleccionar(p); onCambio?.()
    } finally { setCreando(false) }
  }

  return (
    <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-4 items-start">
      {/* ── Lista de partidas ── */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar partida..."
              className="text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full bg-transparent" />
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Nueva partida
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
          ) : filtradas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12 px-4">
              {partidas.length === 0 ? 'Sin partidas. Crea la primera (ej: Concreto f’c=210 en columnas).' : 'Sin resultados.'}
            </p>
          ) : filtradas.map((p) => (
            <button key={p.id} onClick={() => seleccionar(p)}
              className={`w-full text-left px-4 py-2.5 border-b border-slate-50 transition-colors flex items-center gap-2 group ${
                sel?.id === p.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'
              }`}>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[11px] text-slate-400">{p.codigo}</p>
                <p className="text-sm text-slate-800 truncate">{p.descripcion}</p>
              </div>
              <span className="text-[11px] text-slate-400 shrink-0">{p.unidad}</span>
              <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${sel?.id === p.id ? 'text-blue-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Editor de APU ── */}
      {!sel ? (
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Calculator className="w-10 h-10 text-slate-200" />
          <p className="text-sm text-slate-400 max-w-xs">Selecciona una partida para editar su <b>Análisis de Precios Unitarios</b> (APU).</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Cabecera */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="font-mono text-[11px] text-slate-400">{sel.codigo}</p>
              <h3 className="text-base font-bold text-slate-900 leading-snug">{sel.descripcion}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Rendimiento por {sel.unidad}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 uppercase tracking-wide">Costo unitario</p>
              <p className="text-xl font-bold text-blue-600 tabular-nums">{soles(costoServidor ?? costoPreview)}</p>
              {costoServidor != null && Math.abs(Number(costoServidor) - costoPreview) > 0.005 && (
                <p className="text-[10px] text-amber-500">preview {soles(costoPreview)} — guarda para fijar</p>
              )}
            </div>
          </div>

          {apuLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                      <th className="px-4 py-2.5 font-semibold">Recurso</th>
                      <th className="px-3 py-2.5 font-semibold">Tipo</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Cuadr.</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Rend.</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Cant.</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Precio</th>
                      <th className="px-3 py-2.5 font-semibold text-right">Parcial</th>
                      <th className="px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {lineas.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-400">Sin insumos. Agrega recursos abajo.</td></tr>
                    )}
                    {lineas.map((l, i) => {
                      const r = recursosMap.get(l.refId)
                      const esJornal = l.clase === 'MO' || l.clase === 'EQP'
                      const precio = Number(r?.precioUnitario ?? 0)
                      const parcial = cantidadEfectiva(l) * precio
                      return (
                        <tr key={i} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2">
                            <p className="text-slate-800">{r?.nombre ?? <span className="text-slate-400 italic">recurso no encontrado</span>}</p>
                            <p className="text-[11px] text-slate-400">{r?.unidad}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIPO_RECURSO_META[l.clase as 'MO']?.badge ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>{l.clase}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            {esJornal ? <CellNum value={l.cuadrilla} onChange={(v) => updateLinea(i, { cuadrilla: v })} /> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {esJornal ? <CellNum value={l.rendimiento} onChange={(v) => updateLinea(i, { rendimiento: v })} /> : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {esJornal ? <span className="text-slate-500 tabular-nums">{num(cantidadEfectiva(l), 4)}</span> : <CellNum value={l.cantidad} onChange={(v) => updateLinea(i, { cantidad: v })} />}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{num(precio)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">{num(parcial)}</td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => setLineas((ls) => ls.filter((_, idx) => idx !== i))} className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Agregar recurso + guardar */}
              <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/40">
                <select value="" onChange={(e) => { if (e.target.value) agregarRecurso(e.target.value) }}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 bg-white outline-none focus:border-blue-400 max-w-xs">
                  <option value="">+ Agregar recurso…</option>
                  {recursos.map((r) => <option key={r.id} value={r.id}>{r.codigo} · {r.nombre} ({r.tipo})</option>)}
                </select>
                <button onClick={guardarApu} disabled={guardandoApu}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                  {guardandoApu ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar APU
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal nueva partida */}
      <AppDialog open={showModal} onClose={() => setShowModal(false)} title="Nueva partida">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Código <span className="text-red-400">*</span></label>
              <input value={form.codigo ?? ''} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="01.01" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Unidad <span className="text-red-400">*</span></label>
              <input value={form.unidad ?? ''} onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))} placeholder="m³ / m² / kg / und" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descripción <span className="text-red-400">*</span></label>
            <input value={form.descripcion ?? ''} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} placeholder="Concreto f’c=210 kg/cm² en columnas" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Especialidad</label>
            <input value={form.especialidad ?? ''} onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))} placeholder="Estructuras (opcional)" className={inputCls} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={crearPartida} disabled={creando || !form.codigo?.trim() || !form.descripcion?.trim() || !form.unidad?.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {creando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear partida
          </button>
        </div>
      </AppDialog>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

function CellNum({ value, onChange }: { value: number | string | null | undefined; onChange: (v: string) => void }) {
  return (
    <input
      type="number" step="0.0001" value={value ?? ''} onChange={(e) => onChange(e.target.value)}
      className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 tabular-nums"
    />
  )
}
