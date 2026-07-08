import { useEffect, useRef, useState } from 'react'
import {
  Gauge, Plus, Trash2, Loader2, Pencil, Users, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from './AppDialog'

interface Partida {
  id: string; nombre: string; unidad: string; cuadrilla: string; trabajadores: number
  metradoTotal: number; metradoEjecutado: number; hhPresupuestadas: number; hhReales: number
}

const uid = () => Math.random().toString(36).slice(2, 10)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const inputSm = 'w-20 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 text-right tabular-nums'

// Factor de productividad: rendimiento real / previsto (1.0 = según lo planeado)
function pfDe(p: Partida): number | null {
  const rendPrev = p.hhPresupuestadas > 0 ? p.metradoTotal / p.hhPresupuestadas : 0
  const rendReal = p.hhReales > 0 ? p.metradoEjecutado / p.hhReales : 0
  if (rendPrev <= 0 || rendReal <= 0) return null
  return rendReal / rendPrev
}
function pfInfo(pf: number | null) {
  if (pf == null) return { txt: 'Sin datos', cls: 'bg-slate-100 text-slate-500 border-slate-200', bar: 'bg-slate-300' }
  if (pf >= 1) return { txt: 'Óptimo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' }
  if (pf >= 0.85) return { txt: 'Aceptable', cls: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500' }
  return { txt: 'Bajo', cls: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500' }
}

export default function ProductividadFase({ proyectoId, fase }: { proyectoId: string; fase: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = `${fase}__productividad`

  const [partidas, setPartidas] = useState<Partida[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Partida> | null>(null)
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const a = Array.isArray(d?.datos?.partidas) ? d.datos.partidas : []; lastSaved.current = JSON.stringify(a); setPartidas(a) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId, fase])
  useEffect(() => {
    const onUpd = (e: Event) => { const d = (e as CustomEvent).detail; if (d?.fase && d.fase !== fase) return; cargar() }
    window.addEventListener('c4:productividad-updated', onUpd)
    return () => window.removeEventListener('c4:productividad-updated', onUpd)
  }, [proyectoId, fase])

  function persistir(next: Partida[]) {
    setPartidas(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { partidas: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }
  const upd = (id: string, patch: Partial<Partida>) => persistir(partidas.map((p) => p.id === id ? { ...p, ...patch } : p))

  function guardar() {
    if (!modal?.nombre?.trim()) return
    const base = {
      nombre: modal.nombre.trim(), unidad: modal.unidad ?? 'm2', cuadrilla: modal.cuadrilla ?? '',
      trabajadores: num(modal.trabajadores), metradoTotal: num(modal.metradoTotal), hhPresupuestadas: num(modal.hhPresupuestadas),
    }
    if (modal.id) upd(modal.id, base)
    else persistir([...partidas, { id: uid(), metradoEjecutado: 0, hhReales: 0, ...base }])
    setModal(null)
  }
  const eliminar = (id: string) => persistir(partidas.filter((p) => p.id !== id))

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando productividad...</span>
    </div>
  )

  const hhPresupTotal = partidas.reduce((s, p) => s + num(p.hhPresupuestadas), 0)
  const hhRealTotal = partidas.reduce((s, p) => s + num(p.hhReales), 0)
  const conPf = partidas.map((p) => ({ p, pf: pfDe(p) })).filter((x) => x.pf != null) as { p: Partida; pf: number }[]
  const pfGlobal = conPf.length
    ? conPf.reduce((s, x) => s + x.pf * x.p.hhReales, 0) / Math.max(1, conPf.reduce((s, x) => s + x.p.hhReales, 0))
    : null
  const enAlerta = conPf.filter((x) => x.pf < 0.85).length
  const avanceProm = partidas.length
    ? Math.round(partidas.reduce((s, p) => s + (p.metradoTotal > 0 ? Math.min(100, (p.metradoEjecutado / p.metradoTotal) * 100) : 0), 0) / partidas.length)
    : 0

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Gauge className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Productividad</p></div>
          <p className={`text-2xl font-black tabular-nums leading-none ${pfGlobal == null ? 'text-slate-900' : pfGlobal >= 1 ? 'text-emerald-600' : pfGlobal >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
            {pfGlobal == null ? '—' : `${Math.round(pfGlobal * 100)}%`}
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5">real vs previsto</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">HH consumidas</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{hhRealTotal.toLocaleString('es-PE')}<span className="text-sm text-slate-400"> / {hhPresupTotal.toLocaleString('es-PE')}</span></p>
          <p className="text-[11px] text-slate-400 mt-1.5">horas-hombre</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Avance físico</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{avanceProm}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Partidas en alerta</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${enAlerta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{enAlerta}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Productividad de mano de obra</p>
          <p className="text-xs text-slate-400 mt-0.5">Rendimiento real vs presupuestado por partida (avance ÷ horas-hombre). Alerta bajo 85%.</p>
        </div>
        <button onClick={() => setModal({ unidad: 'm2' })} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Partida
        </button>
      </div>

      {partidas.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay partidas de productividad</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele a la IA que arme las partidas con sus HH presupuestadas, o agrégalas tú. Luego registras el metrado ejecutado y las HH reales, y la app calcula el rendimiento.
          </p>
          <button onClick={() => setModal({ unidad: 'm2' })} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar partida
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {partidas.map((p) => {
            const pf = pfDe(p)
            const info = pfInfo(pf)
            const avance = p.metradoTotal > 0 ? Math.min(100, Math.round((p.metradoEjecutado / p.metradoTotal) * 100)) : 0
            const rendReal = p.hhReales > 0 ? p.metradoEjecutado / p.hhReales : 0
            const rendPrev = p.hhPresupuestadas > 0 ? p.metradoTotal / p.hhPresupuestadas : 0
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{p.nombre}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border flex items-center gap-1 ${info.cls}`}>
                        {pf == null ? null : pf >= 1 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {info.txt}{pf != null ? ` · ${Math.round(pf * 100)}%` : ''}
                      </span>
                    </div>
                    {(p.cuadrilla || p.trabajadores > 0) && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Users className="w-3 h-3 text-slate-400" /> {p.cuadrilla}{p.trabajadores > 0 ? ` · ${p.trabajadores} trab.` : ''}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setModal(p)} title="Editar" className="text-slate-300 hover:text-slate-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => eliminar(p.id)} title="Eliminar" className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="px-5 py-3.5">
                  {/* Inputs de avance y HH */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Metrado ({p.unidad})</p>
                      <div className="flex items-center gap-1">
                        <input type="number" className={inputSm} value={p.metradoEjecutado || ''} onChange={(e) => upd(p.id, { metradoEjecutado: num(e.target.value) })} placeholder="0" />
                        <span className="text-xs text-slate-400">/ {p.metradoTotal || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">HH reales</p>
                      <div className="flex items-center gap-1">
                        <input type="number" className={inputSm} value={p.hhReales || ''} onChange={(e) => upd(p.id, { hhReales: num(e.target.value) })} placeholder="0" />
                        <span className="text-xs text-slate-400">/ {p.hhPresupuestadas || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Rend. real</p>
                      <p className="text-sm font-semibold text-slate-700 tabular-nums">{rendReal ? rendReal.toFixed(2) : '—'} <span className="text-[10px] text-slate-400">{p.unidad}/HH</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Rend. previsto</p>
                      <p className="text-sm font-semibold text-slate-400 tabular-nums">{rendPrev ? rendPrev.toFixed(2) : '—'} <span className="text-[10px] text-slate-400">{p.unidad}/HH</span></p>
                    </div>
                  </div>
                  {/* Barra de productividad */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 w-20">Avance {avance}%</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                      <div className={`h-full rounded-full transition-all ${info.bar}`} style={{ width: `${Math.min(100, pf != null ? pf * 100 : 0)}%` }} />
                      {/* marca del 100% (objetivo) */}
                      <div className="absolute top-0 bottom-0 w-px bg-slate-400/60" style={{ left: '100%' }} />
                    </div>
                    <span className="text-[10px] text-slate-400 w-24 text-right">objetivo 100%</span>
                  </div>
                  {pf != null && pf < 0.85 && (
                    <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Rendimiento {Math.round((1 - pf) * 100)}% por debajo de lo previsto — revisa la cuadrilla, el método o la programación.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal partida */}
      <AppDialog open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar partida' : 'Nueva partida'} wide>
        {modal && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Partida</label>
                <input className={inputCls} autoFocus value={modal.nombre ?? ''} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} placeholder="Ej: Vaciado de losas, Excavación masiva" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Unidad</label>
                <select className={inputCls} value={modal.unidad ?? 'm2'} onChange={(e) => setModal({ ...modal, unidad: e.target.value })}>
                  {['m2', 'm3', 'und', 'ml', 'kg', 'ton'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Metrado total</label>
                <input type="number" className={inputCls} value={modal.metradoTotal ?? ''} onChange={(e) => setModal({ ...modal, metradoTotal: e.target.value as any })} placeholder="350" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">HH presupuestadas</label>
                <input type="number" className={inputCls} value={modal.hhPresupuestadas ?? ''} onChange={(e) => setModal({ ...modal, hhPresupuestadas: e.target.value as any })} placeholder="180" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cuadrilla</label>
                <input className={inputCls} value={modal.cuadrilla ?? ''} onChange={(e) => setModal({ ...modal, cuadrilla: e.target.value })} placeholder="Ej: Cuadrilla A — vaciados" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">N° trabajadores</label>
                <input type="number" className={inputCls} value={modal.trabajadores ?? ''} onChange={(e) => setModal({ ...modal, trabajadores: e.target.value as any })} placeholder="6" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={!modal.nombre?.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">{modal.id ? 'Guardar' : 'Agregar'}</button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
