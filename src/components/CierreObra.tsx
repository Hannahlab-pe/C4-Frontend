import { useMemo } from 'react'
import { Flag, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { CabidaMin, FinancieroMin } from '../lib/cronograma'
import { generarCronograma } from '../lib/cronograma'

export interface CierreData {
  costoFinalUsd?: number
  plazoRealSemanas?: number
  unidadesVendidas?: number
  utilidadRealUsd?: number
  tirReal?: number
  notas?: string
}

const num = (n: number, d = 0) => n.toLocaleString('es-PE', { maximumFractionDigits: d })

interface Fila {
  key: keyof CierreData
  label: string
  proyectado: number
  unidad: string
  mejorAlza: boolean   // true: más alto es mejor (utilidad, ventas, TIR); false: más bajo es mejor (costo, plazo)
}

export default function CierreObra({ cabida, financiero, value, onChange }: {
  cabida: CabidaMin; financiero: FinancieroMin; value: CierreData; onChange: (v: CierreData) => void
}) {
  const v = value ?? {}
  const plazoProy = useMemo(() => generarCronograma(cabida, financiero).total, [cabida, financiero])

  const filas: Fila[] = [
    { key: 'costoFinalUsd',    label: 'Costo total (USD)',     proyectado: financiero.costo_total_usd ?? 0,   unidad: 'usd',  mejorAlza: false },
    { key: 'plazoRealSemanas', label: 'Plazo (semanas)',       proyectado: plazoProy,                          unidad: 'sem',  mejorAlza: false },
    { key: 'unidadesVendidas', label: 'Unidades vendidas',     proyectado: cabida.num_departamentos ?? 0,      unidad: 'u',    mejorAlza: true  },
    { key: 'utilidadRealUsd',  label: 'Utilidad neta (USD)',   proyectado: financiero.utilidad_neta_usd ?? 0,  unidad: 'usd',  mejorAlza: true  },
    { key: 'tirReal',          label: 'TIR anual (%)',         proyectado: financiero.tir_anual_pct ?? 0,      unidad: 'pct',  mejorAlza: true  },
  ]

  const fmt = (n: number, u: string) =>
    u === 'usd' ? `$${num(n)}` : u === 'pct' ? `${num(n, 1)}%` : num(n)

  // Veredicto según utilidad real vs proyectada
  const utilReal = v.utilidadRealUsd
  const utilProy = financiero.utilidad_neta_usd ?? 0
  const hayCierre = utilReal != null && utilReal > 0
  const desvUtil = hayCierre && utilProy > 0 ? ((utilReal! - utilProy) / utilProy) * 100 : 0

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Veredicto */}
      {hayCierre && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-semibold ${
          desvUtil >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {desvUtil >= 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          Cierre: utilidad real {desvUtil >= 0 ? 'superó' : 'quedó bajo'} lo proyectado en {Math.abs(desvUtil).toFixed(1)}%
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
          <Flag className="w-4 h-4 text-amber-500" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cierre de obra — Real vs Proyectado</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-slate-400 border-b border-slate-100">
              <th className="text-left font-medium px-5 py-2">Métrica</th>
              <th className="text-right font-medium px-3 py-2">Proyectado</th>
              <th className="text-right font-medium px-3 py-2 w-40">Real</th>
              <th className="text-right font-medium px-5 py-2">Desviación</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const real = v[f.key] as number | undefined
              const tieneReal = real != null && !Number.isNaN(real)
              const desv = tieneReal && f.proyectado > 0 ? ((real! - f.proyectado) / f.proyectado) * 100 : null
              const bueno = desv == null ? false : f.mejorAlza ? desv >= 0 : desv <= 0
              return (
                <tr key={String(f.key)} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-2.5 text-slate-600">{f.label}</td>
                  <td className="px-3 py-2.5 text-right text-slate-500">{fmt(f.proyectado, f.unidad)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <input
                      type="number" value={tieneReal ? real : ''}
                      onChange={(e) => onChange({ ...v, [f.key]: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="—"
                      className="w-32 text-right text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                  </td>
                  <td className={`px-5 py-2.5 text-right font-semibold ${desv == null ? 'text-slate-300' : bueno ? 'text-emerald-600' : 'text-red-600'}`}>
                    {desv == null ? '—' : `${desv >= 0 ? '+' : ''}${desv.toFixed(1)}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Notas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <label className="block text-[11px] font-medium text-slate-500 mb-1.5">Notas de cierre</label>
        <textarea
          value={v.notas ?? ''}
          onChange={(e) => onChange({ ...v, notas: e.target.value })}
          placeholder="Lecciones aprendidas, causas de desviaciones, observaciones finales del proyecto…"
          rows={3}
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-none"
        />
      </div>

      <p className="text-[11px] text-slate-400">Los cambios se guardan automáticamente. La desviación compara el resultado real contra lo proyectado en la pre-inversión.</p>
    </div>
  )
}
