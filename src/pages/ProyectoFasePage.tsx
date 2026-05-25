import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Hammer, HardHat, Building2, PaintBucket, ClipboardList,
  CheckCircle2, Circle, Clock, Plus, Trash2, Loader2,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'

interface Tarea {
  id: string
  texto: string
  estado: 'pendiente' | 'en_proceso' | 'completada'
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

export default function ProyectoFasePage() {
  const { id: proyectoId, fase } = useParams<{ id: string; fase: string }>()
  const token = useAuthStore((s) => s.token)
  const config = FASES_CONFIG[fase ?? '']

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    if (!proyectoId || !fase) return
    setLoading(true)
    fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => r.json())
      .then(async (data: Tarea[]) => {
        if (data.length === 0 && config) {
          // Seed tareas por defecto la primera vez
          const creadas: Tarea[] = []
          for (const texto of config.tareasDefault) {
            const r = await fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ texto }),
            })
            creadas.push(await r.json())
          }
          setTareas(creadas)
        } else {
          setTareas(data)
        }
      })
      .finally(() => setLoading(false))
  }, [proyectoId, fase])

  if (!config) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-400 text-sm">Fase no encontrada.</p>
    </div>
  )

  const Icon = config.icon
  const completadas = tareas.filter((t) => t.estado === 'completada').length
  const avance = tareas.length ? Math.round((completadas / tareas.length) * 100) : 0

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

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">Tareas</p>
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
            <button onClick={() => setAgregando(true)} className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Agregar tarea
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
