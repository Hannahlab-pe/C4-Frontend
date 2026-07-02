import { useEffect, useRef, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import {
  TestTube2, Plus, Trash2, Loader2, Pencil, CheckCircle2, AlertTriangle, Clock, X, FlaskConical,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from './AppDialog'

interface Probeta { id: string; edad: number; resistencia: number }
interface Vaciado {
  id: string; elemento: string; piso: string; volumenM3: number
  fcDiseno: number; slump: string; fecha: string; proveedor: string; probetas: Probeta[]
}
const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const mean = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
const FC_OPC = [175, 210, 245, 280, 350]
const EDAD_OPC = [3, 7, 14, 28]
const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1']

function evalVaciado(v: Vaciado) {
  const p28 = v.probetas.filter((p) => p.edad >= 28).map((p) => p.resistencia)
  if (p28.length) {
    const avg = mean(p28)
    return avg >= v.fcDiseno
      ? { txt: 'Cumple', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 }
      : { txt: "Bajo f'c", cls: 'bg-red-50 text-red-700 border-red-200', Icon: AlertTriangle }
  }
  if (v.probetas.length) return { txt: 'En curado', cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: Clock }
  return { txt: 'Sin probetas', cls: 'bg-slate-100 text-slate-500 border-slate-200', Icon: TestTube2 }
}

export default function ControlConcretoFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'control_concreto'

  const [vaciados, setVaciados] = useState<Vaciado[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Vaciado> | null>(null)
  const [probDe, setProbDe] = useState<string | null>(null)
  const [nuevaProb, setNuevaProb] = useState<{ edad: number; resistencia: string }>({ edad: 28, resistencia: '' })
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const a = Array.isArray(d?.datos?.vaciados) ? d.datos.vaciados : []; lastSaved.current = JSON.stringify(a); setVaciados(a) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:concreto-updated', onUpd)
    return () => window.removeEventListener('c4:concreto-updated', onUpd)
  }, [proyectoId])

  function persistir(next: Vaciado[]) {
    setVaciados(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { vaciados: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }

  function guardar() {
    if (!modal?.elemento?.trim()) return
    const base = {
      elemento: modal.elemento.trim(), piso: String(modal.piso ?? ''), volumenM3: num(modal.volumenM3),
      fcDiseno: num(modal.fcDiseno) || 210, slump: modal.slump ?? '', fecha: modal.fecha ?? hoy(), proveedor: modal.proveedor ?? '',
    }
    if (modal.id) persistir(vaciados.map((v) => v.id === modal.id ? { ...v, ...base } : v))
    else persistir([...vaciados, { id: uid(), probetas: [], ...base }])
    setModal(null)
  }
  const eliminar = (id: string) => persistir(vaciados.filter((v) => v.id !== id))
  function addProbeta(id: string) {
    if (nuevaProb.resistencia === '') return
    persistir(vaciados.map((v) => v.id === id
      ? { ...v, probetas: [...v.probetas, { id: uid(), edad: nuevaProb.edad, resistencia: num(nuevaProb.resistencia) }].sort((a, b) => a.edad - b.edad) }
      : v))
    setNuevaProb({ edad: 28, resistencia: '' }); setProbDe(null)
  }
  const delProbeta = (vid: string, pid: string) =>
    persistir(vaciados.map((v) => v.id === vid ? { ...v, probetas: v.probetas.filter((p) => p.id !== pid) } : v))

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando control de concreto...</span>
    </div>
  )

  const volTotal = vaciados.reduce((s, v) => s + num(v.volumenM3), 0)
  const totProbetas = vaciados.reduce((s, v) => s + v.probetas.length, 0)
  const con28 = vaciados.filter((v) => v.probetas.some((p) => p.edad >= 28))
  const cumplen = con28.filter((v) => mean(v.probetas.filter((p) => p.edad >= 28).map((p) => p.resistencia)) >= v.fcDiseno).length
  const cumplimiento = con28.length ? Math.round((cumplen / con28.length) * 100) : 0

  // Datos del gráfico: % del f'c alcanzado por edad (normaliza distintos f'c en una sola curva)
  const conProbetas = vaciados.filter((v) => v.probetas.length > 0)
  const chartData = [7, 14, 28].map((ed) => {
    const row: any = { edad: `${ed} días` }
    conProbetas.forEach((v) => {
      const ps = v.probetas.filter((p) => p.edad === ed).map((p) => p.resistencia)
      if (ps.length && v.fcDiseno) row[v.id] = Math.round((mean(ps) / v.fcDiseno) * 100)
    })
    return row
  })

  return (
    <div className="max-w-4xl space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Vaciados', value: String(vaciados.length) },
          { label: 'Concreto', value: `${volTotal.toLocaleString('es-PE', { maximumFractionDigits: 1 })} m³` },
          { label: 'Probetas', value: String(totProbetas) },
          { label: 'Cumplimiento (28d)', value: `${cumplimiento}%`, color: cumplimiento >= 100 ? 'text-emerald-600' : con28.length ? 'text-red-600' : 'text-slate-900' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">{k.label}</p>
            <p className={`text-2xl font-black tabular-nums leading-none ${k.color ?? 'text-slate-900'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Gráfico de resistencia (curva de maduración, % del f'c) */}
      {conProbetas.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Curva de resistencia (% del f'c por edad)</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="edad" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} domain={[0, 'dataMax + 10']} width={42} />
              <Tooltip formatter={(v) => `${v}% del f'c`} />
              <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 4" label={{ value: "f'c (100%)", position: 'right', fontSize: 10, fill: '#10b981' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {conProbetas.map((v, i) => (
                <Line key={v.id} type="monotone" dataKey={v.id} name={`${v.elemento}${v.piso ? ` P${v.piso}` : ''}`} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[11px] text-slate-400 mt-2">Referencia: ~65% a 7 días, ~90% a 14 días, ≥100% a 28 días. Por debajo de la línea verde a 28 días = resistencia insuficiente.</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Vaciados y control de probetas</p>
          <p className="text-xs text-slate-400 mt-0.5">Registra cada vaciado y rompe probetas a 7 / 14 / 28 días (NTP 339.034).</p>
        </div>
        <button onClick={() => setModal({ fcDiseno: 210, fecha: hoy() })} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Vaciado
        </button>
      </div>

      {vaciados.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <TestTube2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay vaciados</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele a la IA que arme el plan de vaciados (una losa por piso, etc.) o agrégalos tú. Cada vaciado lleva su f'c y sus probetas.
          </p>
          <button onClick={() => setModal({ fcDiseno: 210, fecha: hoy() })} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar vaciado
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {vaciados.map((v) => {
            const est = evalVaciado(v)
            return (
              <div key={v.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{v.elemento}</p>
                      {v.piso && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Piso {v.piso}</span>}
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border flex items-center gap-1 ${est.cls}`}><est.Icon className="w-3 h-3" />{est.txt}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      f'c={v.fcDiseno} kg/cm² · {v.volumenM3 || 0} m³{v.slump ? ` · slump ${v.slump}` : ''}{v.proveedor ? ` · ${v.proveedor}` : ''}{v.fecha ? ` · ${v.fecha}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setProbDe(v.id); setNuevaProb({ edad: 28, resistencia: '' }) }} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium px-2 py-1"><Plus className="w-3 h-3" /> Probeta</button>
                    <button onClick={() => setModal(v)} className="text-slate-300 hover:text-slate-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => eliminar(v.id)} className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="px-5 py-3">
                  {probDe === v.id && (
                    <div className="flex items-center gap-2 mb-2">
                      <select value={nuevaProb.edad} onChange={(e) => setNuevaProb({ ...nuevaProb, edad: num(e.target.value) })} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400">
                        {EDAD_OPC.map((e) => <option key={e} value={e}>{e} días</option>)}
                      </select>
                      <input type="number" autoFocus value={nuevaProb.resistencia} onChange={(e) => setNuevaProb({ ...nuevaProb, resistencia: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') addProbeta(v.id) }} placeholder="kg/cm²" className="w-28 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
                      <button onClick={() => addProbeta(v.id)} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-colors">Guardar</button>
                      <button onClick={() => setProbDe(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {v.probetas.length === 0 ? (
                    <p className="text-[11px] text-slate-300">Sin probetas registradas.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {v.probetas.map((p) => {
                        const bajo = p.edad >= 28 && p.resistencia < v.fcDiseno
                        const pct = v.fcDiseno ? Math.round((p.resistencia / v.fcDiseno) * 100) : 0
                        return (
                          <span key={p.id} className={`group inline-flex items-center gap-1.5 text-[11px] border rounded-lg px-2 py-1 ${bajo ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="text-slate-400">{p.edad}d</span>
                            <b className={bajo ? 'text-red-600' : 'text-slate-800'}>{p.resistencia}</b>
                            <span className="text-slate-400">({pct}%)</span>
                            <button onClick={() => delProbeta(v.id, p.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {est.txt === "Bajo f'c" && (
                    <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> La resistencia a 28 días no alcanza el f'c de diseño — evaluar con el proyectista (ensayos complementarios / esclerómetro / diamantina).</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal vaciado */}
      <AppDialog open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar vaciado' : 'Nuevo vaciado'} wide>
        {modal && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Elemento</label>
                <input className={inputCls} autoFocus value={modal.elemento ?? ''} onChange={(e) => setModal({ ...modal, elemento: e.target.value })} placeholder="Ej: Losa, Columnas y placas, Platea" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Piso / nivel</label>
                <input className={inputCls} value={modal.piso ?? ''} onChange={(e) => setModal({ ...modal, piso: e.target.value })} placeholder="Ej: 3" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Concreto (m³)</label>
                <input type="number" step="0.1" className={inputCls} value={modal.volumenM3 ?? ''} onChange={(e) => setModal({ ...modal, volumenM3: e.target.value as any })} placeholder="28" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">f'c (kg/cm²)</label>
                <select className={inputCls} value={modal.fcDiseno ?? 210} onChange={(e) => setModal({ ...modal, fcDiseno: num(e.target.value) })}>
                  {FC_OPC.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Slump (")</label>
                <input className={inputCls} value={modal.slump ?? ''} onChange={(e) => setModal({ ...modal, slump: e.target.value })} placeholder='3"-4"' />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                <input type="date" className={inputCls} value={modal.fecha ?? ''} onChange={(e) => setModal({ ...modal, fecha: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
                <input className={inputCls} value={modal.proveedor ?? ''} onChange={(e) => setModal({ ...modal, proveedor: e.target.value })} placeholder="UNICON / Mixercon..." />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardar} disabled={!modal.elemento?.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">{modal.id ? 'Guardar' : 'Agregar'}</button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
