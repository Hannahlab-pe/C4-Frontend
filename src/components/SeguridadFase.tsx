import { useEffect, useRef, useState } from 'react'
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Circle,
  Plus, Trash2, Loader2, Sparkles, X, MinusCircle,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'

interface ItemCheck { id: string; item: string; estado: 'pendiente' | 'cumple' | 'no_aplica'; critico?: boolean }
interface Incidente { id: string; fecha: string; descripcion: string; severidad: 'baja' | 'media' | 'alta'; estado: 'abierto' | 'cerrado' }
interface SegDatos { checklist?: ItemCheck[]; incidentes?: Incidente[]; riesgos?: string[] }

const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)

// Plantilla estándar G.050 para demolición (para sembrar manualmente)
const PLANTILLA_G050 = (fase: string): ItemCheck[] => {
  const base = [
    { item: 'EPP completo de la cuadrilla (casco, lentes, guantes, botas, respirador)', critico: true },
    { item: 'Charla de seguridad de 5 minutos (diaria)', critico: false },
    { item: 'Señalización y delimitación de la zona de trabajo', critico: true },
    { item: 'Supervisor SSOMA / ingeniero CIP presente en obra', critico: true },
    { item: 'Plan de respuesta a emergencias y primeros auxilios', critico: false },
  ]
  const demol = [
    { item: 'Cerco perimetral y malla/lona anti-polvo en fachadas', critico: true },
    { item: 'Protección y apuntalamiento de medianeros/colindantes', critico: true },
    { item: 'Riego permanente para control de polvo', critico: false },
    { item: 'Demolición de arriba hacia abajo (secuencia controlada)', critico: true },
    { item: 'Evaluación y retiro seguro de asbesto (si aplica)', critico: true },
    { item: 'Delimitación de zona de caída de material', critico: true },
    { item: 'Desvío peatonal señalizado en vía pública', critico: false },
  ]
  return [...(fase === 'demolicion' ? [...base, ...demol] : base)].map((x) => ({ id: uid(), estado: 'pendiente' as const, ...x }))
}

const SEV = {
  baja:  { txt: 'Baja',  cls: 'bg-slate-100 text-slate-600' },
  media: { txt: 'Media', cls: 'bg-amber-100 text-amber-700' },
  alta:  { txt: 'Alta',  cls: 'bg-red-100 text-red-700' },
}

export default function SeguridadFase({ proyectoId, fase }: { proyectoId: string; fase: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = `${fase}__seguridad`

  const [datos, setDatos] = useState<SegDatos>({})
  const [loading, setLoading] = useState(true)
  const [nuevoItem, setNuevoItem] = useState('')
  const [addItem, setAddItem] = useState(false)
  const [inc, setInc] = useState<{ descripcion: string; severidad: Incidente['severidad']; fecha: string } | null>(null)
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = (d?.datos ?? {}) as SegDatos
        lastSaved.current = JSON.stringify(v)
        setDatos(v)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { setLoading(true); cargar() }, [proyectoId, fase])

  // Refresco en vivo cuando la IA genera el plan de seguridad
  useEffect(() => {
    const onUpd = (e: Event) => {
      const det = (e as CustomEvent).detail
      if (det?.fase && det.fase !== fase) return
      cargar()
    }
    window.addEventListener('c4:seguridad-updated', onUpd)
    return () => window.removeEventListener('c4:seguridad-updated', onUpd)
  }, [proyectoId, fase])

  function persistir(next: SegDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then(() => { lastSaved.current = json }).catch(() => {})
    }, 600)
  }

  const checklist = datos.checklist ?? []
  const incidentes = datos.incidentes ?? []
  const riesgos = datos.riesgos ?? []

  const aplica = checklist.filter((c) => c.estado !== 'no_aplica')
  const cumplidos = aplica.filter((c) => c.estado === 'cumple').length
  const cumplimiento = aplica.length ? Math.round((cumplidos / aplica.length) * 100) : 0
  const abiertos = incidentes.filter((i) => i.estado === 'abierto').length

  // ── Checklist ──
  const cicloEstado = (e: ItemCheck['estado']): ItemCheck['estado'] =>
    e === 'pendiente' ? 'cumple' : e === 'cumple' ? 'no_aplica' : 'pendiente'
  const toggleItem = (id: string) =>
    persistir({ ...datos, checklist: checklist.map((c) => c.id === id ? { ...c, estado: cicloEstado(c.estado) } : c) })
  const delItem = (id: string) => persistir({ ...datos, checklist: checklist.filter((c) => c.id !== id) })
  const addItemFn = () => {
    if (!nuevoItem.trim()) return
    persistir({ ...datos, checklist: [...checklist, { id: uid(), item: nuevoItem.trim(), estado: 'pendiente' }] })
    setNuevoItem(''); setAddItem(false)
  }

  // ── Incidentes ──
  const guardarInc = () => {
    if (!inc?.descripcion.trim()) return
    persistir({ ...datos, incidentes: [...incidentes, { id: uid(), fecha: inc.fecha, descripcion: inc.descripcion.trim(), severidad: inc.severidad, estado: 'abierto' }] })
    setInc(null)
  }
  const toggleInc = (id: string) =>
    persistir({ ...datos, incidentes: incidentes.map((i) => i.id === id ? { ...i, estado: i.estado === 'abierto' ? 'cerrado' : 'abierto' } : i) })
  const delInc = (id: string) => persistir({ ...datos, incidentes: incidentes.filter((i) => i.id !== id) })

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando seguridad...</span>
    </div>
  )

  const vacio = checklist.length === 0 && incidentes.length === 0 && riesgos.length === 0

  return (
    <div className="max-w-4xl space-y-5">

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Cumplimiento</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${cumplimiento >= 80 ? 'text-emerald-600' : cumplimiento >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{cumplimiento}%</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{cumplidos}/{aplica.length} ítems</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Incidentes abiertos</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${abiertos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{abiertos}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{incidentes.length} en total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Riesgos identificados</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{riesgos.length}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">por la IA / equipo</p>
        </div>
      </div>

      {vacio && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <ShieldAlert className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay plan de seguridad</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele al <b>Asistente C4</b> el plan de seguridad de esta obra (lo adapta a tu caso según RNE G.050),
            o ármalo tú mismo.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setAddItem(true)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar ítem
            </button>
            <button onClick={() => persistir({ ...datos, checklist: PLANTILLA_G050(fase) })} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-white px-4 py-2 rounded-xl transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Usar checklist G.050
            </button>
          </div>
        </div>
      )}

      {/* Riesgos identificados */}
      {riesgos.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-amber-700 uppercase tracking-widest">Riesgos identificados</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {riesgos.map((r, i) => (
              <span key={i} className="text-xs bg-white border border-amber-200 text-amber-800 rounded-lg px-2.5 py-1">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Checklist */}
      {(checklist.length > 0 || !vacio) && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Checklist de seguridad (RNE G.050)</h2>
            </div>
            <button onClick={() => setAddItem(true)} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
              <Plus className="w-3 h-3" /> Ítem
            </button>
          </div>

          {addItem && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <input
                autoFocus value={nuevoItem} onChange={(e) => setNuevoItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addItemFn(); if (e.key === 'Escape') { setAddItem(false); setNuevoItem('') } }}
                placeholder="Ej: Apuntalamiento de muro medianero norte"
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={addItemFn} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors">Agregar</button>
              <button onClick={() => { setAddItem(false); setNuevoItem('') }} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancelar</button>
            </div>
          )}

          {checklist.length === 0 && !addItem ? (
            <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin ítems. Agrégalos o usa la plantilla G.050.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/60 transition-colors group">
                  <button onClick={() => toggleItem(c.id)} title="Cambiar estado" className="shrink-0">
                    {c.estado === 'cumple' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : c.estado === 'no_aplica' ? <MinusCircle className="w-4 h-4 text-slate-300" />
                      : <Circle className="w-4 h-4 text-slate-300" />}
                  </button>
                  <span className={`text-sm flex-1 min-w-0 ${c.estado === 'no_aplica' ? 'text-slate-400 line-through' : c.estado === 'cumple' ? 'text-slate-500' : 'text-slate-700'}`}>
                    {c.item}
                  </span>
                  {c.critico && <span className="text-[9px] font-bold uppercase tracking-wide bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded shrink-0">Crítico</span>}
                  <button onClick={() => delItem(c.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Incidentes / observaciones */}
      {!vacio && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Incidentes y observaciones</h2>
            </div>
            <button onClick={() => setInc({ descripcion: '', severidad: 'media', fecha: hoy() })} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
              <Plus className="w-3 h-3" /> Reportar
            </button>
          </div>

          {inc && (
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 space-y-2">
              <input
                autoFocus value={inc.descripcion} onChange={(e) => setInc({ ...inc, descripcion: e.target.value })}
                placeholder="Describe el incidente u observación (ej: cuadrilla sin respirador en zona de polvo)"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <div className="flex items-center gap-2">
                <select value={inc.severidad} onChange={(e) => setInc({ ...inc, severidad: e.target.value as Incidente['severidad'] })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400">
                  <option value="baja">Severidad baja</option>
                  <option value="media">Severidad media</option>
                  <option value="alta">Severidad alta</option>
                </select>
                <input type="date" value={inc.fecha} onChange={(e) => setInc({ ...inc, fecha: e.target.value })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
                <button onClick={guardarInc} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors ml-auto">Guardar</button>
                <button onClick={() => setInc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {incidentes.length === 0 && !inc ? (
            <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin incidentes registrados. Reporta observaciones de seguridad conforme aparezcan.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {incidentes.map((i) => (
                <div key={i.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                  <button onClick={() => toggleInc(i.id)} title={i.estado === 'abierto' ? 'Cerrar' : 'Reabrir'} className="shrink-0 mt-0.5">
                    {i.estado === 'cerrado' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-red-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${i.estado === 'cerrado' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{i.descripcion}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{i.fecha}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${SEV[i.severidad].cls}`}>{SEV[i.severidad].txt}</span>
                  <button onClick={() => delInc(i.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
