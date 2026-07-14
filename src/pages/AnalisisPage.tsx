import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Layers, Building, TrendingUp, Loader2, BarChart2,
  ConstructionIcon, CheckCircle2, AlertTriangle, XCircle, CalendarRange,
  FileText, Activity, Flag,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import FinancieroPanel from '../components/FinancieroPanel'
import CronogramaGantt from '../components/CronogramaGantt'
import AvanceObra from '../components/AvanceObra'
import type { AvanceData } from '../components/AvanceObra'
import CierreObra from '../components/CierreObra'
import type { CierreData } from '../components/CierreObra'
import { API_BASE } from '../lib/config'

type FaseProyecto = 'previo' | 'avance' | 'cierre'
interface Seguimiento { avance?: AvanceData; cierre?: CierreData }

const FASES = [
  { key: 'previo', label: 'Pre-inversión',  icon: FileText },
  { key: 'avance', label: 'Avance de obra', icon: Activity },
  { key: 'cierre', label: 'Cierre',         icon: Flag },
]
const FASE_TITULO: Record<FaseProyecto, string> = {
  previo: 'Análisis de Pre-inversión',
  avance: 'Avance de Obra',
  cierre: 'Cierre de Obra',
}

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
  tir_anual_pct: number; van_usd: number; margen_neto_pct: number
  payback_meses: number; utilidad_neta_usd: number; utilidad_bruta_usd: number
  impuestos_estimados_usd: number; ingreso_total_usd: number
  costo_total_usd: number; costo_construccion_usd: number; costo_terreno_usd: number
  costo_licencias_diseno_usd: number; costo_marketing_usd: number; costo_corretaje_usd: number
  costo_supervision_usd: number; costo_gerencia_usd: number; costo_imprevistos_usd: number
  costo_titulacion_usd: number; costo_financiamiento_usd: number; costo_alcabala_notaria_usd: number
  costo_usd_m2_construido: number; precio_venta_usd_m2: number
  punto_equilibrio_deptos: number; meses_proyecto: number
  meses_preobra: number; meses_construccion: number; meses_postentrega: number
  velocidad_ventas_mensual: number; monto_prestamo_usd: number; porcentaje_capital_propio: number
  flujo_caja: any[]
}

const TABS = [
  { key: 'cabida',     label: 'Cabida',      icon: Layers },
  { key: 'estructura', label: 'Estructura',  icon: Building },
  { key: 'financiero', label: 'Financiero',  icon: TrendingUp },
  { key: 'cronograma', label: 'Cronograma',  icon: CalendarRange },
]

function fmt(n: number, d = 0) { return n.toLocaleString('es-PE', { maximumFractionDigits: d }) }
const usd = (n?: number) =>
  n == null ? '-' : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(0)}K`
const usdFull = (n?: number) =>
  n == null ? '-' : `$${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}

function MiniKpi({ label, value, sub, color = 'text-slate-900' }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

/** Veredicto calculado desde la TIR (mismos umbrales que el motor) */
function veredictoDe(tir: number) {
  if (tir >= 18) return { txt: 'Proyecto viable', cls: 'bg-green-50 text-green-700 border-green-200', Icon: CheckCircle2 }
  if (tir >= 12) return { txt: 'Proyecto ajustado', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle }
  return { txt: 'Proyecto no rentable', cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle }
}

/** Grúa recomendada según pisos (misma tabla que el motor de planos) */
function recomendarGrua(pisos: number) {
  if (pisos <= 10) return { modelo: 'Potain MC85B (City Crane)', radio: 50, base: '3.2 × 3.2', ton: 5 }
  if (pisos <= 15) return { modelo: 'JASO J5010', radio: 50, base: '3.8 × 3.8', ton: 2.5 }
  if (pisos <= 20) return { modelo: 'Liebherr 85 EC-B 5', radio: 50, base: '3.0 × 3.0', ton: 5 }
  return { modelo: 'Potain MC175C', radio: 60, base: '4.5 × 4.5', ton: 8 }
}

/** Alquiler mensual estimado en soles: a más capacidad, más caro (S/ 15k–30k/mes). */
function precioGruaSoles(ton: number): string {
  const centro = Math.min(30000, Math.max(15000, 15000 + ((ton - 3) / 7) * 15000))
  const min = Math.round((centro * 0.92) / 1000) * 1000
  const max = Math.round((centro * 1.08) / 1000) * 1000
  const f = (n: number) => `S/ ${n.toLocaleString('es-PE')}`
  return `${f(min)} – ${f(max)} /mes`
}

export default function AnalisisPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [fase, setFase] = useState<FaseProyecto>('previo')
  const [active, setActive] = useState('cabida')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    cabida?: AnalisisCabida; estructura?: AnalisisEstructural; financiero?: AnalisisFinanciero; distrito?: string
  } | null>(null)
  const [seguimiento, setSeguimiento] = useState<Seguimiento>({})
  const hidratado = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/${id}/analisis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); if (d?.seguimiento && typeof d.seguimiento === 'object') setSeguimiento(d.seguimiento) })
      .catch(() => setData(null))
      .finally(() => { setLoading(false); hidratado.current = true })
  }, [id, token])

  // Guardar seguimiento (debounced) en BD
  useEffect(() => {
    if (!id || !hidratado.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`${API_BASE}/chat/${id}/seguimiento`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(seguimiento),
      }).catch(() => {})
    }, 700)
  }, [id, token, seguimiento])

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

  const c = data?.cabida
  const f = data?.financiero
  const veredicto = f ? veredictoDe(f.tir_anual_pct ?? 0) : null
  const tirColor = (f?.tir_anual_pct ?? 0) >= 20 ? 'text-green-600' : (f?.tir_anual_pct ?? 0) >= 12 ? 'text-amber-600' : 'text-red-600'
  const vanColor = (f?.van_usd ?? 0) > 0 ? 'text-green-600' : 'text-red-600'
  const areaPromDepto = c && c.num_departamentos > 0 ? c.area_vendible_total / c.num_departamentos : 0
  const estacPlanta = c ? Math.max(0, c.estacionamientos_requeridos - c.estacionamientos_en_sotano) : 0
  const grua = c ? recomendarGrua(c.pisos_vivienda) : null

  return (
    <div className="h-full overflow-y-auto">

      {/* Header azul noche (igual que el Cronograma) */}
      <div className="bg-linear-to-r from-slate-800 to-slate-700 px-6 py-4 md:py-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-bold">{FASE_TITULO[fase]}</h2>
            {data?.distrito && <p className="text-xs text-slate-300 mt-0.5">{data.distrito}</p>}
          </div>
          {fase === 'previo' && veredicto && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${veredicto.cls}`}>
              <veredicto.Icon className="w-4 h-4" />
              {veredicto.txt}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">

      {/* Switcher de fases del proyecto: cómo empezó / cómo va / cómo terminó */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {FASES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setFase(key as FaseProyecto)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              fase === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ════════════ FASE: PRE-INVERSIÓN (cómo empezó / lo proyectado) ════════════ */}
      {fase === 'previo' && (<>

      {/* Resumen ejecutivo — KPIs siempre visibles */}
      {f && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <MiniKpi label="TIR Anual" value={`${(f.tir_anual_pct ?? 0).toFixed(1)}%`} sub="Retorno anualizado" color={tirColor} />
          <MiniKpi label="VAN (12%)" value={usd(f.van_usd)} sub="Valor actual neto" color={vanColor} />
          <MiniKpi label="Margen neto" value={`${(f.margen_neto_pct ?? 0).toFixed(1)}%`} sub={`Utilidad ${usd(f.utilidad_neta_usd)}`} />
          <MiniKpi label="Inversión total" value={usd(f.costo_total_usd)} sub={`Ingresos ${usd(f.ingreso_total_usd)}`} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              active === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── CABIDA ── */}
      {active === 'cabida' && c && (
        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Cabida Arquitectónica</p>
            <Row label="Área del terreno"       value={`${fmt(c.area_terreno)} m²`} />
            <Row label="Planta libre"           value={`${fmt(c.planta_libre)} m²`} />
            <Row label="Pisos de vivienda"      value={String(c.pisos_vivienda)} highlight />
            <Row label="Sótanos"                value={String(c.sotanos)} />
            <Row label="Área construida bruta"  value={`${fmt(c.area_construida_bruta)} m²`} />
            <Row label="Área vendible total"    value={`${fmt(c.area_vendible_total)} m²`} highlight />
            <Row label="Departamentos"          value={String(c.num_departamentos)} highlight />
            <Row label="Área prom. por depto"   value={`${fmt(areaPromDepto, 1)} m²`} />
            <Row label="Estacionamientos"       value={`${c.estacionamientos_requeridos} (${c.estacionamientos_en_sotano} sótano · ${estacPlanta} planta)`} />
            <Row label="CUS utilizado"          value={String(c.cus_utilizado)} />
            <Row label="Factor limitante"       value={c.limitante === 'pisos_normativa' ? 'Normativa de pisos' : 'CUS'} />
          </div>

          {/* Grúa recomendada */}
          {grua && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <ConstructionIcon className="w-4 h-4 text-slate-400" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Grúa Torre Recomendada</p>
              </div>
              <Row label="Modelo"           value={grua.modelo} highlight />
              <Row label="Radio de pluma"   value={`${grua.radio} m`} />
              <Row label="Base"             value={`${grua.base} m`} />
              <Row label="Carga máxima"     value={`${grua.ton} ton`} />
              <Row label="Alquiler estimado" value={precioGruaSoles(grua.ton)} highlight />
              <p className="text-[11px] text-slate-400 mt-3">
                Selección automática según {c.pisos_vivienda} pisos. El alquiler escala con la capacidad (S/ 15k–30k/mes).
                La posición óptima se grafica en el plano DXF (Hoja 0).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── ESTRUCTURA ── */}
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

      {/* ── FINANCIERO ── */}
      {active === 'financiero' && f && (
        <div className="grid lg:grid-cols-2 gap-4 items-start max-w-5xl">
          {/* Gráficos + desglose */}
          <div className="lg:col-span-2">
            <FinancieroPanel financiero={f as any} />
          </div>

          {/* Resultados detallados */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resultados</p>
            <Row label="Ingreso total ventas"  value={usdFull(f.ingreso_total_usd)} highlight />
            <Row label="Precio venta / m²"     value={`$${fmt(f.precio_venta_usd_m2)}`} />
            <Row label="Costo total"           value={usdFull(f.costo_total_usd)} />
            <Row label="Costo / m² construido" value={`$${fmt(f.costo_usd_m2_construido)}`} />
            <Row label="Utilidad bruta"        value={usdFull(f.utilidad_bruta_usd)} />
            <Row label="Impuestos (~15%)"      value={usdFull(f.impuestos_estimados_usd)} />
            <Row label="Utilidad neta"         value={usdFull(f.utilidad_neta_usd)} highlight />
            <Row label="Margen neto"           value={`${(f.margen_neto_pct ?? 0).toFixed(1)}%`} highlight />
            <Row label="Punto de equilibrio"   value={`${f.punto_equilibrio_deptos} deptos`} />
            <Row label="Payback"               value={`mes ${f.payback_meses}`} />
          </div>

          {/* Supuestos y financiamiento */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Supuestos y Financiamiento</p>
            <Row label="Capital propio"        value={`${fmt(f.porcentaje_capital_propio)}%`} highlight />
            <Row label="Préstamo bancario"     value={`${usdFull(f.monto_prestamo_usd)} (11% anual)`} />
            <Row label="Velocidad de ventas"   value={`~${fmt(f.velocidad_ventas_mensual, 1)} deptos/mes`} />
            <Row label="Horizonte total"       value={`${f.meses_proyecto} meses`} highlight />
            <Row label="· Pre-obra"            value={`${f.meses_preobra} meses`} />
            <Row label="· Construcción"        value={`${f.meses_construccion} meses`} />
            <Row label="· Post-entrega"        value={`${f.meses_postentrega} meses`} />
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
              <p className="text-[11px] text-slate-400">Estructura de costos indirectos (motor C4):</p>
              <Row label="Alcabala + notaría"   value={usdFull(f.costo_alcabala_notaria_usd)} />
              <Row label="Licencias + diseño"   value={usdFull(f.costo_licencias_diseno_usd)} />
              <Row label="Supervisión + gerencia" value={usdFull((f.costo_supervision_usd ?? 0) + (f.costo_gerencia_usd ?? 0))} />
              <Row label="Imprevistos"          value={usdFull(f.costo_imprevistos_usd)} />
              <Row label="Marketing + corretaje" value={usdFull((f.costo_marketing_usd ?? 0) + (f.costo_corretaje_usd ?? 0))} />
              <Row label="Titulación SUNARP"    value={usdFull(f.costo_titulacion_usd)} />
              <Row label="Intereses bancarios"  value={usdFull(f.costo_financiamiento_usd)} />
            </div>
          </div>
        </div>
      )}

      {/* ── CRONOGRAMA ── */}
      {active === 'cronograma' && c && f && (
        <div className="max-w-5xl">
          <CronogramaGantt cabida={c} financiero={f} onAbrir={() => navigate('../cronograma')} />
        </div>
      )}

      {/* Empty states por tab */}
      {active === 'cabida'     && !data?.cabida     && <p className="text-sm text-slate-400">Datos de cabida no disponibles.</p>}
      {active === 'estructura' && !data?.estructura && <p className="text-sm text-slate-400">Datos estructurales no disponibles.</p>}
      {active === 'financiero' && !data?.financiero && <p className="text-sm text-slate-400">Datos financieros no disponibles.</p>}
      {active === 'cronograma' && (!data?.cabida || !data?.financiero) && <p className="text-sm text-slate-400">Ejecuta un análisis completo para ver el cronograma.</p>}

      </>)}

      {/* ════════════ FASE: AVANCE DE OBRA (cómo va) ════════════ */}
      {fase === 'avance' && (
        c && f
          ? <AvanceObra cabida={c} financiero={f}
              value={seguimiento.avance ?? {}}
              onChange={(avance) => setSeguimiento((s) => ({ ...s, avance }))} />
          : <p className="text-sm text-slate-400">Ejecuta el análisis de pre-inversión primero para habilitar el seguimiento de obra.</p>
      )}

      {/* ════════════ FASE: CIERRE (cómo terminó) ════════════ */}
      {fase === 'cierre' && (
        c && f
          ? <CierreObra cabida={c} financiero={f}
              value={seguimiento.cierre ?? {}}
              onChange={(cierre) => setSeguimiento((s) => ({ ...s, cierre }))} />
          : <p className="text-sm text-slate-400">Ejecuta el análisis de pre-inversión primero para habilitar el cierre de obra.</p>
      )}
      </div>
    </div>
  )
}
