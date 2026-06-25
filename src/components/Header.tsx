import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

const STATIC_TITLES: Record<string, string> = {
  '/dashboard':        'Dashboard',
  '/base-conocimiento': 'Base de Conocimiento',
}

export default function Header() {
  const { pathname } = useLocation()
  const user = useAuthStore((s) => s.user)
  const [proyectoNombre, setProyectoNombre] = useState<string | null>(null)

  const proyectoIdMatch = pathname.match(/^\/proyectos\/([^/]+)/)
  const proyectoId = proyectoIdMatch?.[1]

  useEffect(() => {
    if (!proyectoId) { setProyectoNombre(null); return }
    api.get(`/proyectos/${proyectoId}`)
      .then(r => setProyectoNombre(r.data.nombre))
      .catch(() => setProyectoNombre(null))
  }, [proyectoId])

  let title = 'C4'
  if (proyectoId) {
    title = proyectoNombre ? `Proyecto · ${proyectoNombre}` : 'Proyecto'
  } else {
    const staticMatch = Object.entries(STATIC_TITLES).find(([path]) => pathname.startsWith(path))
    if (staticMatch) title = staticMatch[1]
    else if (pathname.startsWith('/proyectos')) title = 'Proyectos'
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2 w-56">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            placeholder="Buscar proyecto..."
            className="bg-transparent text-xs text-slate-600 placeholder:text-slate-400 outline-none w-full"
          />
        </div>
        <button className="relative w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
          <Bell className="w-4 h-4 text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        {/* Usuario */}
        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.nombre?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-xs font-semibold text-slate-800 truncate max-w-40">{user?.nombre ?? 'Usuario'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
