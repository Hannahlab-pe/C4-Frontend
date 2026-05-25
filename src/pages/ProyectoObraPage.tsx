import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Sparkles, HardHat, Hammer, Building2,
  PaintBucket, ClipboardList, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Clock, AlertCircle, Plus,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoFase = 'pendiente' | 'activa' | 'completada'
type EstadoTarea = 'pendiente' | 'en_proceso' | 'completada' | 'bloqueada'

interface Tarea {
  id: number
  nombre: string
  estado: EstadoTarea
  responsable?: string
}

interface Fase {
  id: string
  nombre: string
  descripcion: string
  icon: React.ElementType
  color: string
  colorLight: string
  estado: EstadoFase
  avance: number
  tareas: Tarea[]
}

// ─── Data inicial ─────────────────────────────────────────────────────────────

const FASES_INIT: Fase[] = [
  {
    id: 'demolicion',
    nombre: 'Demolición',
    descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    icon: Hammer,
    color: 'text-red-600',
    colorLight: 'bg-red-50 border-red-200',
    estado: 'pendiente',
    avance: 0,
    tareas: [
      { id: 1, nombre: 'Inspección previa y certificados', estado: 'pendiente' },
      { id: 2, nombre: 'Contrato empresa demoledora', estado: 'pendiente' },
      { id: 3, nombre: 'Retiro de instalaciones eléctricas', estado: 'pendiente' },
      { id: 4, nombre: 'Demolición estructural', estado: 'pendiente' },
      { id: 5, nombre: 'Limpieza y desmonte', estado: 'pendiente' },
    ],
  },
  {
    id: 'excavacion',
    nombre: 'Excavación',
    descripcion: 'Movimiento de tierras, sótanos y calzaduras',
    icon: HardHat,
    color: 'text-orange-600',
    colorLight: 'bg-orange-50 border-orange-200',
    estado: 'pendiente',
    avance: 0,
    tareas: [
      { id: 6, nombre: 'Estudio de suelos', estado: 'pendiente' },
      { id: 7, nombre: 'Diseño de calzaduras', estado: 'pendiente' },
      { id: 8, nombre: 'Excavación masiva', estado: 'pendiente' },
      { id: 9, nombre: 'Calzaduras y anclajes', estado: 'pendiente' },
      { id: 10, nombre: 'Habilitación para cimentación', estado: 'pendiente' },
    ],
  },
  {
    id: 'construccion',
    nombre: 'Construcción',
    descripcion: 'Casco estructural: cimentación, columnas, losas y muros',
    icon: Building2,
    color: 'text-blue-600',
    colorLight: 'bg-blue-50 border-blue-200',
    estado: 'pendiente',
    avance: 0,
    tareas: [
      { id: 11, nombre: 'Cimentación y zapatas', estado: 'pendiente' },
      { id: 12, nombre: 'Sótano: muros y losa', estado: 'pendiente' },
      { id: 13, nombre: 'Pisos de vivienda — estructura', estado: 'pendiente' },
      { id: 14, nombre: 'Instalaciones sanitarias empotradas', estado: 'pendiente' },
      { id: 15, nombre: 'Instalaciones eléctricas empotradas', estado: 'pendiente' },
      { id: 16, nombre: 'Azotea y tanque elevado', estado: 'pendiente' },
    ],
  },
  {
    id: 'acabados',
    nombre: 'Acabados',
    descripcion: 'Albañilería, revestimientos, pintura y equipamiento',
    icon: PaintBucket,
    color: 'text-green-600',
    colorLight: 'bg-green-50 border-green-200',
    estado: 'pendiente',
    avance: 0,
    tareas: [
      { id: 17, nombre: 'Tabiquería y muros interiores', estado: 'pendiente' },
      { id: 18, nombre: 'Pisos y revestimientos', estado: 'pendiente' },
      { id: 19, nombre: 'Carpintería (puertas y ventanas)', estado: 'pendiente' },
      { id: 20, nombre: 'Pintura interior y exterior', estado: 'pendiente' },
      { id: 21, nombre: 'Aparatos sanitarios y grifería', estado: 'pendiente' },
      { id: 22, nombre: 'Tableros eléctricos y tomacorrientes', estado: 'pendiente' },
    ],
  },
  {
    id: 'administracion',
    nombre: 'Administración',
    descripcion: 'Licencias, SUNARP, independizaciones y entrega',
    icon: ClipboardList,
    color: 'text-purple-600',
    colorLight: 'bg-purple-50 border-purple-200',
    estado: 'activa',
    avance: 20,
    tareas: [
      { id: 23, nombre: 'Licencia de construcción', estado: 'en_proceso' },
      { id: 24, nombre: 'Pólizas de seguro CAR', estado: 'pendiente' },
      { id: 25, nombre: 'Independización y SUNARP', estado: 'pendiente' },
      { id: 26, nombre: 'Declaratoria de fábrica', estado: 'pendiente' },
      { id: 27, nombre: 'Entrega a compradores', estado: 'pendiente' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_FASE: Record<EstadoFase, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',   color: 'bg-slate-100 text-slate-500' },
  activa:     { label: 'En progreso', color: 'bg-blue-100 text-blue-700' },
  completada: { label: 'Completada',  color: 'bg-green-100 text-green-700' },
}

const ESTADO_TAREA_ICON: Record<EstadoTarea, React.ReactNode> = {
  pendiente:  <Circle       className="w-3.5 h-3.5 text-slate-300 shrink-0" />,
  en_proceso: <Clock        className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
  completada: <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />,
  bloqueada:  <AlertCircle  className="w-3.5 h-3.5 text-red-400 shrink-0" />,
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProyectoObraPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [fases, setFases] = useState<Fase[]>(FASES_INIT)
  const [expandida, setExpandida] = useState<string | null>('administracion')

  const avanceTotal = Math.round(fases.reduce((acc, f) => acc + f.avance, 0) / fases.length)

  function toggleTarea(faseId: string, tareaId: number) {
    setFases((prev) =>
      prev.map((f) => {
        if (f.id !== faseId) return f
        const tareas = f.tareas.map((t) =>
          t.id === tareaId
            ? { ...t, estado: (t.estado === 'completada' ? 'pendiente' : 'completada') as EstadoTarea }
            : t,
        )
        const completadas = tareas.filter((t) => t.estado === 'completada').length
        const avance = Math.round((completadas / tareas.length) * 100)
        const estado: EstadoFase = avance === 100 ? 'completada' : avance > 0 ? 'activa' : 'pendiente'
        return { ...f, tareas, avance, estado }
      }),
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/proyectos/${id}`)}
            className="w-8 h-8 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Gestión de Obra</h2>
            <p className="text-xs text-slate-400">5 fases · {avanceTotal}% avance general</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/proyectos/${id}`)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Chat IA
        </button>
      </div>

      {/* Barra avance general */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-700">Avance general del proyecto</p>
          <span className="text-lg font-bold text-slate-800">{avanceTotal}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${avanceTotal}%` }}
          />
        </div>
        <div className="flex gap-4 mt-4">
          {fases.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.id} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  f.estado === 'completada' ? 'bg-green-100' :
                  f.estado === 'activa' ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  <Icon className={`w-4 h-4 ${
                    f.estado === 'completada' ? 'text-green-600' :
                    f.estado === 'activa' ? 'text-blue-600' : 'text-slate-400'
                  }`} />
                </div>
                <span className="text-[10px] text-slate-500 text-center leading-tight">{f.nombre}</span>
                <span className="text-[10px] font-semibold text-slate-700">{f.avance}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-2">
        {fases.map((fase, idx) => {
          const Icon = fase.icon
          const abierta = expandida === fase.id
          const { label, color } = ESTADO_FASE[fase.estado]

          return (
            <div key={fase.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Cabecera de fase */}
              <button
                onClick={() => setExpandida(abierta ? null : fase.id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                {/* Número + icono */}
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${fase.colorLight}`}>
                    <Icon className={`w-4 h-4 ${fase.color}`} />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-800">{fase.nombre}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{fase.descripcion}</p>
                </div>

                {/* Avance + chevron */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="w-24">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-slate-400">Avance</span>
                      <span className="text-xs font-semibold text-slate-600">{fase.avance}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          fase.estado === 'completada' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${fase.avance}%` }}
                      />
                    </div>
                  </div>
                  {abierta
                    ? <ChevronDown className="w-4 h-4 text-slate-400" />
                    : <ChevronRight className="w-4 h-4 text-slate-400" />
                  }
                </div>
              </button>

              {/* Tareas expandidas */}
              {abierta && (
                <div className="border-t border-slate-100 px-5 py-3 space-y-1">
                  {fase.tareas.map((tarea) => (
                    <button
                      key={tarea.id}
                      onClick={() => toggleTarea(fase.id, tarea.id)}
                      className="w-full flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors text-left group"
                    >
                      {ESTADO_TAREA_ICON[tarea.estado]}
                      <span className={`text-xs flex-1 ${
                        tarea.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}>
                        {tarea.nombre}
                      </span>
                    </button>
                  ))}
                  <button className="w-full flex items-center gap-2 py-2 px-3 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-50 transition-colors text-left mt-1">
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">Agregar tarea</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
