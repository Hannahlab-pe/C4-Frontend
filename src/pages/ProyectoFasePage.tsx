import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Hammer, HardHat, Building2, PaintBucket, ClipboardList,
  CheckCircle2, Circle, Clock, Plus, Trash2, Loader2,
  Truck, Wrench, Sparkles, Table2, ListChecks, FileText,
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
  }
  estructura?: { concreto_total_m3: number; acero_total_ton: number }
}

const FASES_CONFIG: Record<string, {
  nombre: string; descripcion: string; icon: React.ElementType
  accent: string
  tareasDefault: string[]
}> = {
  demolicion: {
    nombre: 'Demolición', descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    icon: Hammer, accent: 'bg-red-500',
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
    icon: HardHat, accent: 'bg-orange-500',
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
    icon: Building2, accent: 'bg-blue-600',
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
    icon: PaintBucket, accent: 'bg-emerald-500',
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
    icon: ClipboardList, accent: 'bg-violet-500',
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
        { label: 'Duración', value: durStr },
      ]
    }
    case 'construccion':
      return [
        { label: 'Pisos de vivienda', value: String(c.pisos_vivienda) },
        { label: 'Área construida', value: `${num(c.area_construida_bruta)} m²` },
        { label: 'Concreto / Acero', value: e ? `${num(e.concreto_total_m3, 1)} m³ · ${num(e.acero_total_ton, 1)} t` : '—' },
        { label: 'Costo construcción', value: usd(f.costo_construccion_usd) },
        { label: 'Duración', value: durStr },
      ]
    case 'acabados':
      return [
        { label: 'Departamentos', value: String(c.num_departamentos) },
        { label: 'Área vendible', value: `${num(c.area_vendible_total)} m²` },
        { label: 'Área prom. / depto', value: c.num_departamentos > 0 ? `${num(c.area_vendible_total / c.num_departamentos, 1)} m²` : '—' },
        { label: 'Duración', value: durStr },
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

/** Sección del expediente técnico — bloque dentro del documento, no card suelta. */
function SeccionBloque({ s }: { s: Seccion }) {
  const Icon = SECCION_ICON[s.tipo] ?? FileText
  return (
    <section className="px-6 py-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.titulo}</h3>
      </div>

      {s.tipo === 'kv' && (
        <dl className="grid sm:grid-cols-2 gap-x-10">
          {(s.kv ?? []).map((par, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
              <dt className="text-xs text-slate-500">{par.label}</dt>
              <dd className="text-xs font-semibold text-slate-900 text-right">{par.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {s.tipo === 'tabla' && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {(s.columnas ?? []).map((col, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 py-2 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.filas ?? []).map((fila, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {fila.map((celda, j) => (
                    <td key={j} className={`px-1 py-2.5 align-top ${j === 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                      {celda}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {s.tipo === 'lista' && (
        <ul className="grid sm:grid-cols-2 gap-x-10">
          {(s.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 py-1.5 border-b border-slate-100">
              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.75" />
              <span className="text-xs text-slate-600 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
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

    // Secciones estructuradas del módulo (expediente generado por la IA)
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
    <div className="h-full overflow-y-auto p-6 space-y-4">

      {/* ── Header sobrio ── */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex items-center gap-4">
        <div className="relative w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${config.accent}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-slate-900 leading-tight">{config.nombre}</h1>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{config.descripcion}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avance</p>
            <p className="text-sm font-bold text-slate-900">{avance}% <span className="text-slate-400 font-normal">· {completadas}/{tareas.length}</span></p>
          </div>
          <div className="w-28 bg-slate-100 rounded-full h-1.5">
            <div className="bg-slate-900 h-1.5 rounded-full transition-all duration-500" style={{ width: `${avance}%` }} />
          </div>
        </div>
      </div>

      {/* ── Franja de indicadores ── */}
      {stats.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 grid divide-x divide-slate-100"
          style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-3.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 truncate">{s.label}</p>
              <p className="text-sm font-bold text-slate-900 truncate" title={s.value}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">

        {/* ── Expediente técnico de la fase (documento único, no cards) ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Expediente técnico de la fase</h2>
            </div>
            {secciones.length > 0 && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-500" /> Generado por Asistente C4
              </span>
            )}
          </div>

          {secciones.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {secciones.map((s, i) => <SeccionBloque key={i} s={s} />)}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Sparkles className="w-6 h-6 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Expediente sin generar</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Permisos, metrados, materiales y gestión de la fase se generan desde el chat.
                Pídele al Asistente C4: «genera el proyecto».
              </p>
            </div>
          )}
        </div>

        {/* ── Columna derecha: ejecución ── */}
        <div className="space-y-4">

          {/* Plan de ejecución */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Plan de ejecución</h2>
              <span className="text-[10px] text-slate-400">{completadas}/{tareas.length}</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm">Cargando...</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {tareas.map((tarea) => (
                  <div key={tarea.id} className="flex items-center gap-2.5 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <button onClick={() => avanzarEstado(tarea)} className="shrink-0" title="Cambiar estado">
                      {guardando === tarea.id
                        ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        : tarea.estado === 'completada'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : tarea.estado === 'en_proceso'
                            ? <Clock className="w-4 h-4 text-blue-500" />
                            : <Circle className="w-4 h-4 text-slate-300" />
                      }
                    </button>
                    <span className={`text-xs flex-1 leading-relaxed ${tarea.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {tarea.texto}
                    </span>
                    <button
                      onClick={() => eliminarTarea(tarea.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
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
                    placeholder="Nueva tarea..."
                    className="flex-1 text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button onClick={agregarTarea} className="text-[11px] bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    Agregar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAgregando(true)}
                  className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar tarea
                </button>
              )}
            </div>
          </div>

          {/* Maquinaria y equipos */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Maquinaria y equipos</h2>
              <Truck className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {equipos.length === 0 ? (
              <p className="text-[11px] text-slate-400 leading-relaxed px-5 py-6 text-center">
                Sin equipos asignados. El Asistente C4 los asigna al generar el proyecto.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {equipos.map((eq) => {
                  const EqIcon = TIPO_EQUIPO_ICON[eq.tipo] ?? Wrench
                  return (
                    <div key={eq.id} className="px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 mt-0.5">
                          <EqIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 leading-tight">{eq.nombre}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                            {eq.tipo.replace('_', ' ')} · {eq.estado === 'disponible' ? 'recomendado' : eq.estado}
                          </p>
                          {eq.notas && (
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{eq.notas}</p>
                          )}
                        </div>
                        <button
                          onClick={() => eliminarEquipo(eq.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
