import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Hammer, HardHat, Building2, PaintBucket, ClipboardList,
  CheckCircle2, Circle, Clock, Plus, Trash2, Loader2,
  Truck, Wrench, CalendarRange, Sparkles, Table2, ListChecks, FileText,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { generarCronograma } from '../lib/cronograma'
import type { CabidaMin, FinancieroMin } from '../lib/cronograma'

interface Tarea {
  id: string
  texto: string
  estado: 'pendiente' | 'en_proceso' | 'completada'
}

interface Equipo {
  id: string
  nombre: string
  tipo: string
  estado: string
  notas?: string
  contrataEmpresa?: string
}

// Sección estructurada del módulo (la IA las rellena con generar_proyecto)
interface Seccion {
  titulo: string
  tipo: 'kv' | 'tabla' | 'lista'
  kv?: { label: string; valor: string }[]
  columnas?: string[]
  filas?: string[][]
  items?: string[]
}

interface Analisis {
  cabida?: CabidaMin & {
    planta_libre: number; area_construida_bruta: number; area_vendible_total: number
    estacionamientos_requeridos: number; estacionamientos_en_sotano: number
  }
  financiero?: FinancieroMin & {
    costo_construccion_usd?: number; costo_demolicion_usd?: number
    costo_licencias_diseno_usd?: number; costo_titulacion_usd?: number
    punto_equilibrio_deptos?: number; meses_proyecto?: number
    concreto?: number
  }
  estructura?: { concreto_total_m3: number; acero_total_ton: number }
}

const FASES_CONFIG: Record<string, {
  nombre: string; descripcion: string; icon: React.ElementType
  color: string; iconColor: string
  tareasDefault: string[]
}> = {
  demolicion: {
    nombre: 'Demolición', descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    icon: Hammer, color: 'bg-red-50 border-red-200', iconColor: 'text-red-600',
    tareasDefault: [
      'Inspección previa y certificados municipales',
      'Contratación empresa demoledora',
      'Retiro de instalaciones eléctricas y sanitarias',
      'Demolición estructural',
      'Retiro de escombros y desmonte',
      'Nivelación y limpieza final',
    ],
  },
  excavacion: {
    nombre: 'Excavación', descripcion: 'Movimiento de tierras, sótanos y calzaduras',
    icon: HardHat, color: 'bg-orange-50 border-orange-200', iconColor: 'text-orange-600',
    tareasDefault: [
      'Estudio de mecánica de suelos',
      'Diseño de calzaduras y anclajes',
      'Permisos municipales de excavación',
      'Excavación masiva (1er nivel)',
      'Calzaduras perimetrales',
      'Excavación para sótano',
      'Habilitación para cimentación',
    ],
  },
  construccion: {
    nombre: 'Construcción', descripcion: 'Casco estructural: cimentación, columnas, losas y muros',
    icon: Building2, color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600',
    tareasDefault: [
      'Cimentación y zapatas',
      'Muros y losa de sótano',
      'Columnas y vigas — piso 1',
      'Losa aligerada — piso 1',
      'Repetir estructura por piso',
      'Instalaciones sanitarias empotradas',
      'Instalaciones eléctricas empotradas',
      'Azotea y tanque elevado',
    ],
  },
  acabados: {
    nombre: 'Acabados', descripcion: 'Albañilería, revestimientos, pintura y equipamiento',
    icon: PaintBucket, color: 'bg-green-50 border-green-200', iconColor: 'text-green-600',
    tareasDefault: [
      'Tabiquería y muros interiores',
      'Tarrajeo y enlucido',
      'Pisos (porcelanato / cerámico)',
      'Revestimientos de baño y cocina',
      'Carpintería metálica (puertas y ventanas)',
      'Pintura interior y exterior',
      'Aparatos sanitarios y grifería',
      'Tableros eléctricos y tomacorrientes',
      'Ascensor e instalaciones comunes',
    ],
  },
  administracion: {
    nombre: 'Administración', descripcion: 'Licencias, SUNARP, independizaciones y entrega',
    icon: ClipboardList, color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600',
    tareasDefault: [
      'Licencia de construcción (municipio)',
      'Pólizas de seguro CAR',
      'Contrato con empresas subcontratistas',
      'Control de costos y valorizaciones',
      'Pre-ventas y contratos con compradores',
      'Declaratoria de fábrica (SUNARP)',
      'Independización de unidades',
      'Entrega a compradores',
    ],
  },
}

const ESTADO_SIGUIENTE: Record<string, string> = {
  pendiente: 'en_proceso',
  en_proceso: 'completada',
  completada: 'pendiente',
}

const TIPO_EQUIPO_ICON: Record<string, React.ElementType> = {
  grua: Building2, excavadora: HardHat, retroexcavadora: HardHat,
  volquete: Truck, mezcladora: Wrench, bomba_concreto: Wrench,
  andamios: Building2, otro: Wrench,
}

const usd = (n?: number) =>
  n == null ? '—' : n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1_000)}K`
const num = (n?: number, d = 0) => n == null ? '—' : n.toLocaleString('es-PE', { maximumFractionDigits: d })

/** Duración en semanas de la fase según el cronograma del proyecto. */
function duracionFase(fase: string, cab: CabidaMin, fin: FinancieroMin): number | null {
  const ids: Record<string, string[]> = {
    excavacion:     ['excavacion', 'cimentacion'],
    construccion:   ['casco', 'albanileria'],
    acabados:       ['instalaciones', 'acabados', 'fachada'],
    administracion: ['compra', 'proyecto', 'licencia', 'conformidad', 'titulacion', 'entrega'],
  }
  const keys = ids[fase]
  if (!keys) return null
  const { tareas } = generarCronograma(cab, fin)
  const propias = tareas.filter((t) => keys.includes(t.id))
  if (propias.length === 0) return null
  const ini = Math.min(...propias.map((t) => t.inicio))
  const fin_ = Math.max(...propias.map((t) => t.inicio + t.duracion - 1))
  return fin_ - ini + 1
}

/** KPIs específicos de cada fase derivados del análisis del proyecto. */
function statsDeFase(fase: string, a: Analisis): { label: string; value: string }[] {
  const c = a.cabida
  const f = a.financiero
  const e = a.estructura
  if (!c || !f) return []
  const dur = duracionFase(fase, c, f)
  const durStr = dur ? `${dur} semanas` : '—'

  switch (fase) {
    case 'demolicion': {
      const costoDemo = f.costo_demolicion_usd ?? 0
      const areaDemo = costoDemo > 0 ? costoDemo / 45 : 0 // motor usa 45 USD/m²
      return costoDemo > 0
        ? [
            { label: 'Área a demoler', value: `${num(areaDemo)} m²` },
            { label: 'Costo estimado', value: usd(costoDemo) },
            { label: 'Tarifa motor C4', value: '$45 / m²' },
          ]
        : [{ label: 'Demolición', value: 'No aplica — terreno limpio' }]
    }
    case 'excavacion': {
      const volumen = c.sotanos > 0 ? c.planta_libre * c.sotanos * 3.5 : 0
      return [
        { label: 'Sótanos', value: String(c.sotanos) },
        { label: 'Vol. excavación est.', value: c.sotanos > 0 ? `~${num(volumen)} m³` : '—' },
        { label: 'Estac. en sótano', value: String(c.estacionamientos_en_sotano ?? '—') },
        { label: 'Duración (cronograma)', value: durStr },
      ]
    }
    case 'construccion':
      return [
        { label: 'Pisos de vivienda', value: String(c.pisos_vivienda) },
        { label: 'Área construida', value: `${num(c.area_construida_bruta)} m²` },
        { label: 'Concreto / Acero', value: e ? `${num(e.concreto_total_m3, 1)} m³ · ${num(e.acero_total_ton, 1)} t` : '—' },
        { label: 'Costo construcción', value: usd(f.costo_construccion_usd) },
        { label: 'Duración (cronograma)', value: durStr },
      ]
    case 'acabados':
      return [
        { label: 'Departamentos', value: String(c.num_departamentos) },
        { label: 'Área vendible', value: `${num(c.area_vendible_total)} m²` },
        { label: 'Área prom. / depto', value: c.num_departamentos > 0 ? `${num(c.area_vendible_total / c.num_departamentos, 1)} m²` : '—' },
        { label: 'Duración (cronograma)', value: durStr },
      ]
    case 'administracion':
      return [
        { label: 'Licencias + diseño', value: usd(f.costo_licencias_diseno_usd) },
        { label: 'Titulación SUNARP', value: usd(f.costo_titulacion_usd) },
        { label: 'Horizonte total', value: f.meses_proyecto ? `${f.meses_proyecto} meses` : '—' },
        { label: 'Punto de equilibrio', value: f.punto_equilibrio_deptos ? `${f.punto_equilibrio_deptos} deptos` : '—' },
      ]
    default:
      return []
  }
}

const SECCION_ICON: Record<string, React.ElementType> = {
  kv: FileText, tabla: Table2, lista: ListChecks,
}

function SeccionCard({ s }: { s: Seccion }) {
  const Icon = SECCION_ICON[s.tipo] ?? FileText
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{s.titulo}</p>
      </div>

      {s.tipo === 'kv' && (
        <div className="px-4 py-1">
          {(s.kv ?? []).map((par, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-xs text-slate-500">{par.label}</span>
              <span className="text-xs font-semibold text-slate-800 text-right">{par.valor}</span>
            </div>
          ))}
        </div>
      )}

      {s.tipo === 'tabla' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                {(s.columnas ?? []).map((col, i) => (
                  <th key={i} className="text-left font-medium text-slate-400 px-4 py-2 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.filas ?? []).map((fila, i) => (
                <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  {fila.map((celda, j) => (
                    <td key={j} className={`px-4 py-2 ${j === 0 ? 'font-medium text-slate-700' : 'text-slate-500'}`}>{celda}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {s.tipo === 'lista' && (
        <div className="px-4 py-2">
          {(s.items ?? []).map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProyectoFasePage() {
  const { id: proyectoId, fase } = useParams<{ id: string; fase: string }>()
  const token = useAuthStore((s) => s.token)
  const config = FASES_CONFIG[fase ?? '']

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [analisis, setAnalisis] = useState<Analisis>({})
  const [loading, setLoading] = useState(true)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)
  const seedEnCurso = useRef(false) // evita doble seed (StrictMode ejecuta el efecto 2 veces)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    if (!proyectoId || !fase) return
    setLoading(true)

    // Tareas (+ seed por defecto la primera vez)
    fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => r.json())
      .then(async (data: Tarea[]) => {
        if (data.length === 0 && config && !seedEnCurso.current) {
          seedEnCurso.current = true
          const creadas: Tarea[] = []
          for (const texto of config.tareasDefault) {
            const r = await fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, {
              method: 'POST', headers, body: JSON.stringify({ texto }),
            })
            creadas.push(await r.json())
          }
          setTareas(creadas)
          seedEnCurso.current = false
        } else if (data.length > 0) {
          setTareas(data)
        }
      })
      .finally(() => setLoading(false))

    // Equipos asignados a la fase (la IA los rellena con generar_proyecto)
    fetch(`${API_BASE}/equipos-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEquipos(Array.isArray(d) ? d : []))
      .catch(() => setEquipos([]))

    // Secciones estructuradas del módulo (sub-módulos generados por la IA)
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSecciones(Array.isArray(d?.datos?.secciones) ? d.datos.secciones : []))
      .catch(() => setSecciones([]))

    // Análisis del proyecto → KPIs de la fase
    fetch(`${API_BASE}/chat/${proyectoId}/analisis`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAnalisis(d ?? {}))
      .catch(() => setAnalisis({}))
  }, [proyectoId, fase])

  if (!config) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-400 text-sm">Fase no encontrada.</p>
    </div>
  )

  const Icon = config.icon
  const completadas = tareas.filter((t) => t.estado === 'completada').length
  const avance = tareas.length ? Math.round((completadas / tareas.length) * 100) : 0
  const stats = statsDeFase(fase!, analisis)

  async function avanzarEstado(tarea: Tarea) {
    const nuevoEstado = ESTADO_SIGUIENTE[tarea.estado] ?? 'pendiente'
    setGuardando(tarea.id)
    setTareas((prev) => prev.map((t) => t.id === tarea.id ? { ...t, estado: nuevoEstado as Tarea['estado'] } : t))
    await fetch(`${API_BASE}/tareas-fase/${tarea.id}/estado`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ estado: nuevoEstado }),
    })
    setGuardando(null)
  }

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return
    const r = await fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, {
      method: 'POST', headers,
      body: JSON.stringify({ texto: nuevaTarea.trim() }),
    })
    const nueva = await r.json()
    setTareas((prev) => [...prev, nueva])
    setNuevaTarea('')
    setAgregando(false)
  }

  async function eliminarTarea(id: string) {
    setTareas((prev) => prev.filter((t) => t.id !== id))
    await fetch(`${API_BASE}/tareas-fase/${id}`, { method: 'DELETE', headers })
  }

  async function eliminarEquipo(id: string) {
    setEquipos((prev) => prev.filter((e) => e.id !== id))
    await fetch(`${API_BASE}/equipos-fase/${id}`, { method: 'DELETE', headers })
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${config.color}`}>
        <div className="w-12 h-12 rounded-2xl bg-white/60 flex items-center justify-center shrink-0">
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-slate-800">{config.nombre}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{config.descripcion}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-slate-800">{avance}%</p>
          <p className="text-xs text-slate-500">{completadas}/{tareas.length} tareas</p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className="bg-blue-600 h-2 rounded-full transition-all duration-500" style={{ width: `${avance}%` }} />
      </div>

      {/* KPIs de la fase (derivados del análisis) */}
      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-[11px] text-slate-400 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold text-slate-800">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {stats.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          Ejecuta el análisis con el Asistente C4 para ver los datos clave de esta fase (volúmenes, costos, duración).
        </div>
      )}

      {/* Sub-módulos de la fase (secciones estructuradas generadas por la IA) */}
      {secciones.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {secciones.map((s, i) => <SeccionCard key={i} s={s} />)}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          Este módulo aún no tiene su plan detallado (permisos, metrados, materiales, gestión). Pídele al Asistente C4: «genera el proyecto» y se rellenará automáticamente.
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-5 items-start">
        {/* Checklist de tareas */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Plan de ejecución</p>
            <span className="text-xs text-slate-400">{completadas} completadas</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Cargando...</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {tareas.map((tarea) => (
                <div key={tarea.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                  <button onClick={() => avanzarEstado(tarea)} className="shrink-0">
                    {guardando === tarea.id
                      ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      : tarea.estado === 'completada'
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : tarea.estado === 'en_proceso'
                          ? <Clock className="w-4 h-4 text-blue-500" />
                          : <Circle className="w-4 h-4 text-slate-300" />
                    }
                  </button>
                  <span className={`text-sm flex-1 ${tarea.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {tarea.texto}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium hidden group-hover:inline-block ${
                    tarea.estado === 'completada' ? 'bg-slate-100 text-slate-500' :
                    tarea.estado === 'en_proceso' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {tarea.estado === 'pendiente' ? 'Iniciar' : tarea.estado === 'en_proceso' ? 'Completar' : 'Reabrir'}
                  </span>
                  <button
                    onClick={() => eliminarTarea(tarea.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-5 py-3 border-t border-slate-100">
            {agregando ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nuevaTarea}
                  onChange={(e) => setNuevaTarea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') agregarTarea()
                    if (e.key === 'Escape') { setAgregando(false); setNuevaTarea('') }
                  }}
                  placeholder="Nombre de la tarea..."
                  className="flex-1 text-sm text-slate-700 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button onClick={agregarTarea} className="text-xs bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-500 transition-colors">
                  Agregar
                </button>
                <button onClick={() => { setAgregando(false); setNuevaTarea('') }} className="text-xs text-slate-400 px-2 py-2">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAgregando(true)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar tarea
              </button>
            )}
          </div>
        </div>

        {/* Maquinaria y equipos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
            <Truck className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Maquinaria y equipos</p>
          </div>

          {equipos.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-slate-400 leading-relaxed">
                Sin equipos asignados a esta fase.<br />
                El Asistente C4 los asigna automáticamente al generar el proyecto, o agrégalos desde el chat.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {equipos.map((eq) => {
                const EqIcon = TIPO_EQUIPO_ICON[eq.tipo] ?? Wrench
                return (
                  <div key={eq.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <EqIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 leading-tight">{eq.nombre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium uppercase tracking-wide">
                            {eq.tipo.replace('_', ' ')}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            eq.estado === 'en_obra' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {eq.estado === 'disponible' ? 'Recomendado' : eq.estado}
                          </span>
                        </div>
                        {eq.notas && (
                          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{eq.notas}</p>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarEquipo(eq.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1 rounded shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Nota cronograma */}
          <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-1.5">
            <CalendarRange className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <p className="text-[11px] text-slate-400">
              La duración de la fase sale del Gantt del proyecto (pestaña Análisis → Cronograma).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
