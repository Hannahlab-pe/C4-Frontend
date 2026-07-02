import { useEffect, useRef, useState } from 'react'
import { Building2, Plus, Trash2, Loader2, Check } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

type Estado = 'pendiente' | 'proceso' | 'completado'
interface Piso { id: string; nivel: string; verticales: Estado; encofrado: Estado; instalaciones: Estado; losa: Estado }

const uid = () => Math.random().toString(36).slice(2, 10)
const COLS = [
  { key: 'verticales', label: 'Verticales', sub: 'Columnas y placas' },
  { key: 'encofrado', label: 'Encofrado', sub: 'Fondo de losa y vigas' },
  { key: 'instalaciones', label: 'Instalaciones', sub: 'Sanit. / eléctr. embebidas' },
  { key: 'losa', label: 'Vaciado losa', sub: 'Vaciado y curado' },
] as const
const SIG: Record<Estado, Estado> = { pendiente: 'proceso', proceso: 'completado', completado: 'pendiente' }
const VAL: Record<Estado, number> = { pendiente: 0, proceso: 0.5, completado: 1 }

export default function CicloPisoFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'ciclo_piso'

  const [pisos, setPisos] = useState<Piso[]>([])
  const [loading, setLoading] = useState(true)
  const [genN, setGenN] = useState('')
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const a = Array.isArray(d?.datos?.pisos) ? d.datos.pisos : []; lastSaved.current = JSON.stringify(a); setPisos(a) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:ciclo-updated', onUpd)
    return () => window.removeEventListener('c4:ciclo-updated', onUpd)
  }, [proyectoId])

  function persistir(next: Piso[]) {
    setPisos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { pisos: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 400)
  }

  const nuevoPiso = (nivel: string): Piso => ({ id: uid(), nivel, verticales: 'pendiente', encofrado: 'pendiente', instalaciones: 'pendiente', losa: 'pendiente' })
  function addPiso() {
    const n = pisos.length + 1
    persistir([nuevoPiso(`Piso ${n}`), ...pisos])
  }
  function generar() {
    const n = Number(genN)
    if (!Number.isFinite(n) || n <= 0) return
    const arr: Piso[] = []
    for (let i = Math.min(n, 60); i >= 1; i--) arr.push(nuevoPiso(`Piso ${i}`))
    persistir(arr); setGenN('')
  }
  const cycle = (id: string, col: string) =>
    persistir(pisos.map((p) => p.id === id ? { ...p, [col]: SIG[(p as any)[col] as Estado] } : p))
  const setNivel = (id: string, nivel: string) => persistir(pisos.map((p) => p.id === id ? { ...p, nivel } : p))
  const delPiso = (id: string) => persistir(pisos.filter((p) => p.id !== id))

  const avancePiso = (p: Piso) => Math.round(((VAL[p.verticales] + VAL[p.encofrado] + VAL[p.instalaciones] + VAL[p.losa]) / 4) * 100)

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando ciclo de piso...</span>
    </div>
  )

  const global = pisos.length ? Math.round(pisos.reduce((s, p) => s + avancePiso(p), 0) / pisos.length) : 0
  const completos = pisos.filter((p) => avancePiso(p) === 100).length
  const enEjec = pisos.find((p) => { const a = avancePiso(p); return a > 0 && a < 100 })

  const cellCls = (e: Estado) =>
    e === 'completado' ? 'bg-emerald-500 text-white border-emerald-500'
      : e === 'proceso' ? 'bg-blue-500 text-white border-blue-500'
        : 'bg-white text-slate-300 border-slate-200 hover:border-slate-300'

  return (
    <div className="max-w-4xl space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pisos', value: String(pisos.length) },
          { label: 'Avance del casco', value: `${global}%`, color: global >= 66 ? 'text-emerald-600' : global >= 33 ? 'text-blue-600' : 'text-amber-600' },
          { label: 'Pisos terminados', value: `${completos}/${pisos.length}` },
          { label: 'En ejecución', value: enEjec?.nivel ?? '—' },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">{k.label}</p>
            <p className={`text-xl font-black tabular-nums leading-tight truncate ${k.color ?? 'text-slate-900'}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-slate-700">Ciclo de piso</p>
          <p className="text-xs text-slate-400 mt-0.5">Toca cada celda para avanzar: pendiente → en proceso → completado.</p>
        </div>
        <div className="flex items-center gap-2">
          {pisos.length === 0 && (
            <div className="flex items-center gap-1.5">
              <input type="number" value={genN} onChange={(e) => setGenN(e.target.value)} placeholder="N° pisos" className="w-24 text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
              <button onClick={generar} className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors">Generar</button>
            </div>
          )}
          <button onClick={addPiso} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Piso
          </button>
        </div>
      </div>

      {pisos.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <Building2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay pisos</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Genera los pisos del proyecto (o pídeselo a la IA) y controla el ciclo de cada uno: verticales → encofrado → instalaciones → vaciado de losa.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Cabecera de columnas */}
          <div className="hidden sm:flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
            <div className="w-24 shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nivel</div>
            {COLS.map((c) => (
              <div key={c.key} className="flex-1 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{c.label}</p>
                <p className="text-[9px] text-slate-400">{c.sub}</p>
              </div>
            ))}
            <div className="w-28 shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Avance</div>
            <div className="w-6 shrink-0" />
          </div>

          <div className="divide-y divide-slate-50">
            {pisos.map((p) => {
              const a = avancePiso(p)
              return (
                <div key={p.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/40 transition-colors group">
                  <input
                    value={p.nivel} onChange={(e) => setNivel(p.id, e.target.value)}
                    className="w-24 shrink-0 text-sm font-semibold text-slate-800 border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-lg px-2 py-1 outline-none transition-colors"
                  />
                  {COLS.map((c) => {
                    const e = (p as any)[c.key] as Estado
                    return (
                      <div key={c.key} className="flex-1 flex justify-center">
                        <button
                          onClick={() => cycle(p.id, c.key)}
                          title={`${c.label}: ${e}`}
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${cellCls(e)}`}
                        >
                          {e === 'completado' ? <Check className="w-4 h-4" /> : e === 'proceso' ? <span className="w-2 h-2 rounded-full bg-white" /> : null}
                        </button>
                      </div>
                    )
                  })}
                  <div className="w-28 shrink-0 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${a === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${a}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 tabular-nums w-8 text-right">{a}%</span>
                  </div>
                  <button onClick={() => delPiso(p.id)} className="w-6 shrink-0 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-slate-200 bg-white" /> Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> En proceso</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Completado</span>
      </div>
    </div>
  )
}
