import { useMemo } from 'react'
import { Activity, DollarSign, Home } from 'lucide-react'
import type { CabidaMin, FinancieroMin, Fase } from '../lib/cronograma'
import { FASE_COLOR, generarCronograma } from '../lib/cronograma'

export interface AvanceData {
  fases?: Record<string, number>   // % por fase (0-100)
  gastoRealUsd?: number
  deptosVendidos?: number
}

const FASES_FISICAS: Fase[] = ['Pre-obra', 'Cimentación', 'Estructura', 'Acabados', 'Cierre']

const usd = (n: number) => `$${Math.round(n).toLocaleString('es-PE')}`
const clampPct = (n: number) => Math.max(0, Math.min(100, n))

function Kpi({ label, value, color, Icon }: { label: string; value: string; color: string; Icon: any }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Barra({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${clampPct(pct)}%`, backgroundColor: color }} />
    </div>
  )
}

export default function AvanceObra({ cabida, financiero, value, onChange }: {
  cabida: CabidaMin; financiero: FinancieroMin; value: AvanceData; onChange: (v: AvanceData) => void
}) {
  const v = value ?? {}
  const fasesPct = v.fases ?? {}

  // Pesos por fase física (según duración del cronograma)
  const { pesos, totalDur } = useMemo(() => {
    const { tareas } = generarCronograma(cabida, financiero)
    const pesos: Record<string, number> = {}
    tareas.forEach((t) => {
      if (FASES_FISICAS.includes(t.fase)) pesos[t.fase] = (pesos[t.fase] ?? 0) + t.duracion
    })
    const totalDur = Object.values(pesos).reduce((a, b) => a + b, 0) || 1
    return { pesos, totalDur }
  }, [cabida, financiero])

  const fases = FASES_FISICAS.filter((f) => pesos[f])

  // KPIs
  const fisico = fases.reduce((acc, f) => acc + pesos[f] * clampPct(fasesPct[f] ?? 0), 0) / totalDur
  const presupuesto = financiero.costo_total_usd ?? 0
  const financiom = presupuesto > 0 ? ((v.gastoRealUsd ?? 0) / presupuesto) * 100 : 0
  const totalDeptos = cabida.num_departamentos ?? 0
  const comercial = totalDeptos > 0 ? ((v.deptosVendidos ?? 0) / totalDeptos) * 100 : 0

  const setFase = (f: string, pct: number) => onChange({ ...v, fases: { ...fasesPct, [f]: clampPct(pct) } })

  return (
    <div className="space-y-5 max-w-3xl">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Avance físico" value={`${fisico.toFixed(0)}%`} color="text-blue-600" Icon={Activity} />
        <Kpi label="Avance financiero" value={`${financiom.toFixed(0)}%`} color={financiom > 100 ? 'text-red-600' : 'text-amber-600'} Icon={DollarSign} />
        <Kpi label="Avance comercial" value={`${comercial.toFixed(0)}%`} color="text-emerald-600" Icon={Home} />
      </div>

      {/* Avance físico por fase */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Avance físico por fase</p>
        <div className="space-y-4">
          {fases.map((f) => {
            const pct = clampPct(fasesPct[f] ?? 0)
            return (
              <div key={f}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: FASE_COLOR[f as Fase] }} />
                    {f}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={100} value={pct}
                      onChange={(e) => setFase(f, Number(e.target.value))}
                      className="w-16 text-right text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                    <span className="text-xs text-slate-400 w-4">%</span>
                  </div>
                </div>
                <input
                  type="range" min={0} max={100} value={pct}
                  onChange={(e) => setFase(f, Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Avance físico global (ponderado por duración)</span>
          <span className="text-base font-bold text-blue-600">{fisico.toFixed(1)}%</span>
        </div>
      </div>

      {/* Financiero + comercial */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Avance financiero</p>
          <label className="block text-[11px] text-slate-500 mb-1">Gasto real acumulado (USD)</label>
          <input
            type="number" min={0} value={v.gastoRealUsd ?? ''}
            onChange={(e) => onChange({ ...v, gastoRealUsd: Number(e.target.value) })}
            placeholder="0"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <Barra pct={financiom} color={financiom > 100 ? '#ef4444' : '#f59e0b'} />
          <div className="flex justify-between mt-2 text-[11px] text-slate-400">
            <span>Ejecutado: {usd(v.gastoRealUsd ?? 0)}</span>
            <span>Presupuesto: {usd(presupuesto)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Avance comercial</p>
          <label className="block text-[11px] text-slate-500 mb-1">Departamentos vendidos</label>
          <input
            type="number" min={0} max={totalDeptos} value={v.deptosVendidos ?? ''}
            onChange={(e) => onChange({ ...v, deptosVendidos: Number(e.target.value) })}
            placeholder="0"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <Barra pct={comercial} color="#10b981" />
          <div className="flex justify-between mt-2 text-[11px] text-slate-400">
            <span>Vendidos: {v.deptosVendidos ?? 0}</span>
            <span>Total: {totalDeptos} dptos</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">Los cambios se guardan automáticamente. El % físico se pondera por la duración de cada fase del cronograma.</p>
    </div>
  )
}
