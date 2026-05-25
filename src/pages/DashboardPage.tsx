import { useEffect, useState } from 'react'
import { FolderKanban, HardHat, Clock, CheckCircle2, Plus, MapPin, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
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

  const stats = [
    { label: 'Proyectos activos', value: proyectos.length, icon: FolderKanban, color: 'bg-blue-50 text-blue-600' },
    { label: 'En ejecución', value: proyectos.filter((p) => p.estado === 'ejecucion').length, icon: HardHat, color: 'bg-orange-50 text-orange-600' },
    { label: 'En proceso', value: proyectos.filter((p) => !p.estado || p.estado === 'proceso').length, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
    { label: 'Completados', value: proyectos.filter((p) => p.estado === 'completado').length, icon: CheckCircle2, color: 'bg-green-50 text-green-600' },
  ]

  const recientes = proyectos.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Bienvenido, {user?.nombre?.split(' ')[0]}
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Aquí tienes el resumen de tus proyectos de obra
          </p>
        </div>
        <button
          onClick={() => navigate('/proyectos')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-slate-500 text-sm">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-semibold text-slate-800">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Proyectos recientes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Proyectos recientes</h3>
          <button onClick={() => navigate('/proyectos')} className="text-blue-600 text-xs font-medium hover:text-blue-500">
            Ver todos →
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : recientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <HardHat className="w-8 h-8 text-slate-200" />
            <p className="text-sm text-slate-400">Aún no tienes proyectos. ¡Crea el primero!</p>
          </div>
        ) : (
          recientes.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/proyectos/${p.id}/panel`)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <HardHat className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{p.nombre}</p>
                <div className="flex items-center gap-3 mt-1">
                  {p.distrito && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.distrito}
                    </span>
                  )}
                  <span className="text-xs text-blue-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> IA activa
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </button>
          ))
        )}

        <div className="px-6 py-4 flex items-center justify-center border-t border-slate-100">
          <button onClick={() => navigate('/proyectos')} className="text-slate-400 text-xs font-medium hover:text-blue-500 transition-colors flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Crear nuevo proyecto
          </button>
        </div>
      </div>
    </div>
  )
}
