import { useEffect, useState } from 'react'
import { Plus, MapPin, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

interface Proyecto {
  id: string
  nombre: string
  distrito?: string
  estado?: string
  createdAt: string
}

const PHASE_IMGS = [
  '/phases/construccion.jpg',
  '/phases/excavacion.jpg',
  '/phases/acabados.jpg',
  '/phases/demolicion.jpg',
  '/phases/administracion.jpg',
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [slideIdx, setSlideIdx] = useState(0)

  useEffect(() => {
    api.get('/proyectos')
      .then((r) => setProyectos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setSlideIdx((i) => (i + 1) % PHASE_IMGS.length), 4500)
    return () => clearInterval(t)
  }, [])

  const firstName = user?.nombre?.split(' ')[0] ?? 'Ing.'

  const stats = [
    { label: 'Proyectos totales', value: proyectos.length },
    { label: 'En ejecución',      value: proyectos.filter((p) => p.estado === 'ejecucion').length },
    { label: 'En proceso',        value: proyectos.filter((p) => !p.estado || p.estado === 'proceso').length },
    { label: 'Completados',       value: proyectos.filter((p) => p.estado === 'completado').length },
  ]

  return (
    <div className="space-y-4">

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden h-48">
        {PHASE_IMGS.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 40%',
              opacity: i === slideIdx ? 1 : 0,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-black/20" />

        <div className="relative z-10 h-full flex flex-col justify-between p-7">
          <div>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-[0.22em] mb-1.5">
              Panel de control
            </p>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Bienvenido, {firstName}
            </h1>
            <p className="text-white/40 text-sm mt-1">
              {proyectos.length === 0
                ? 'Crea tu primer proyecto para comenzar'
                : `${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''} en tu portafolio`}
            </p>
          </div>

          {/* Slide dots */}
          <div className="flex items-center gap-1.5">
            {PHASE_IMGS.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                className={`h-px rounded-full transition-all duration-300 ${
                  i === slideIdx ? 'w-5 bg-white' : 'w-2 bg-white/25'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/proyectos')}
          className="absolute top-6 right-6 z-10 flex items-center gap-1.5 bg-white text-slate-900
            text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-slate-100 transition-colors shadow-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          Nuevo proyecto
        </button>
      </div>

      {/* ── 2. STATS ────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-4 gap-3">
          {stats.map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-100 px-6 py-4">
              <p className="text-3xl font-black text-slate-800 tabular-nums leading-none">{value}</p>
              <p className="text-slate-400 text-xs mt-1.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. PROYECTOS ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Mis proyectos</h2>
          <button
            onClick={() => navigate('/proyectos')}
            className="text-xs text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-36">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : proyectos.length === 0 ? (
          <div
            className="relative rounded-2xl overflow-hidden h-44 flex items-center justify-center cursor-pointer group"
            style={{ backgroundImage: "url('/phases/excavacion.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            onClick={() => navigate('/proyectos')}
          >
            <div className="absolute inset-0 bg-black/65 group-hover:bg-black/55 transition-colors" />
            <div className="relative z-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <p className="text-white font-semibold text-sm">Crear primer proyecto</p>
              <p className="text-white/50 text-xs mt-1">Comienza tu análisis de pre-inversión</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {proyectos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => navigate(`/proyectos/${p.id}/panel`)}
                className="relative overflow-hidden rounded-xl h-40 text-left group
                  hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/25
                  transition-all duration-300"
                style={{
                  backgroundImage: `url(${PHASE_IMGS[i % PHASE_IMGS.length]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-transparent
                  group-hover:from-black/70 transition-all duration-300" />

                <span className="absolute top-3 left-4 font-mono text-[10px] text-white/35 tracking-[0.2em]">
                  {String(i + 1).padStart(2, '0')}
                </span>

                <span className="absolute top-3 right-3 text-[10px] font-medium text-white/55
                  bg-white/10 backdrop-blur-sm border border-white/10 rounded-full px-2 py-0.5 uppercase tracking-wide">
                  {p.estado ?? 'Activo'}
                </span>

                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <p className="text-sm font-bold text-white leading-tight truncate">{p.nombre}</p>
                  <div className="flex items-center justify-between mt-1">
                    {p.distrito ? (
                      <span className="text-[11px] text-white/55 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />{p.distrito}
                      </span>
                    ) : <span />}
                    <ChevronRight className="w-3.5 h-3.5 text-white/35 group-hover:text-white/70
                      group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                </div>
              </button>
            ))}

            <button
              onClick={() => navigate('/proyectos')}
              className="rounded-xl h-40 border border-dashed border-slate-200
                flex flex-col items-center justify-center gap-2
                hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-xs font-medium text-slate-400">Nuevo proyecto</p>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
