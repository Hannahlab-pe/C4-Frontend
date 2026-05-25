import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Layers, Building, TrendingUp, Loader2, BarChart2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import FinancieroPanel from '../components/FinancieroPanel'
import { API_BASE } from '../lib/config'

interface AnalisisCabida {
  area_terreno: number; planta_libre: number; pisos_vivienda: number
  sotanos: number; area_construida_bruta: number; area_vendible_total: number
  num_departamentos: number; estacionamientos_requeridos: number
  estacionamientos_en_sotano: number; cus_utilizado: number; limitante: string
}
interface AnalisisEstructural {
  peralte_viga_cm: number; base_viga_cm: number; espesor_losa_cm: number
  lado_columna_cm: number; concreto_total_m3: number; acero_total_ton: number
}
interface AnalisisFinanciero {
  tir_anual_pct: number; van_usd: number; margen_bruto_pct: number
  payback_meses: number; utilidad_neta_usd: number; ingreso_total_ventas_usd: number
  costo_total_usd: number; costo_construccion_usd: number; costo_terreno_usd: number
  costo_proyectos_usd: number; costo_ventas_usd: number; costo_admin_usd: number
  punto_equilibrio_deptos: number; meses_proyecto: number; precio_venta_usd_m2: number
  flujo_caja: { mes: number; ingresos: number; egresos: number; flujo_neto: number; flujo_acumulado: number }[]
}

const TABS = [
  { key: 'cabida',     label: 'Cabida',     icon: Layers },
  { key: 'estructura', label: 'Estructura', icon: Building },
  { key: 'financiero', label: 'Financiero', icon: TrendingUp },
]

function fmt(n: number, d = 0) { return n.toLocaleString('es-PE', { maximumFractionDigits: d }) }

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

export default function AnalisisPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.token)
  const [active, setActive] = useState('cabida')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    cabida?: AnalisisCabida; estructura?: AnalisisEstructural; financiero?: AnalisisFinanciero; distrito?: string
  } | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/${id}/analisis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [id, token])

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Cargando análisis...</span>
    </div>
  )

  const tieneData = data?.cabida || data?.estructura || data?.financiero

  if (!tieneData) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
      <BarChart2 className="w-12 h-12 text-slate-200" />
      <div>
        <p className="text-slate-600 font-medium">Sin análisis generado</p>
        <p className="text-sm text-slate-400 mt-1">
          Abre el Asistente C4 e ingresa los datos de un terreno para generar el análisis de pre-inversión.
        </p>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-800">Análisis de Pre-inversión</h2>
          {data?.distrito && (
            <p className="text-xs text-slate-400 mt-0.5">{data.distrito}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              active === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {active === 'cabida' && data?.cabida && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cabida Arquitectónica</p>
          <Row label="Área del terreno"       value={`${fmt(data.cabida.area_terreno)} m²`} />
          <Row label="Planta libre"           value={`${fmt(data.cabida.planta_libre)} m²`} />
          <Row label="Pisos de vivienda"      value={String(data.cabida.pisos_vivienda)} highlight />
          <Row label="Sótanos"                value={String(data.cabida.sotanos)} />
          <Row label="Área construida bruta"  value={`${fmt(data.cabida.area_construida_bruta)} m²`} />
          <Row label="Área vendible total"    value={`${fmt(data.cabida.area_vendible_total)} m²`} highlight />
          <Row label="Departamentos"          value={String(data.cabida.num_departamentos)} highlight />
          <Row label="Estacionamientos"       value={`${data.cabida.estacionamientos_requeridos} (${data.cabida.estacionamientos_en_sotano} en sótano)`} />
          <Row label="CUS utilizado"          value={String(data.cabida.cus_utilizado)} />
          <Row label="Factor limitante"       value={data.cabida.limitante === 'pisos_normativa' ? 'Normativa de pisos' : 'CUS'} />
        </div>
      )}

      {active === 'estructura' && data?.estructura && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-lg">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Predimensionamiento Estructural</p>
          <Row label="Vigas principales"  value={`${data.estructura.base_viga_cm} × ${data.estructura.peralte_viga_cm} cm`} highlight />
          <Row label="Losa aligerada"     value={`h = ${data.estructura.espesor_losa_cm} cm`} highlight />
          <Row label="Columnas"           value={`${data.estructura.lado_columna_cm} × ${data.estructura.lado_columna_cm} cm`} highlight />
          <Row label="Concreto f'c=210"   value={`${fmt(data.estructura.concreto_total_m3, 1)} m³`} />
          <Row label="Acero fy=4200"      value={`${fmt(data.estructura.acero_total_ton, 2)} ton`} />
          <p className="text-[10px] text-slate-400 mt-3">Valores empíricos referenciales. Pre-ETABS.</p>
        </div>
      )}

      {active === 'financiero' && data?.financiero && (
        <div className="max-w-xl">
          <FinancieroPanel financiero={data.financiero} />
        </div>
      )}

      {/* Empty states por tab */}
      {active === 'cabida'     && !data?.cabida     && <p className="text-sm text-slate-400">Datos de cabida no disponibles.</p>}
      {active === 'estructura' && !data?.estructura && <p className="text-sm text-slate-400">Datos estructurales no disponibles.</p>}
      {active === 'financiero' && !data?.financiero && <p className="text-sm text-slate-400">Datos financieros no disponibles.</p>}
    </div>
  )
}
