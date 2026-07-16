import { useEffect, useState } from 'react'
import { MapPin, Hammer, CheckCircle2, Layers } from 'lucide-react'
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
  const user = useAuthStore((s) => s.user)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])

  useEffect(() => {
    api.get('/proyectos')
      .then((r) => setProyectos(r.data))
      .catch(() => {})
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

    </div>
  )
}
