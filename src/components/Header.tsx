import { Bell, Search, Menu, User } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'

export default function Header() {
  const user = useAuthStore((s) => s.user)
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav)

  return (
    <header className="h-16 bg-[var(--c4-topbar)] text-white flex items-center gap-4 px-4 md:px-5 shrink-0 border-b border-white/5 z-30">
      {/* Izquierda: hamburguesa (mobile) + marca */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <button
          onClick={toggleMobileNav}
          className="md:hidden -ml-1 w-9 h-9 rounded-lg flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors shrink-0"
          title="Menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-baseline gap-2 shrink-0">
          <span className="font-display text-2xl font-extrabold leading-none tracking-tight">C<span className="text-blue-500">4</span></span>
        </div>
      </div>

      {/* Centro: buscador centrado (la zona flex-1 fija además las acciones a la derecha) */}
      <div className="hidden md:flex flex-1 justify-center min-w-0">
        <div className="flex items-center gap-2.5 w-full max-w-lg bg-white/[0.07] rounded-xl px-3.5 py-2.5 border border-white/10 focus-within:border-blue-400/50 focus-within:bg-white/[0.10] transition-colors">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            placeholder="Buscar proyecto, presupuesto o partida…"
            className="bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none w-full"
          />
          <kbd className="text-[10px] font-semibold text-slate-400 bg-white/[0.06] border border-white/10 rounded px-1.5 py-0.5 shrink-0">⌘K</kbd>
        </div>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
        <button
          className="relative w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
          title="Notificaciones"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
          <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-slate-300" />
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-[13px] font-semibold text-slate-100 truncate max-w-40">{user?.nombre ?? 'Usuario'}</p>
            <p className="text-[11px] text-slate-400 capitalize">{user?.rol}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
