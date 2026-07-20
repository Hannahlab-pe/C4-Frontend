import { useCallback, useEffect, useState } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'
import api from '../lib/api'
import InfoTip from './InfoTip'

interface Res {
  precio_maximo_usd: number
  alcanzable: boolean
  tir_objetivo: number
  tir_max_posible?: number
}

const usdFull = (n?: number) => (n == null ? '—' : `$${Math.round(n).toLocaleString('es-PE')}`)

export default function PrecioMaximoTerreno({ proyectoId, precioActual }: { proyectoId: string; precioActual?: number }) {
  const [tirObj, setTirObj] = useState(18)
  const [res, setRes] = useState<Res | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const calcular = useCallback(async (obj: number) => {
    setLoading(true); setError(null)
    const inicio = Date.now()
    try {
      const { data } = await api.post(`/analisis/${proyectoId}/precio-maximo`, { tir_objetivo: obj })
      const dt = Date.now() - inicio
      if (dt < 500) await new Promise((r) => setTimeout(r, 500 - dt))
      setRes(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo calcular. Verifica que el motor esté activo.')
    } finally { setLoading(false) }
  }, [proyectoId])

  useEffect(() => { calcular(18) }, [calcular])

  const max = res?.precio_maximo_usd ?? 0
  const alcanzable = res?.alcanzable
  const margen = precioActual != null && alcanzable ? max - precioActual : null

  return (
    <div className="relative overflow-hidden c4-hero-bp rounded-2xl border border-[#1b2740] text-slate-100 p-6">
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-blue-300/80">Precio máximo de terreno</p>
        <InfoTip title="¿Cómo se calcula?">
          <p>Trabaja <b className="text-slate-700">hacia atrás</b>: fijas tu TIR objetivo y el motor despeja cuánto MÁXIMO puedes pagar por el terreno y aún alcanzarla.</p>
          <p>Es el <b className="text-slate-700">valor residual</b> — tu techo para negociar. Si el dueño pide más que esto, el proyecto no da tu retorno.</p>
        </InfoTip>
      </div>
      <p className="text-xs text-slate-400 mb-4">Cuánto puedes pagar por el terreno y aún ganar tu retorno objetivo.</p>

      {/* Control: TIR objetivo */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs text-slate-400">TIR objetivo</span>
        <input
          type="number" value={tirObj} min={5} max={40}
          onChange={(e) => setTirObj(Math.min(40, Math.max(5, +e.target.value || 0)))}
          className="w-16 bg-white/[0.07] border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-center tabular-nums outline-none focus:border-blue-400/50"
        />
        <span className="text-xs text-slate-400">%</span>
        <button
          onClick={() => calcular(tirObj)} disabled={loading}
          className="ml-1 bg-white text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-slate-100 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />} Calcular
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}

      {res && !error && (
        alcanzable ? (
          <>
            <div className="flex items-end gap-3 flex-wrap">
              <div className="font-display text-[44px] font-extrabold leading-none tabular-nums">{usdFull(max)}</div>
              <div className="mb-1.5 text-xs text-slate-400">máximo · para TIR {res.tir_objetivo}%</div>
            </div>
            {precioActual != null && (
              <div className="mt-4 pt-4 border-t border-white/10 text-sm">
                <span className="text-slate-400">Pagas hoy </span><b className="text-slate-100">{usdFull(precioActual)}</b>
                {margen != null && (margen >= 0
                  ? <span className="ml-2 text-emerald-300 font-semibold">→ tienes margen: hasta {usdFull(margen)} más</span>
                  : <span className="ml-2 text-red-300 font-semibold">→ pagas {usdFull(-margen)} de más para esa TIR</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div>
            <p className="font-display text-xl font-bold text-amber-300">Ni con terreno gratis alcanzas {res.tir_objetivo}%</p>
            <p className="text-sm text-slate-400 mt-1">
              La TIR máxima posible es <b className="text-slate-200">{res.tir_max_posible}%</b>. Sube el precio de venta o baja el costo de construcción para llegar a tu objetivo.
            </p>
          </div>
        )
      )}

      {loading && !res && (
        <div className="flex items-center gap-2 text-slate-400 py-6"><Loader2 className="w-5 h-5 animate-spin" /> <span className="text-sm">Calculando…</span></div>
      )}
    </div>
  )
}
