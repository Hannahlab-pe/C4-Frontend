import { useEffect, useRef, useState } from 'react'
import {
  Layers, Plus, Trash2, Loader2, Pencil, MapPin, Minus,
  CheckCircle2, AlertTriangle, Ruler,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import { estadoEtapaInfo } from '../lib/registros-fase'
import AppDialog from './AppDialog'

interface Calzadura {
  id: string; sector: string; ubicacion: string
  profundidadM: number; numPanos: number; panosCompletos: number
  numAnillos: number; anillosCompletos: number
  dimensiones: string; concreto: string; verticalidadOk: boolean; observaciones: string
}

const uid = () => Math.random().toString(36).slice(2, 10)
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const avanceDe = (c: Calzadura) => c.numPanos > 0 ? Math.round((c.panosCompletos / c.numPanos) * 100) : 0

export default function CalzadurasFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'calzaduras'

  const [lista, setLista] = useState<Calzadura[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Calzadura> | null>(null)
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = Array.isArray(d?.datos?.calzaduras) ? d.datos.calzaduras : []
        lastSaved.current = JSON.stringify(arr)
        setLista(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:calzaduras-updated', onUpd)
    return () => window.removeEventListener('c4:calzaduras-updated', onUpd)
  }, [proyectoId])

  function persistir(next: Calzadura[]) {
    setLista(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { calzaduras: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }
  const upd = (id: string, patch: Partial<Calzadura>) => persistir(lista.map((c) => c.id === id ? { ...c, ...patch } : c))

  function guardar() {
    if (!modal?.sector?.trim()) return
    const base = {
      sector: modal.sector.trim(), ubicacion: modal.ubicacion ?? '',
      profundidadM: num(modal.profundidadM), numPanos: num(modal.numPanos), numAnillos: num(modal.numAnillos),
      dimensiones: modal.dimensiones ?? '', concreto: modal.concreto ?? '', observaciones: modal.observaciones ?? '',
    }
    if (modal.id) upd(modal.id, base)
    else persistir([...lista, { id: uid(), panosCompletos: 0, anillosCompletos: 0, verticalidadOk: false, ...base }])
    setModal(null)
  }
  const eliminar = (id: string) => persistir(lista.filter((c) => c.id !== id))
  function setPanos(c: Calzadura, delta: number) {
    const v = Math.max(0, Math.min(c.numPanos || 0, c.panosCompletos + delta))
    upd(c.id, { panosCompletos: v })
  }
  function setAnillos(c: Calzadura, delta: number) {
    const v = Math.max(0, Math.min(c.numAnillos || 0, (c.anillosCompletos || 0) + delta))
    upd(c.id, { anillosCompletos: v })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando calzaduras...</span>
    </div>
  )

  const avanceGlobal = lista.length ? Math.round(lista.reduce((s, c) => s + avanceDe(c), 0) / lista.length) : 0
  const vertOk = lista.filter((c) => c.verticalidadOk).length

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Calzaduras</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{lista.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Avance global</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${avanceGlobal >= 66 ? 'text-emerald-600' : avanceGlobal >= 33 ? 'text-blue-600' : 'text-amber-600'}`}>{avanceGlobal}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Verticalidad OK</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${vertOk === lista.length && lista.length ? 'text-emerald-600' : 'text-amber-600'}`}>{vertOk}/{lista.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Calzaduras (sostenimiento de vecinos)</p>
          <p className="text-xs text-slate-400 mt-0.5">Paños alternados en anillos descendentes — controla verticalidad y avance (RNE E.050).</p>
        </div>
        <button onClick={() => setModal({ concreto: "Ciclópeo f'c=100 + 30% PM" })} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Calzadura
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <Layers className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay calzaduras</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele al <b>Asistente C4</b> que las arme según tus vecinos y la profundidad de sótanos, o agrégalas tú.
            Cada calzadura lleva sus paños, anillos y control de verticalidad.
          </p>
          <button onClick={() => setModal({ concreto: "Ciclópeo f'c=100 + 30% PM" })} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar calzadura
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => {
            const pct = avanceDe(c)
            const est = estadoEtapaInfo(pct)
            return (
              <div key={c.id} className={`bg-white rounded-2xl border ${est.border} overflow-hidden`}>
                <div className={`flex items-start justify-between gap-3 px-5 py-3.5 ${est.bg} border-b border-slate-100`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                      <p className="text-sm font-bold text-slate-800">{c.sector}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${est.bg} ${est.text} border ${est.border}`}>{est.label}</span>
                    </div>
                    {c.ubicacion && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {c.ubicacion}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => upd(c.id, { verticalidadOk: !c.verticalidadOk })}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${c.verticalidadOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}
                    >
                      {c.verticalidadOk ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {c.verticalidadOk ? 'Verticalidad OK' : 'Verticalidad por revisar'}
                    </button>
                    <button onClick={() => setModal(c)} title="Editar" className="text-slate-300 hover:text-slate-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => eliminar(c.id)} title="Eliminar" className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="px-5 py-4">
                  {/* Avance por paños */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setPanos(c, -1)} disabled={c.panosCompletos <= 0} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold text-slate-800 tabular-nums w-16 text-center">{c.panosCompletos}/{c.numPanos || 0}</span>
                      <button onClick={() => setPanos(c, 1)} disabled={c.panosCompletos >= (c.numPanos || 0)} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                      <span className="text-[11px] text-slate-400 ml-1">paños</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${est.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-bold text-slate-700 tabular-nums w-10 text-right">{pct}%</span>
                  </div>

                  {/* Avance por anillos descendentes */}
                  {(c.numAnillos || 0) > 0 && (
                    <div className="flex items-center gap-1.5 mb-3">
                      <button onClick={() => setAnillos(c, -1)} disabled={(c.anillosCompletos || 0) <= 0} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                      <span className="text-sm font-bold text-slate-800 tabular-nums w-16 text-center">{c.anillosCompletos || 0}/{c.numAnillos}</span>
                      <button onClick={() => setAnillos(c, 1)} disabled={(c.anillosCompletos || 0) >= (c.numAnillos || 0)} className="w-6 h-6 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                      <span className="text-[11px] text-slate-400 ml-1">anillos descendentes ejecutados</span>
                    </div>
                  )}

                  {/* Mini-stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Profundidad', value: c.profundidadM ? `${c.profundidadM} m` : '—' },
                      { label: 'Dimensiones', value: c.dimensiones || '—' },
                      { label: 'Concreto', value: c.concreto || '—' },
                    ].map((s) => (
                      <div key={s.label} className="bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={s.value}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {c.observaciones && (
                    <p className="text-[11px] text-slate-500 mt-2.5 flex items-start gap-1.5">
                      <Ruler className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" /> {c.observaciones}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal agregar/editar */}
      <AppDialog open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar calzadura' : 'Nueva calzadura'} wide>
        {modal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sector</label>
                <input className={inputCls} autoFocus value={modal.sector ?? ''} onChange={(e) => setModal({ ...modal, sector: e.target.value })} placeholder="Ej: Sector A — vecino izquierda" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación / vecino</label>
                <input className={inputCls} value={modal.ubicacion ?? ''} onChange={(e) => setModal({ ...modal, ubicacion: e.target.value })} placeholder="Ej: lindero izquierdo (Jr. Unión 123)" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Profundidad (m)</label>
                <input type="number" step="0.1" className={inputCls} value={modal.profundidadM ?? ''} onChange={(e) => setModal({ ...modal, profundidadM: e.target.value as any })} placeholder="5.0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">N° de paños</label>
                <input type="number" className={inputCls} value={modal.numPanos ?? ''} onChange={(e) => setModal({ ...modal, numPanos: e.target.value as any })} placeholder="12" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">N° de anillos</label>
                <input type="number" className={inputCls} value={modal.numAnillos ?? ''} onChange={(e) => setModal({ ...modal, numAnillos: e.target.value as any })} placeholder="4" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dimensiones del paño</label>
                <input className={inputCls} value={modal.dimensiones ?? ''} onChange={(e) => setModal({ ...modal, dimensiones: e.target.value })} placeholder="0.60 × 1.50 m" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Concreto</label>
                <input className={inputCls} value={modal.concreto ?? ''} onChange={(e) => setModal({ ...modal, concreto: e.target.value })} placeholder="Ciclópeo f'c=100 + 30% PM" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
              <textarea className={inputCls} rows={2} value={modal.observaciones ?? ''} onChange={(e) => setModal({ ...modal, observaciones: e.target.value })} placeholder="Secuencia de paños alternados, control topográfico, incidencias..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={!modal.sector?.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {modal.id ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
