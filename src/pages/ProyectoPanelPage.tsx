import { useNavigate, useParams } from 'react-router-dom'
import {
  Hammer, HardHat, Building2,
  PaintBucket, ClipboardList, ChevronRight,
} from 'lucide-react'

const FASES = [
  {
    slug: 'demolicion',
    nombre: 'Demolición',
    descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    icon: Hammer,
    color: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600',
    dot: 'bg-red-400',
  },
  {
    slug: 'excavacion',
    nombre: 'Excavación',
    descripcion: 'Movimiento de tierras, sótanos y calzaduras',
    icon: HardHat,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'text-orange-600',
    dot: 'bg-orange-400',
  },
  {
    slug: 'construccion',
    nombre: 'Construcción',
    descripcion: 'Casco estructural: cimentación, columnas, losas y muros',
    icon: Building2,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    dot: 'bg-blue-400',
  },
  {
    slug: 'acabados',
    nombre: 'Acabados',
    descripcion: 'Albañilería, revestimientos, pintura y equipamiento',
    icon: PaintBucket,
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    dot: 'bg-green-400',
  },
  {
    slug: 'administracion',
    nombre: 'Administración',
    descripcion: 'Licencias, SUNARP, independizaciones y entrega',
    icon: ClipboardList,
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    dot: 'bg-purple-400',
  },
]

export default function ProyectoPanelPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-3 gap-3">
        {FASES.map(({ slug, nombre, descripcion, icon: Icon, color, iconColor, dot }) => (
          <button
            key={slug}
            onClick={() => navigate(`/proyectos/${id}/panel/${slug}`)}
            className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-3 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 hover:bg-slate-50 transition-all duration-200 text-left group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${color}`}>
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{nombre}</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{descripcion}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className={`w-1.5 h-1.5 rounded-full ${dot} opacity-50`} />
                Pendiente
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
