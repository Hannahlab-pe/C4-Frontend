import { useEffect, useRef, useState } from 'react'
import {
  Activity, Plus, Trash2, Loader2, Pencil, MapPin, TrendingDown, TrendingUp,
  AlertTriangle, CheckCircle2, X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from './AppDialog'

interface Lectura { id: string; fecha: string; valorMm: number }
interface Punto { id: string; nombre: string; ubicacion: string; lecturas: Lectura[] }
interface MonDatos { limiteMm?: number; puntos?: Punto[] }

const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export default function MonitoreoFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'monitoreo'

  const [datos, setDatos] = useState<MonDatos>({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Punto> | null>(null)
  const [lecturaDe, setLecturaDe] = useState<string | null>(null)
  const [nueva, setNueva] = useState<{ fecha: string; valorMm: string }>({ fecha: hoy(), valorMm: '' })
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const v = (d?.datos ?? {}) as MonDatos; lastSaved.current = JSON.stringify(v); setDatos(v) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:monitoreo-updated', onUpd)
    return () => window.removeEventListener('c4:monitoreo-updated', onUpd)
  }, [proyectoId])

  function persistir(next: MonDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }

  const limite = num(datos.limiteMm) || 10
  const puntos = datos.puntos ?? []
  const setPuntos = (p: Punto[]) => persistir({ ...datos, puntos: p })

  function guardarPunto() {
    if (!modal?.nombre?.trim()) return
    if (modal.id) setPuntos(puntos.map((p) => p.id === modal.id ? { ...p, nombre: modal.nombre!.trim(), ubicacion: modal.ubicacion ?? '' } : p))
    else setPuntos([...puntos, { id: uid(), nombre: modal.nombre.trim(), ubicacion: modal.ubicacion ?? '', lecturas: [] }])
    setModal(null)
  }
  const delPunto = (id: string) => setPuntos(puntos.filter((p) => p.id !== id))
  function addLectura(id: string) {
    if (nueva.valorMm === '') return
    setPuntos(puntos.map((p) => p.id === id
      ? { ...p, lecturas: [...p.lecturas, { id: uid(), fecha: nueva.fecha, valorMm: num(nueva.valorMm) }].sort((a, b) => a.fecha.localeCompare(b.fecha)) }
      : p))
    setNueva({ fecha: hoy(), valorMm: '' }); setLecturaDe(null)
  }
  const delLectura = (pid: string, lid: string) =>
    setPuntos(puntos.map((p) => p.id === pid ? { ...p, lecturas: p.lecturas.filter((l) => l.id !== lid) } : p))

  const estadoDe = (abs: number) =>
    abs >= limite ? { txt: 'Crítico', cls: 'bg-red-50 text-red-700 border-red-200', bar: 'bg-red-500', val: 'text-red-600' }
      : abs >= limite * 0.6 ? { txt: 'Vigilar', cls: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-500', val: 'text-amber-600' }
        : { txt: 'OK', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', val: 'text-emerald-600' }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando monitoreo...</span>
    </div>
  )

  const lecturasDe = (p: Punto) => [...p.lecturas].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const ultimoDe = (p: Punto) => { const ls = lecturasDe(p); return ls.length ? ls[ls.length - 1].valorMm : 0 }
  const enAlerta = puntos.filter((p) => Math.abs(ultimoDe(p)) >= limite).length
  const maxDef = puntos.reduce((m, p) => Math.max(m, Math.abs(ultimoDe(p))), 0)

  return (
    <div className="max-w-4xl space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Puntos de control</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{puntos.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">En alerta</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${enAlerta > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{enAlerta}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Deformación máx.</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${maxDef >= limite ? 'text-red-600' : maxDef >= limite * 0.6 ? 'text-amber-600' : 'text-slate-900'}`}>{maxDef} mm</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-700">Monitoreo topográfico de vecinos</p>
          <p className="text-xs text-slate-400 mt-0.5">Controla el asentamiento de los colindantes durante la excavación. Alerta a {limite} mm.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-slate-500">Límite (mm)</label>
            <input type="number" value={datos.limiteMm ?? ''} onChange={(e) => persistir({ ...datos, limiteMm: num(e.target.value) })} placeholder="10"
              className="w-16 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
          </div>
          <button onClick={() => setModal({})} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Punto
          </button>
        </div>
      </div>

      {puntos.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <Activity className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Sin puntos de control</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Define puntos de control topográfico en los vecinos y registra las lecturas periódicas (mm). La app te alerta si un colindante se mueve más del límite.
          </p>
          <button onClick={() => setModal({})} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar punto
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {puntos.map((p) => {
            const ls = lecturasDe(p)
            const ultimo = ls.length ? ls[ls.length - 1].valorMm : 0
            const prev = ls.length > 1 ? ls[ls.length - 2].valorMm : null
            const delta = prev != null ? ultimo - prev : null
            const abs = Math.abs(ultimo)
            const est = estadoDe(abs)
            const pctBar = Math.min(100, (abs / limite) * 100)
            return (
              <div key={p.id} className={`bg-white rounded-2xl border ${abs >= limite ? 'border-red-200' : 'border-slate-200'} overflow-hidden`}>
                <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{p.nombre}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${est.cls}`}>{est.txt}</span>
                    </div>
                    {p.ubicacion && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {p.ubicacion}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setLecturaDe(p.id); setNueva({ fecha: hoy(), valorMm: '' }) }} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium px-2 py-1"><Plus className="w-3 h-3" /> Lectura</button>
                    <button onClick={() => setModal(p)} className="text-slate-300 hover:text-slate-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => delPunto(p.id)} className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="px-5 py-3.5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black tabular-nums ${est.val}`}>{ultimo} mm</span>
                      {delta != null && delta !== 0 && (
                        <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${Math.abs(ultimo) > Math.abs(prev!) ? 'text-red-500' : 'text-emerald-500'}`}>
                          {Math.abs(ultimo) > Math.abs(prev!) ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                          {delta > 0 ? '+' : ''}{delta} mm
                        </span>
                      )}
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${est.bar}`} style={{ width: `${pctBar}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-400">/ {limite} mm</span>
                  </div>

                  {lecturaDe === p.id && (
                    <div className="flex items-center gap-2 my-2">
                      <input type="date" value={nueva.fecha} onChange={(e) => setNueva({ ...nueva, fecha: e.target.value })} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                      <input type="number" autoFocus value={nueva.valorMm} onChange={(e) => setNueva({ ...nueva, valorMm: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') addLectura(p.id) }} placeholder="mm (ej: -7)" className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                      <button onClick={() => addLectura(p.id)} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-colors">Guardar</button>
                      <button onClick={() => setLecturaDe(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}

                  {ls.length === 0 ? (
                    <p className="text-[11px] text-slate-300">Sin lecturas. Registra la lectura inicial (0 mm) antes de excavar.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {ls.map((l) => (
                        <span key={l.id} className="group inline-flex items-center gap-1 text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
                          <span className="text-slate-400">{l.fecha.slice(5)}</span>
                          <b className={Math.abs(l.valorMm) >= limite ? 'text-red-600' : 'text-slate-700'}>{l.valorMm} mm</b>
                          <button onClick={() => delLectura(p.id, l.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  {abs >= limite && (
                    <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Supera el límite de {limite} mm — detén la excavación en este frente y refuerza el sostenimiento.</p>
                  )}
                  {abs < limite && abs >= limite * 0.6 && (
                    <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Cerca del límite — aumenta la frecuencia de lecturas.</p>
                  )}
                  {abs < limite * 0.6 && ls.length > 0 && (
                    <p className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Dentro de lo permitido.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal punto */}
      <AppDialog open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar punto de control' : 'Nuevo punto de control'}>
        {modal && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / referencia</label>
              <input className={inputCls} autoFocus value={modal.nombre ?? ''} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} placeholder="Ej: Vecino izquierda — esquina A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación</label>
              <input className={inputCls} value={modal.ubicacion ?? ''} onChange={(e) => setModal({ ...modal, ubicacion: e.target.value })} placeholder="Ej: lindero izquierdo, fachada frontal" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardarPunto} disabled={!modal.nombre?.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">{modal.id ? 'Guardar' : 'Agregar'}</button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
