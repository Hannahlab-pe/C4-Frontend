import { useEffect, useState } from 'react'
import { MapPin, Sparkles, ArrowUpRight, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

interface Proyecto {
  id: string
  nombre: string
  distrito?: string
  estado?: string
  createdAt: string
}
interface Cabida { pisos_vivienda?: number; num_departamentos?: number; area_vendible_total?: number }
interface Financiero { tir_anual_pct?: number; utilidad_neta_usd?: number; margen_neto_pct?: number; flujo_caja?: any[] }
interface Analisis { cabida?: Cabida; financiero?: Financiero }

const usd = (n?: number) =>
  n == null ? '—' : n >= 1_000_000 ? `US$ ${(n / 1_000_000).toFixed(1)}M` : `US$ ${Math.round(n / 1000)} mil`
const fmtNum = (n?: number) => (n == null ? '—' : n.toLocaleString('es-PE', { maximumFractionDigits: 0 }))
const fmtFecha = (iso?: string) => {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) } catch { return '' }
}
const esAnalizado = (a?: Analisis) => a?.cabida?.num_departamentos != null || a?.financiero?.tir_anual_pct != null

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [analisis, setAnalisis] = useState<Record<string, Analisis>>({})

  useEffect(() => {
    api.get('/proyectos').then(async (r) => {
      const lista: Proyecto[] = r.data
      setProyectos(lista)
      const entradas = await Promise.all(
        lista.map(async (p) => {
          try { const { data } = await api.get(`/chat/${p.id}/analisis`); return [p.id, (data ?? {}) as Analisis] as const }
          catch { return [p.id, {} as Analisis] as const }
        }),
      )
      setAnalisis(Object.fromEntries(entradas))
    }).catch(() => {})
  }, [])

  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fechaCap = fecha.charAt(0).toUpperCase() + fecha.slice(1)

  const analizados = proyectos.filter((p) => esAnalizado(analisis[p.id]))
  const conAnalisis = analizados.length
  const deptosTotal = analizados.reduce((s, p) => s + (analisis[p.id]?.cabida?.num_departamentos ?? 0), 0)
  const areaVendTotal = analizados.reduce((s, p) => s + (analisis[p.id]?.cabida?.area_vendible_total ?? 0), 0)

  const distritosMap = proyectos.reduce<Record<string, number>>((m, p) => {
    const d = p.distrito?.trim()
    if (d) m[d] = (m[d] ?? 0) + 1
    return m
  }, {})
  const distritos = Object.entries(distritosMap).sort((a, b) => b[1] - a[1])
  const maxDist = distritos.length ? distritos[0][1] : 1

  // Proyecto destacado = mayor TIR entre los analizados
  const flagship = analizados.slice().sort(
    (a, b) => (analisis[b.id]?.financiero?.tir_anual_pct ?? 0) - (analisis[a.id]?.financiero?.tir_anual_pct ?? 0),
  )[0]
  const fa = flagship ? analisis[flagship.id] : undefined
  const tir = fa?.financiero?.tir_anual_pct ?? 0
  const tirCfg = tir >= 15
    ? { txt: 'Rango sano ≥ 15%', cls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' }
    : tir >= 12
    ? { txt: 'Ajustado', cls: 'text-amber-300 bg-amber-500/15 border-amber-500/30' }
    : { txt: 'Bajo', cls: 'text-red-300 bg-red-500/15 border-red-500/30' }
  const flujo = fa?.financiero?.flujo_caja ?? []

  const recientes = [...proyectos].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).slice(0, 5)

  return (
    <div className="mx-auto max-w-[1500px]">

      {/* Saludo */}
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-5">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
          Buenas, {user?.nombre ?? 'Ingeniero'}{' '}
        </h1>
        <p className="text-xs font-semibold text-slate-400">{fechaCap}</p>
      </div>

      {/* ── Banda A: hero + KPIs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-stretch">

        {/* Hero blueprint */}
        <div className="relative overflow-hidden c4-hero-bp rounded-[18px] border border-[#1b2740] text-slate-100 p-6 flex flex-col min-h-[280px]">
          {flagship ? (
            <>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-blue-300/80">Análisis destacado</p>
              <p className="font-display text-lg font-semibold mt-2">{flagship.nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{flagship.distrito ?? 'Sin distrito'}</p>

              <div className="flex items-end gap-3 mt-5">
                <div className="font-display text-[54px] font-extrabold leading-[0.9] tracking-tight tabular-nums">
                  {tir.toFixed(1)}<span className="text-2xl font-bold">%</span>
                </div>
                <div className={`mb-2 text-[11px] font-bold px-2.5 py-1 rounded-full border ${tirCfg.cls}`}>TIR · {tirCfg.txt}</div>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-4 text-[12.5px] text-slate-400">
                <span><b className="text-slate-100 font-bold">{fa?.cabida?.pisos_vivienda ?? '—'}</b> pisos</span>
                <span><b className="text-slate-100 font-bold">{fa?.cabida?.num_departamentos ?? '—'}</b> deptos</span>
                <span><b className="text-slate-100 font-bold">{usd(fa?.financiero?.utilidad_neta_usd)}</b> utilidad</span>
                {fa?.financiero?.margen_neto_pct != null && (
                  <span>margen <b className="text-slate-100 font-bold">{fa.financiero.margen_neto_pct.toFixed(1)}%</b></span>
                )}
              </div>

              <div className="mt-auto pt-5">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">Flujo de caja del proyecto</p>
                {flujo.length ? (
                  <ResponsiveContainer width="100%" height={58}>
                    <AreaChart data={flujo} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroFlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#60a5fa" stopOpacity={0.4} />
                          <stop offset="1" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="flujo_equity_acum" stroke="#7fb0ff" strokeWidth={2} fill="url(#heroFlow)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[58px] flex items-center text-xs text-slate-600">Sin flujo de caja calculado</div>
                )}
              </div>

              <button
                onClick={() => navigate(`/proyectos/${flagship.id}/panel/analisis`)}
                title="Ver análisis"
                className="absolute top-6 right-6 text-blue-300/70 hover:text-blue-200 transition-colors"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-blue-300/80">Empieza aquí</p>
              <p className="font-display text-2xl font-bold mt-3 max-w-xs text-balance">Genera tu primer análisis de pre-inversión</p>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">Elige un proyecto, sube el plano y deja que el Asistente calcule cabida, costos y retorno.</p>
              <button
                onClick={() => navigate('/proyectos')}
                className="mt-auto self-start flex items-center gap-2 bg-white text-slate-900 font-semibold text-sm rounded-xl px-4 py-2.5 hover:bg-slate-100 transition-colors"
              >
                <Sparkles className="w-4 h-4" /> Elegir proyecto
              </button>
            </>
          )}
        </div>

        {/* KPIs (2×2, tipográficos) */}
        <div className="grid grid-cols-2 gap-4">
          <KpiTile label="Proyectos" value={fmtNum(proyectos.length)} sub={`${conAnalisis} con análisis`} />
          <KpiTile label="Deptos proyectados" value={fmtNum(deptosTotal)} bars />
          <KpiTile label="Distritos" value={fmtNum(distritos.length)} sub={distritos.slice(0, 3).map((d) => d[0]).join(' · ') || '—'} />
          <KpiTile label="Área vendible" value={fmtNum(Math.round(areaVendTotal))} unit="m²" sub="proyectada" />
        </div>
      </div>

      {/* ── Banda B: lista densa + stack ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mt-4">

        {/* Proyectos recientes */}
        <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <h2 className="font-display text-sm font-bold text-slate-800">Proyectos recientes</h2>
            <button onClick={() => navigate('/proyectos')} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Ver todos →</button>
          </div>
          {recientes.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400">Aún no tienes proyectos.</p>
          ) : (
            recientes.map((p) => {
              const a = analisis[p.id]
              const t = a?.financiero?.tir_anual_pct
              const analizado = esAnalizado(a)
              const tcls = (t ?? 0) >= 15 ? 'text-emerald-600' : (t ?? 0) >= 12 ? 'text-amber-600' : 'text-slate-400'
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/proyectos/${p.id}/panel`)}
                  className="w-full text-left grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{p.nombre}</p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.distrito || 'Sin distrito'}</span>
                      <span>{fmtFecha(p.createdAt)}</span>
                    </p>
                  </div>
                  <span className={`text-[9.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${analizado ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {analizado ? 'Con análisis' : 'Borrador'}
                  </span>
                  <span className={`font-display font-bold text-[15px] tabular-nums w-14 text-right ${tcls}`}>
                    {t != null ? `${t.toFixed(0)}%` : '—'}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* Stack derecho: Asistente + Distribución */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/proyectos')}
            className="text-left bg-white rounded-[18px] border border-slate-200 shadow-sm p-5 flex flex-col gap-3.5 hover:border-slate-300 hover:-translate-y-0.5 transition-all"
          >
            <span className="w-9 h-9 rounded-xl bg-[#0d1220] text-white flex items-center justify-center"><Sparkles className="w-[18px] h-[18px]" /></span>
            <div>
              <h3 className="font-display text-[15px] font-bold text-slate-900">Asistente C4</h3>
              <p className="text-[12.5px] text-slate-500 mt-1 leading-snug">Sube un plano y arma el presupuesto — metrado, partidas y costo en minutos.</p>
            </div>
            <span className="self-start flex items-center gap-1.5 bg-[#0d1220] text-white text-[12.5px] font-semibold rounded-lg px-3.5 py-2">
              Subir plano <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </button>

          <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm p-5">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400 mb-3.5">Cartera por distrito</p>
            {distritos.length === 0 ? (
              <p className="text-sm text-slate-400">Sin distritos aún.</p>
            ) : (
              distritos.slice(0, 5).map(([d, n]) => (
                <div key={d} className="grid grid-cols-[76px_1fr_20px] items-center gap-2.5 mb-2.5 last:mb-0">
                  <span className="text-[12.5px] font-semibold text-slate-700 truncate">{d}</span>
                  <span className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <span className="block h-full rounded-full bg-linear-to-r from-blue-500 to-blue-800" style={{ width: `${(n / maxDist) * 100}%` }} />
                  </span>
                  <span className="text-[12.5px] font-bold text-slate-500 text-right tabular-nums">{n}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiTile({ label, value, sub, unit, bars }: { label: string; value: string; sub?: string; unit?: string; bars?: boolean }) {
  return (
    <div className="bg-white rounded-[18px] border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-[130px]">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="font-display text-[34px] font-extrabold tracking-tight leading-none mt-3.5 text-slate-900 tabular-nums">
          {value}{unit && <span className="text-base font-bold text-slate-400 ml-1">{unit}</span>}
        </p>
      </div>
      {bars ? (
        <div className="flex items-end gap-1 h-6 mt-2.5">
          {[40, 65, 50, 100, 30].map((h, i) => (
            <span key={i} className={`flex-1 rounded-sm ${i === 3 ? 'bg-blue-500' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
          ))}
        </div>
      ) : sub ? (
        <p className="text-[11.5px] text-slate-500 mt-2 truncate">{sub}</p>
      ) : null}
    </div>
  )
}
