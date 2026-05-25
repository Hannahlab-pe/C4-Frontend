import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

interface FlujoMes {
  mes: number
  ingresos: number
  egresos: number
  flujo_neto: number
  flujo_acumulado: number
}

interface FinancieroData {
  tir_anual_pct: number
  van_usd: number
  margen_bruto_pct: number
  payback_meses: number
  utilidad_neta_usd: number
  ingreso_total_ventas_usd: number
  costo_total_usd: number
  costo_construccion_usd: number
  costo_terreno_usd: number
  costo_proyectos_usd: number
  costo_ventas_usd: number
  costo_admin_usd: number
  punto_equilibrio_deptos: number
  meses_proyecto: number
  flujo_caja: FlujoMes[]
}

interface Props {
  financiero: FinancieroData
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${(n / 1_000).toFixed(0)}K`

const fmtTooltip = (v: number) =>
  `$${v.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`

function KpiCard({ label, value, sub, color = 'text-slate-900' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function FinancieroPanel({ financiero: f }: Props) {
  const flujo = f.flujo_caja ?? []

  const costos = [
    { name: 'Construcción', value: f.costo_construccion_usd },
    { name: 'Terreno', value: f.costo_terreno_usd },
    { name: 'Proyectos', value: f.costo_proyectos_usd },
    { name: 'Ventas', value: f.costo_ventas_usd },
    { name: 'Admin', value: f.costo_admin_usd },
  ]
  const coloresCostos = ['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd']

  const tirColor = f.tir_anual_pct >= 20 ? 'text-green-600' : f.tir_anual_pct >= 12 ? 'text-amber-600' : 'text-red-600'
  const vanColor = f.van_usd > 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard label="TIR Anual" value={`${f.tir_anual_pct.toFixed(1)}%`} sub="Tasa interna de retorno" color={tirColor} />
        <KpiCard label="VAN (12%)" value={fmt(f.van_usd)} sub="Valor actual neto" color={vanColor} />
        <KpiCard label="Margen bruto" value={`${f.margen_bruto_pct.toFixed(1)}%`} sub={`Utilidad: ${fmt(f.utilidad_neta_usd)}`} />
        <KpiCard label="Payback" value={`${f.payback_meses} meses`} sub={`Eq. ${f.punto_equilibrio_deptos} deptos`} />
      </div>

      {/* Flujo de caja acumulado */}
      {flujo.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-600 mb-3">Flujo de Caja Acumulado</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={flujo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPositivo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNegativo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} label={{ value: 'Mes', position: 'insideBottom', offset: -2, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(v)} width={52} />
              <Tooltip formatter={(v: number) => fmtTooltip(v)} labelFormatter={(l) => `Mes ${l}`} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="flujo_acumulado"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#gradPositivo)"
                dot={false}
                name="Acumulado"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ingresos vs Egresos mensual */}
      {flujo.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-600 mb-3">Ingresos vs Egresos / Mes</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={flujo} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => fmt(v)} width={52} />
              <Tooltip formatter={(v: number) => fmtTooltip(v)} labelFormatter={(l) => `Mes ${l}`} />
              <Bar dataKey="ingresos" fill="#3b82f6" name="Ingresos" radius={[2, 2, 0, 0]} />
              <Bar dataKey="egresos" fill="#f87171" name="Egresos" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Desglose de costos */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-medium text-slate-600 mb-3">Desglose de Inversión</p>
        <div className="space-y-2">
          {costos.map((c, i) => (
            <div key={c.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: coloresCostos[i] }} />
              <span className="text-xs text-slate-600 flex-1">{c.name}</span>
              <span className="text-xs font-medium text-slate-800">{fmt(c.value)}</span>
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(c.value / f.costo_total_usd) * 100}%`,
                    backgroundColor: coloresCostos[i],
                  }}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-1 border-t border-slate-100 mt-2">
            <span className="text-xs font-medium text-slate-700">Total</span>
            <span className="text-xs font-bold text-slate-900">{fmt(f.costo_total_usd)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
