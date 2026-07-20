import { useCallback, useEffect, useState } from 'react'
import { Loader2, ArrowRight, TrendingUp, Clock, Landmark, Boxes } from 'lucide-react'
import api from '../lib/api'
import InfoTip from './InfoTip'

interface Fin {
  meses_construccion: number
  meses_proyecto: number
  costo_construccion_usd: number
  costo_financiamiento_usd: number
  costo_total_usd: number
  utilidad_neta_usd: number
  margen_neto_pct: number
  tir_anual_pct: number
}
interface Resultado {
  tradicional: Fin
  prefabricado: Fin
  supuestos: { pct_mas_rapido: number; delta_costo_pct: number }
}

const usd = (n?: number) =>
  n == null ? '—' : Math.abs(n) >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`

export default function ComparadorSistema({ proyectoId }: { proyectoId: string }) {
  const [pctRapido, setPctRapido] = useState(25)
  const [deltaCosto, setDeltaCosto] = useState(0)
  const [res, setRes] = useState<Resultado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const comparar = useCallback(async (pr: number, dc: number) => {
    setLoading(true); setError(null)
    const inicio = Date.now()
    try {
      const { data } = await api.post(`/analisis/${proyectoId}/comparar`, { pct_mas_rapido: pr, delta_costo_pct: dc })
      const dt = Date.now() - inicio
      if (dt < 500) await new Promise((r) => setTimeout(r, 500 - dt))
      setRes(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo comparar. Verifica que el motor de cálculo esté activo.')
    } finally { setLoading(false) }
  }, [proyectoId])

  useEffect(() => { comparar(25, 0) }, [comparar])

  const t = res?.tradicional
  const p = res?.prefabricado
  const dMeses = t && p ? t.meses_construccion - p.meses_construccion : 0
  const dTir   = t && p ? +(p.tir_anual_pct - t.tir_anual_pct).toFixed(1) : 0
  const dFin   = t && p ? t.costo_financiamiento_usd - p.costo_financiamiento_usd : 0
  const dUtil  = t && p ? p.utilidad_neta_usd - t.utilidad_neta_usd : 0

  // fila de tabla con delta (verde si favorable)
  const filas: { label: string; trad: string; pref: string; delta?: number; menorEsMejor: boolean }[] = t && p ? [
    { label: 'Meses de obra',            trad: `${t.meses_construccion} m`, pref: `${p.meses_construccion} m`, delta: p.meses_construccion - t.meses_construccion, menorEsMejor: true },
    { label: 'Costo de construcción',    trad: usd(t.costo_construccion_usd), pref: usd(p.costo_construccion_usd), delta: p.costo_construccion_usd - t.costo_construccion_usd, menorEsMejor: true },
    { label: 'Costo financiero (intereses)', trad: usd(t.costo_financiamiento_usd), pref: usd(p.costo_financiamiento_usd), delta: p.costo_financiamiento_usd - t.costo_financiamiento_usd, menorEsMejor: true },
    { label: 'Costo total',              trad: usd(t.costo_total_usd), pref: usd(p.costo_total_usd), delta: p.costo_total_usd - t.costo_total_usd, menorEsMejor: true },
    { label: 'Utilidad neta',            trad: usd(t.utilidad_neta_usd), pref: usd(p.utilidad_neta_usd), delta: p.utilidad_neta_usd - t.utilidad_neta_usd, menorEsMejor: false },
    { label: 'Margen neto',              trad: `${t.margen_neto_pct}%`, pref: `${p.margen_neto_pct}%`, delta: +(p.margen_neto_pct - t.margen_neto_pct).toFixed(1), menorEsMejor: false },
  ] : []

  return (
    <div className="space-y-4">

      {/* Supuestos */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Boxes className="w-[18px] h-[18px] text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-display text-base font-bold text-slate-900">Prelosa Betondecken vs. tradicional</h3>
              <InfoTip title="¿Cómo se compara?">
                <p>Corremos el motor financiero <b className="text-slate-700">dos veces</b> con la misma cabida.</p>
                <p>El prefabricado <b className="text-slate-700">acorta la obra</b> (menos encofrado, ciclos más rápidos) según el % que indiques. Menos meses = menos intereses del banco y ventas más tempranas → por eso la TIR sube.</p>
                <p>El <b className="text-slate-700">Δ costo</b> ajusta el precio/m² del sistema. Los supuestos los defines tú, con datos reales de Betondecken.</p>
              </InfoTip>
            </div>
            <p className="text-xs text-slate-500">Cuánto cambia tu retorno al construir con prefabricado.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prefab más rápido</label>
            <div className="flex items-center gap-1.5">
              <input type="number" value={pctRapido} min={0} max={50}
                onChange={(e) => setPctRapido(Math.min(50, Math.max(0, +e.target.value || 0)))}
                className="w-20 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 tabular-nums" />
              <span className="text-sm text-slate-400">% menos obra</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Δ costo construcción</label>
            <div className="flex items-center gap-1.5">
              <input type="number" value={deltaCosto} min={-30} max={30}
                onChange={(e) => setDeltaCosto(Math.min(30, Math.max(-30, +e.target.value || 0)))}
                className="w-20 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 tabular-nums" />
              <span className="text-sm text-slate-400">% (0 = igual)</span>
            </div>
          </div>
          <button
            onClick={() => comparar(pctRapido, deltaCosto)} disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Actualizar
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Ajusta con los datos reales de Betondecken. Default: 25% más rápido, costo igual.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {t && p && !error && (
        <>
          {/* Titular: el impacto en TIR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Con prelosa Betondecken</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1">TIR anual</p>
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-2xl font-bold text-slate-400 tabular-nums">{t.tir_anual_pct}%</span>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                  <span className={`font-display text-4xl font-extrabold tabular-nums ${dTir >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{p.tir_anual_pct}%</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${dTir >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {dTir >= 0 ? '+' : ''}{dTir} pts
                  </span>
                </div>
              </div>

              <Stat icon={Clock}    label="Obra"          value={`${dMeses >= 0 ? '−' : '+'}${Math.abs(dMeses)} meses`} good={dMeses >= 0} />
              <Stat icon={Landmark} label="Financiamiento" value={`${dFin >= 0 ? '−' : '+'}${usd(Math.abs(dFin))}`} good={dFin >= 0} />
              <Stat icon={TrendingUp} label="Utilidad neta" value={`${dUtil >= 0 ? '+' : '−'}${usd(Math.abs(dUtil))}`} good={dUtil >= 0} />
            </div>

            {dMeses > 0 && (
              <p className="text-sm text-slate-500 mt-5 pt-4 border-t border-slate-100">
                Terminar <b className="text-slate-700">{dMeses} {dMeses === 1 ? 'mes' : 'meses'} antes</b> reduce el costo financiero y adelanta las ventas —
                por eso la TIR {dTir >= 0 ? 'sube' : 'cambia'} de {t.tir_anual_pct}% a <b className="text-slate-700">{p.tir_anual_pct}%</b>.
              </p>
            )}
          </div>

          {/* Tabla comparativa */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Indicador</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Tradicional</th>
                    <th className="px-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-blue-600">Prelosa Betondecken</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((r) => {
                    const favorable = r.delta == null ? null : (r.menorEsMejor ? r.delta < 0 : r.delta > 0)
                    const neutro = r.delta === 0
                    return (
                      <tr key={r.label} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3 text-slate-600">{r.label}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-500">{r.trad}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="tabular-nums font-semibold text-slate-900">{r.pref}</span>
                          {r.delta != null && !neutro && (
                            <span className={`ml-2 text-[11px] font-bold ${favorable ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {r.delta > 0 ? '▲' : '▼'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            Estimación del motor C4. El prefabricado acorta la obra (menos encofrado y ciclos más rápidos); el impacto en TIR viene
            de menor costo financiero y ventas más tempranas. Verifica los supuestos con Betondecken.
          </p>
        </>
      )}

      {loading && !res && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Comparando sistemas…</span>
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value, good }: { icon: any; label: string; value: string; good: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</p>
      <p className={`font-display text-lg font-bold tabular-nums ${good ? 'text-emerald-600' : 'text-amber-600'}`}>{value}</p>
    </div>
  )
}
