import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck, ClipboardCheck, AlertTriangle, Check, Eye,
  Plus, Trash2, Loader2, Sparkles, X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

interface Protocolo { id: string; item: string; estado: 'pendiente' | 'liberado' | 'observado'; critico?: boolean; fecha?: string }
interface NoConformidad { id: string; fecha: string; descripcion: string; ubicacion?: string; responsable?: string; severidad: 'baja' | 'media' | 'alta'; estado: 'abierta' | 'cerrada' }
interface CalidadDatos { protocolos?: Protocolo[]; noConformidades?: NoConformidad[] }

const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)

// Protocolos de liberación (puntos de inspección) por fase — plantilla estándar peruana.
const PLANTILLA_CALIDAD = (fase: string): Protocolo[] => {
  const base: Record<string, { item: string; critico?: boolean }[]> = {
    demolicion: [
      { item: 'Verificación de servicios desconectados (agua, luz, gas, desagüe)', critico: true },
      { item: 'Liberación de apuntalamiento y protección de medianeros', critico: true },
      { item: 'Verificación de secuencia de demolición (arriba hacia abajo)', critico: true },
      { item: 'Conformidad de disposición de desmonte en escombrera autorizada' },
    ],
    excavacion: [
      { item: 'Liberación de trazo, ejes y niveles topográficos', critico: true },
      { item: 'Liberación de calzaduras por anillo (dimensiones y concreto)', critico: true },
      { item: 'Liberación de fondo de excavación (nivel y capacidad portante vs EMS)', critico: true },
      { item: 'Verificación de estabilidad de taludes y sostenimiento' },
    ],
    construccion: [
      { item: 'Liberación de acero de refuerzo antes del vaciado (Ø, espaciamiento, recubrimiento)', critico: true },
      { item: 'Liberación de encofrado (aplomo, dimensiones, estanqueidad)', critico: true },
      { item: 'Liberación de instalaciones embebidas IISS / IIEE', critico: true },
      { item: 'Protocolo previo a vaciado de concreto (limpieza, humedecido)', critico: true },
      { item: 'Control de probetas de concreto (f’c, slump, edad)', critico: true },
      { item: 'Verificación de curado de concreto' },
    ],
    acabados: [
      { item: 'Liberación de tarrajeo (verticalidad, planeidad, espesor)', critico: false },
      { item: 'Liberación de contrapisos y pisos (nivelación, pendientes)', critico: false },
      { item: 'Pruebas de instalaciones (presión de agua, tableros, puntos)', critico: true },
      { item: 'Verificación de carpintería (aplomo, funcionamiento, sellado)' },
      { item: 'Revisión final de la unidad antes de entrega (punch list)', critico: true },
    ],
  }
  const items = base[fase] ?? [
    { item: 'Liberación de inicio de la actividad', critico: false },
    { item: 'Verificación de calidad durante la ejecución' },
    { item: 'Conformidad final de la partida' },
  ]
  return items.map((x) => ({ id: uid(), estado: 'pendiente' as const, ...x }))
}

const SEV = {
  baja:  { txt: 'Baja',  cls: 'bg-slate-100 text-slate-600' },
  media: { txt: 'Media', cls: 'bg-amber-100 text-amber-700' },
  alta:  { txt: 'Alta',  cls: 'bg-red-100 text-red-700' },
}

export default function CalidadFase({ proyectoId, fase }: { proyectoId: string; fase: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = `${fase}__calidad`

  const [datos, setDatos] = useState<CalidadDatos>({})
  const [loading, setLoading] = useState(true)
  const [nuevoItem, setNuevoItem] = useState('')
  const [addItem, setAddItem] = useState(false)
  const [nc, setNc] = useState<{ descripcion: string; ubicacion: string; responsable: string; severidad: NoConformidad['severidad']; fecha: string } | null>(null)
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSave = useRef(false)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const v = (d?.datos ?? {}) as CalidadDatos
        lastSaved.current = JSON.stringify(v)
        setDatos(v)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { setLoading(true); cargar() }, [proyectoId, fase])

  // Refresco en vivo (IA / Telegram) sin pisar edición local en curso.
  useEffect(() => {
    const onUpd = (e: Event) => {
      const det = (e as CustomEvent).detail
      if (det?.fase && det.fase !== fase) return
      cargar()
    }
    const onPoll = () => { if (!pendingSave.current) cargar() }
    window.addEventListener('c4:calidad-updated', onUpd)
    window.addEventListener('c4:proyecto-updated', onPoll)
    return () => {
      window.removeEventListener('c4:calidad-updated', onUpd)
      window.removeEventListener('c4:proyecto-updated', onPoll)
    }
  }, [proyectoId, fase])

  function persistir(next: CalidadDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    pendingSave.current = true
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') })
        .catch(() => setGuardado('error'))
        .finally(() => { pendingSave.current = false })
    }, 600)
  }

  const protocolos = datos.protocolos ?? []
  const ncs = datos.noConformidades ?? []
  const liberados = protocolos.filter((p) => p.estado === 'liberado').length
  const pct = protocolos.length ? Math.round((liberados / protocolos.length) * 100) : 0
  const observados = protocolos.filter((p) => p.estado === 'observado').length
  const ncAbiertas = ncs.filter((n) => n.estado === 'abierta').length

  // ── Protocolos ──
  const toggleLiberado = (id: string) =>
    persistir({ ...datos, protocolos: protocolos.map((p) => p.id === id ? { ...p, estado: p.estado === 'liberado' ? 'pendiente' : 'liberado', fecha: p.estado === 'liberado' ? undefined : hoy() } : p) })
  const toggleObservado = (id: string) =>
    persistir({ ...datos, protocolos: protocolos.map((p) => p.id === id ? { ...p, estado: p.estado === 'observado' ? 'pendiente' : 'observado' } : p) })
  const delProto = (id: string) => persistir({ ...datos, protocolos: protocolos.filter((p) => p.id !== id) })
  const addProto = () => {
    if (!nuevoItem.trim()) return
    persistir({ ...datos, protocolos: [...protocolos, { id: uid(), item: nuevoItem.trim(), estado: 'pendiente' }] })
    setNuevoItem(''); setAddItem(false)
  }

  // ── No conformidades ──
  const guardarNc = () => {
    if (!nc?.descripcion.trim()) return
    persistir({ ...datos, noConformidades: [...ncs, { id: uid(), fecha: nc.fecha, descripcion: nc.descripcion.trim(), ubicacion: nc.ubicacion.trim() || undefined, responsable: nc.responsable.trim() || undefined, severidad: nc.severidad, estado: 'abierta' }] })
    setNc(null)
  }
  const toggleNc = (id: string) =>
    persistir({ ...datos, noConformidades: ncs.map((n) => n.id === id ? { ...n, estado: n.estado === 'abierta' ? 'cerrada' : 'abierta' } : n) })
  const delNc = (id: string) => persistir({ ...datos, noConformidades: ncs.filter((n) => n.id !== id) })

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando calidad...</span>
    </div>
  )

  const vacio = protocolos.length === 0 && ncs.length === 0

  return (
    <div className="space-y-5">

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Liberado</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-slate-700'}`}>{pct}%</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{liberados}/{protocolos.length} protocolos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Observados</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${observados > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{observados}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">puntos con observación</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">No conformidades</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${ncAbiertas > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{ncAbiertas}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{ncs.length} en total</p>
        </div>
      </div>

      {vacio && (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <BadgeCheck className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay plan de calidad</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele al <b>Asistente C4</b> los protocolos de liberación de esta fase (los arma según las partidas y su control de calidad),
            o ármalos tú mismo.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setAddItem(true)} className="flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar protocolo
            </button>
            <button onClick={() => persistir({ ...datos, protocolos: PLANTILLA_CALIDAD(fase) })} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-white px-4 py-2 rounded-xl transition-colors">
              <Sparkles className="w-3.5 h-3.5" /> Usar protocolos sugeridos
            </button>
          </div>
        </div>
      )}

      {/* Protocolos de liberación */}
      {!vacio && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Protocolos de liberación</h2>
            </div>
            <button onClick={() => setAddItem(true)} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
              <Plus className="w-3 h-3" /> Protocolo
            </button>
          </div>

          {protocolos.length > 0 && (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-2.5 border-b border-slate-100 bg-slate-50/40">
              <div className="flex-1 h-2 bg-slate-200/70 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-600 tabular-nums shrink-0">{liberados}/{protocolos.length}</span>
            </div>
          )}

          {addItem && (
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
              <input
                autoFocus value={nuevoItem} onChange={(e) => setNuevoItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addProto(); if (e.key === 'Escape') { setAddItem(false); setNuevoItem('') } }}
                placeholder="Ej: Liberación de acero antes del vaciado de losa"
                className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={addProto} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors">Agregar</button>
              <button onClick={() => { setAddItem(false); setNuevoItem('') }} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancelar</button>
            </div>
          )}

          {protocolos.length === 0 && !addItem ? (
            <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin protocolos. Agrégalos o usa la plantilla sugerida.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {protocolos.map((p) => {
                const liberado = p.estado === 'liberado'
                const obs = p.estado === 'observado'
                return (
                  <div key={p.id} className={`flex items-center gap-2.5 sm:gap-3 pr-3 sm:pr-4 transition-colors duration-200 group ${liberado ? 'bg-emerald-50/60' : obs ? 'bg-amber-50/50' : 'hover:bg-slate-50/60'}`}>
                    <button
                      onClick={() => toggleLiberado(p.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left pl-4 sm:pl-5 py-3 active:scale-[0.99] transition-transform"
                    >
                      <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                        liberado ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30'
                          : obs ? 'bg-amber-400 border-amber-400'
                          : 'bg-white border-slate-300 group-hover:border-emerald-400'
                      }`}>
                        {liberado && <Check className="w-3.5 h-3.5 text-white check-pop" strokeWidth={3} />}
                        {obs && <Eye className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-sm transition-colors ${obs ? 'text-amber-700' : liberado ? 'text-slate-500' : 'text-slate-700'}`}>{p.item}</span>
                        {liberado && p.fecha && <span className="block text-[10px] text-emerald-600 mt-0.5">Liberado · {p.fecha}</span>}
                        {obs && <span className="block text-[10px] text-amber-600 mt-0.5">Observado — requiere levantamiento</span>}
                      </span>
                    </button>
                    {p.critico && (
                      <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 transition-colors ${liberado ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {liberado ? 'OK' : 'Crítico'}
                      </span>
                    )}
                    <button
                      onClick={() => toggleObservado(p.id)}
                      title="Marcar como observado"
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 ${obs ? 'bg-amber-100 text-amber-700' : 'text-slate-300 hover:text-amber-600 hover:bg-amber-50'}`}
                    >
                      Obs
                    </button>
                    <button onClick={() => delProto(p.id)} className="shrink-0 text-slate-300 hover:text-red-400 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* No conformidades */}
      {!vacio && (
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">No conformidades</h2>
            </div>
            <button onClick={() => setNc({ descripcion: '', ubicacion: '', responsable: '', severidad: 'media', fecha: hoy() })} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
              <Plus className="w-3 h-3" /> Registrar
            </button>
          </div>

          {nc && (
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 space-y-2">
              <input
                autoFocus value={nc.descripcion} onChange={(e) => setNc({ ...nc, descripcion: e.target.value })}
                placeholder="Describe la no conformidad (ej: cangrejera en columna eje 3, recubrimiento insuficiente)"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={nc.ubicacion} onChange={(e) => setNc({ ...nc, ubicacion: e.target.value })}
                  placeholder="Ubicación (ej: sótano 2, eje 3-B)"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400" />
                <input value={nc.responsable} onChange={(e) => setNc({ ...nc, responsable: e.target.value })}
                  placeholder="Responsable del levantamiento"
                  className="text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400" />
              </div>
              <div className="flex items-center gap-2">
                <select value={nc.severidad} onChange={(e) => setNc({ ...nc, severidad: e.target.value as NoConformidad['severidad'] })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400">
                  <option value="baja">Severidad baja</option>
                  <option value="media">Severidad media</option>
                  <option value="alta">Severidad alta</option>
                </select>
                <input type="date" value={nc.fecha} onChange={(e) => setNc({ ...nc, fecha: e.target.value })}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
                <button onClick={guardarNc} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors ml-auto">Guardar</button>
                <button onClick={() => setNc(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {ncs.length === 0 && !nc ? (
            <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin no conformidades. Regístralas cuando aparezcan (la IA también puede crearlas desde una foto).</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {ncs.map((n) => (
                <div key={n.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                  <button onClick={() => toggleNc(n.id)} title={n.estado === 'abierta' ? 'Cerrar' : 'Reabrir'} className="shrink-0 mt-0.5">
                    <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${n.estado === 'cerrada' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-red-300'}`}>
                      {n.estado === 'cerrada' && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.estado === 'cerrada' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{n.descripcion}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {n.fecha}{n.ubicacion ? ` · ${n.ubicacion}` : ''}{n.responsable ? ` · ${n.responsable}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${SEV[n.severidad].cls}`}>{SEV[n.severidad].txt}</span>
                  <button onClick={() => delNc(n.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
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
