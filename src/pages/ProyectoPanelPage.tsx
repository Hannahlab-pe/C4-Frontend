import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  RadialBarChart, RadialBar, PolarAngleAxis,
  PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Hammer, HardHat, Building2, PaintBucket, ClipboardList,
  Loader2, BarChart3, Sparkles, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle,
  Layers, Home, Car, Maximize2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { avanceRegistros } from '../lib/registros-fase'
import type { RegistroFase } from '../lib/registros-fase'

// ─── Config de fases ────────────────────────────────────────────────────────
const FASES = [
  { slug: 'demolicion',     nombre: 'Demolición',     icon: Hammer,        color: '#ef4444' },
  { slug: 'excavacion',     nombre: 'Excavación',     icon: HardHat,       color: '#f59e0b' },
  { slug: 'construccion',   nombre: 'Construcción',   icon: Building2,     color: '#3b82f6' },
  { slug: 'acabados',       nombre: 'Acabados',       icon: PaintBucket,   color: '#10b981' },
  { slug: 'administracion', nombre: 'Administración', icon: ClipboardList, color: '#8b5cf6' },
] as const

// ─── Tipos mínimos del análisis ─────────────────────────────────────────────
interface Cabida {
  area_terreno: number; pisos_vivienda: number; sotanos: number
  area_construida_bruta: number; area_vendible_total: number
  num_departamentos: number; estacionamientos_requeridos: number
}
interface Financiero {
  tir_anual_pct: number; van_usd: number; margen_neto_pct: number
  utilidad_neta_usd: number; ingreso_total_usd: number; costo_total_usd: number
  costo_terreno_usd: number; costo_construccion_usd: number; costo_licencias_diseno_usd: number
  costo_marketing_usd: number; costo_corretaje_usd: number; costo_supervision_usd: number
  costo_gerencia_usd: number; costo_imprevistos_usd: number; costo_titulacion_usd: number
  costo_financiamiento_usd: number
  meses_proyecto: number; meses_preobra: number; meses_construccion: number; meses_postentrega: number
  flujo_caja: any[]
}
interface Analisis { cabida?: Cabida; financiero?: Financiero; distrito?: string }
interface FaseAvance { slug: string; nombre: string; icon: any; color: string; avance: number; nregs: number }

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n?: number, d = 0) =>
  n == null ? '—' : n.toLocaleString('es-PE', { maximumFractionDigits: d })
const usd = (n?: number) =>
  n == null ? '—' : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(0)}K`
const usdT = (n?: number) => (n == null ? '—' : `$${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`)

function veredictoDe(tir: number) {
  if (tir >= 18) return { txt: 'Proyecto viable', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 }
  if (tir >= 12) return { txt: 'Proyecto ajustado', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle }
  return { txt: 'Proyecto no rentable', cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle }
}

function Kpi({ label, value, sub, color = 'text-slate-900' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
      <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-2xl font-black tabular-nums leading-none ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1.5">{sub}</p>}
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <span className="text-sm text-slate-500 flex-1">{label}</span>
      <span className="text-sm font-bold text-slate-800 tabular-nums">{value}</span>
    </div>
  )
}

export default function ProyectoPanelPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(true)
  const [analisis, setAnalisis] = useState<Analisis | null>(null)
  const [avances, setAvances] = useState<FaseAvance[]>([])

  const cargar = useCallback(() => {
    if (!id) return
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch(`${API_BASE}/chat/${id}/analisis`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ...FASES.map((f) =>
        fetch(`${API_BASE}/registros-fase/${id}/${f.slug}`, { headers })
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    ]).then(([ana, ...regsArr]: [Analisis | null, ...RegistroFase[][]]) => {
      setAnalisis(ana)
      setAvances(
        FASES.map((f, i) => ({
          ...f,
          avance: avanceRegistros(f.slug, regsArr[i] ?? []),
          nregs: (regsArr[i] ?? []).length,
        })),
      )
    }).finally(() => setLoading(false))
  }, [id, token])

  useEffect(() => { cargar() }, [cargar])

  // Refresco en vivo cuando la IA genera/crea cosas desde el chat
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:proyecto-updated', onUpd)
    window.addEventListener('c4:etapas-updated', onUpd)
    window.addEventListener('c4:analisis-updated', onUpd)
    return () => {
      window.removeEventListener('c4:proyecto-updated', onUpd)
      window.removeEventListener('c4:etapas-updated', onUpd)
      window.removeEventListener('c4:analisis-updated', onUpd)
    }
  }, [cargar])

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando panel...</span>
    </div>
  )

  const c = analisis?.cabida
  const f = analisis?.financiero
  const tieneAnalisis = !!(c || f)
  const totalRegs = avances.reduce((s, a) => s + a.nregs, 0)

  // Empty state — proyecto recién creado, sin nada generado
  if (!tieneAnalisis && totalRegs === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
        <BarChart3 className="w-7 h-7 text-slate-400" />
      </div>
      <div>
        <p className="text-slate-700 font-semibold">Aún no hay datos del proyecto</p>
        <p className="text-sm text-slate-400 mt-1 max-w-sm">
          Abre el Asistente C4, describe tu terreno y genera el análisis de pre-inversión.
          El panel se llenará con los indicadores y el avance de obra.
        </p>
      </div>
      <button
        onClick={() => window.dispatchEvent(new Event('c4:open-chat'))}
        className="inline-flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 px-4 py-2.5 rounded-xl transition-colors"
      >
        <Sparkles className="w-4 h-4" /> Abrir Asistente C4
      </button>
    </div>
  )

  const veredicto = f ? veredictoDe(f.tir_anual_pct ?? 0) : null
  const tirColor = (f?.tir_anual_pct ?? 0) >= 20 ? 'text-emerald-600' : (f?.tir_anual_pct ?? 0) >= 12 ? 'text-amber-600' : 'text-red-600'
  const vanColor = (f?.van_usd ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'

  const avanceGlobal = avances.length ? Math.round(avances.reduce((s, a) => s + a.avance, 0) / avances.length) : 0
  const gaugeColor = avanceGlobal >= 66 ? '#10b981' : avanceGlobal >= 33 ? '#3b82f6' : '#f59e0b'

  const costos = f ? [
    { name: 'Construcción',     value: f.costo_construccion_usd ?? 0,                              color: '#3b82f6' },
    { name: 'Terreno',          value: f.costo_terreno_usd ?? 0,                                   color: '#6366f1' },
    { name: 'Licencias/Diseño', value: f.costo_licencias_diseno_usd ?? 0,                          color: '#8b5cf6' },
    { name: 'Ventas/Corretaje', value: (f.costo_marketing_usd ?? 0) + (f.costo_corretaje_usd ?? 0), color: '#a78bfa' },
    { name: 'Admin/Otros',      value: (f.costo_supervision_usd ?? 0) + (f.costo_gerencia_usd ?? 0) + (f.costo_imprevistos_usd ?? 0) + (f.costo_titulacion_usd ?? 0) + (f.costo_financiamiento_usd ?? 0), color: '#c4b5fd' },
  ].filter((x) => x.value > 0) : []

  const cronoSegs = f ? [
    { label: 'Pre-obra',     meses: f.meses_preobra ?? 0,      color: '#f59e0b' },
    { label: 'Construcción', meses: f.meses_construccion ?? 0, color: '#3b82f6' },
    { label: 'Post-entrega', meses: f.meses_postentrega ?? 0,  color: '#10b981' },
  ].filter((s) => s.meses > 0) : []
  const cronoTotal = cronoSegs.reduce((s, x) => s + x.meses, 0) || 1

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Resumen del proyecto</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {analisis?.distrito ? `${analisis.distrito} · ` : ''}Indicadores y avance de obra
          </p>
        </div>
        {veredicto && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold ${veredicto.cls}`}>
            <veredicto.Icon className="w-4 h-4" /> {veredicto.txt}
          </div>
        )}
      </div>

      {/* ── KPIs financieros ── */}
      {f && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="TIR Anual"       value={`${(f.tir_anual_pct ?? 0).toFixed(1)}%`} sub="Retorno anualizado" color={tirColor} />
          <Kpi label="VAN (12%)"       value={usd(f.van_usd)}                          sub="Valor actual neto" color={vanColor} />
          <Kpi label="Margen neto"     value={`${(f.margen_neto_pct ?? 0).toFixed(1)}%`} sub={`Utilidad ${usd(f.utilidad_neta_usd)}`} />
          <Kpi label="Inversión total" value={usd(f.costo_total_usd)}                  sub={`Ingresos ${usd(f.ingreso_total_usd)}`} />
        </div>
      )}

      {/* ── Avance de obra + Composición ── */}
      <div className="grid lg:grid-cols-3 gap-4 items-stretch">

        {/* Avance de obra */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">Avance de obra</p>
          <div className="flex flex-col sm:flex-row items-center gap-6">

            {/* Gauge global */}
            <div className="relative w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="74%" outerRadius="100%"
                  data={[{ value: avanceGlobal }]}
                  startAngle={90} endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={20} fill={gaugeColor} angleAxisId={0} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{avanceGlobal}%</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Global</span>
              </div>
            </div>

            {/* Barras por fase */}
            <div className="flex-1 w-full space-y-3">
              {avances.map((a) => {
                const Icon = a.icon
                return (
                  <button
                    key={a.slug}
                    onClick={() => navigate(`/proyectos/${id}/panel/${a.slug}`)}
                    className="w-full group text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: a.color }} />
                      <span className="text-xs font-medium text-slate-600 flex-1 group-hover:text-slate-900 transition-colors">{a.nombre}</span>
                      <span className="text-[11px] text-slate-400">{a.nregs} reg.</span>
                      <span className="text-xs font-bold text-slate-700 tabular-nums w-9 text-right">{a.avance}%</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${a.avance}%`, backgroundColor: a.color }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Composición del proyecto */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Composición</p>
          {c ? (
            <div>
              <Stat icon={Layers}    label="Pisos de vivienda" value={String(c.pisos_vivienda)} />
              <Stat icon={Building2} label="Sótanos"           value={String(c.sotanos)} />
              <Stat icon={Home}      label="Departamentos"     value={String(c.num_departamentos)} />
              <Stat icon={Car}       label="Estacionamientos"  value={String(c.estacionamientos_requeridos)} />
              <Stat icon={Maximize2} label="Área vendible"     value={`${fmt(c.area_vendible_total)} m²`} />
              <Stat icon={Maximize2} label="Área construida"   value={`${fmt(c.area_construida_bruta)} m²`} />
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">Sin datos de cabida.</p>
          )}
        </div>
      </div>

      {/* ── Inversión + Flujo de caja ── */}
      {f && (
        <div className="grid lg:grid-cols-2 gap-4">

          {/* Donut estructura de inversión */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Estructura de inversión</p>
            <div className="flex items-center gap-4">
              <div className="w-36 h-36 shrink-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                      {costos.map((x) => <Cell key={x.name} fill={x.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => usdT(v as number)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-black text-slate-900">{usd(f.costo_total_usd)}</span>
                  <span className="text-[9px] text-slate-400 uppercase">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {costos.map((x) => (
                  <div key={x.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: x.color }} />
                    <span className="text-xs text-slate-600 flex-1">{x.name}</span>
                    <span className="text-xs font-semibold text-slate-800">{usd(x.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Flujo de caja acumulado */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Flujo de caja acumulado (equity)</p>
            {f.flujo_caja?.length ? (
              <ResponsiveContainer width="100%" height={172}>
                <AreaChart data={f.flujo_caja} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPanel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => usd(v as number)} width={52} />
                  <Tooltip formatter={(v) => usdT(v as number)} labelFormatter={(l) => `Mes ${l}`} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="flujo_equity_acum" stroke="#3b82f6" strokeWidth={2} fill="url(#gradPanel)" dot={false} name="Acumulado" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-10 text-center">Sin flujo de caja calculado.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Cronograma estimado ── */}
      {cronoSegs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cronograma estimado</p>
            <span className="text-xs font-semibold text-slate-700">{f?.meses_proyecto ?? cronoTotal} meses</span>
          </div>
          <div className="flex w-full h-3 rounded-full overflow-hidden">
            {cronoSegs.map((s) => (
              <div key={s.label} style={{ width: `${(s.meses / cronoTotal) * 100}%`, backgroundColor: s.color }} title={`${s.label}: ${s.meses} meses`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-3">
            {cronoSegs.map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-xs text-slate-500">{s.label}</span>
                <span className="text-xs font-semibold text-slate-700">{s.meses}m</span>
              </div>
            ))}
            <button
              onClick={() => navigate(`/proyectos/${id}/panel/cronograma`)}
              className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              Ver cronograma completo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
