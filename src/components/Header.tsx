import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/proyectos': 'Proyectos',
}

export default function Header() {
  const { pathname } = useLocation()

  const title =
    Object.entries(titles).find(([path]) => pathname.startsWith(path))?.[1] ??
    'C4'

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
      </div>
    </header>
  )
}
