import { useEffect, useState } from 'react'
import { MapPin, ChevronRight, Loader2, Building2, Hammer, CheckCircle2, Layers, ArrowRight } from 'lucide-react'
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

function fmtFecha(iso?: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return '' }
}

function estadoCfg(estado?: string) {
  const e = (estado ?? 'activo').toLowerCase()
  if (e === 'completado') return { txt: 'Completado', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
  if (e === 'borrador')   return { txt: 'Borrador',   cls: 'bg-slate-100 text-slate-500 border-slate-200' }
  return { txt: 'Activo', cls: 'bg-blue-50 text-blue-600 border-blue-200' }
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/proyectos')
      .then((r) => setProyectos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const stats = [
    { label: 'Proyectos totales', value: proyectos.length, icon: Layers },
    { label: 'Activos',           value: proyectos.filter((p) => !p.estado || ['activo', 'proceso', 'ejecucion'].includes(p.estado)).length, icon: Hammer },
    { label: 'Completados',       value: proyectos.filter((p) => p.estado === 'completado').length, icon: CheckCircle2 },
    { label: 'Distritos',         value: new Set(proyectos.map((p) => p.distrito).filter(Boolean)).size, icon: MapPin },
  ]

  const recientes = [...proyectos]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 3)

  return (
    <div className="space-y-6">

      {/* ── Header limpio ── */}
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-1 first-letter:uppercase">
          {fechaHoy.charAt(0).toUpperCase() + fechaHoy.slice(1)}
        </p>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Bienvenido, {user?.nombre ?? 'Ingeniero'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {proyectos.length === 0
            ? 'Aún no tienes proyectos en tu portafolio.'
            : `Tienes ${proyectos.length} proyecto${proyectos.length !== 1 ? 's' : ''} en tu portafolio.`}
        </p>
      </div>

      {/* ── Métricas ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Proyectos recientes ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700">Proyectos recientes</h2>
          <button
            onClick={() => navigate('/proyectos')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            Ver todos los proyectos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-36">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : recientes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 px-6 py-12 text-center">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">Sin proyectos todavía</p>
            <p className="text-xs text-slate-400 mt-1">Crea tu primer proyecto desde el panel de Proyectos.</p>
            <button
              onClick={() => navigate('/proyectos')}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors"
            >
              Ir a Proyectos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recientes.map((p) => {
              const est = estadoCfg(p.estado)
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/proyectos/${p.id}/panel`)}
                  className="bg-white rounded-2xl border border-slate-200 p-5 text-left group flex flex-col
                    hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 hover:border-blue-200
                    transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xl font-black text-slate-900 leading-snug tracking-tight line-clamp-2 flex-1">{p.nombre}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 mt-1 ${est.cls}`}>
                      {est.txt}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2.5">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" /> {p.distrito || 'Sin distrito'}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">{fmtFecha(p.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-end mt-auto pt-4">
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 group-hover:text-blue-500 transition-colors">
                      Abrir panel <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
