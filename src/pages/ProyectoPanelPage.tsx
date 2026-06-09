import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

const FASES = [
  {
    slug: 'demolicion',
    label: '01',
    nombre: 'Demolición',
    descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    img: '/phases/demolicion.jpg',
  },
  {
    slug: 'excavacion',
    label: '02',
    nombre: 'Excavación',
    descripcion: 'Movimiento de tierras, sótanos y calzaduras',
    img: '/phases/excavacion.jpg',
  },
  {
    slug: 'construccion',
    label: '03',
    nombre: 'Construcción',
    descripcion: 'Casco estructural: cimentación, columnas, losas y muros',
    img: '/phases/construccion.jpg',
  },
  {
    slug: 'acabados',
    label: '04',
    nombre: 'Acabados',
    descripcion: 'Albañilería, revestimientos, pintura y equipamiento',
    img: '/phases/acabados.jpg',
  },
  {
    slug: 'administracion',
    label: '05',
    nombre: 'Administración',
    descripcion: 'Licencias, SUNARP, independizaciones y entrega',
    img: '/phases/administracion.jpg',
  },
]

export default function ProyectoPanelPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="grid grid-cols-3 gap-3">
        {FASES.map(({ slug, label, nombre, descripcion, img }) => (
          <button
            key={slug}
            onClick={() => navigate(`/proyectos/${id}/panel/${slug}`)}
            className="relative overflow-hidden rounded-xl h-48 text-left group
              hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/40
              transition-all duration-300"
            style={{ backgroundImage: `url(${img})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            {/* Gradient overlay — dark at bottom for text, subtle at top */}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/40 to-black/10
              group-hover:from-black/75 group-hover:via-black/30 transition-all duration-300" />

            {/* Top-left: phase number */}
            <span className="absolute top-3.5 left-4 font-mono text-[11px] text-white/50 tracking-[0.25em]">
              {label}
            </span>

            {/* Top-right: status pill */}
            <span className="absolute top-3 right-3 text-[10px] font-medium text-white/60
              bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-2.5 py-0.5 uppercase tracking-wide">
              Pendiente
            </span>

            {/* Bottom content */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
              <p className="text-sm font-semibold text-white leading-tight">{nombre}</p>
              <p className="text-[11px] text-white/60 mt-0.5 leading-relaxed line-clamp-2">{descripcion}</p>
            </div>

            {/* Hover arrow */}
            <div className="absolute bottom-4 right-4 z-10
              opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
              transition-all duration-200">
              <ChevronRight className="w-4 h-4 text-white/80" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
