import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, HardHat, Archive, MapPin,
  SlidersHorizontal, CircleHelp,
  LogOut, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import AppDialog from './AppDialog'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: BarChart2, label: 'Dashboard'  },
  { to: '/proyectos', icon: HardHat,   label: 'Proyectos'  },
]

const adminItems = [
  { to: '/base-conocimiento', icon: Archive, label: 'Base de Conocimiento' },
  { to: '/normativas',        icon: MapPin,  label: 'Normativas'            },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const closeMobile = () => setMobileNav(false)

  // Item full-width, recto (sin margen ni bordes redondeados). Activo: barra blanca, letras negras.
  // En mobile el drawer siempre muestra etiquetas (colapsar es solo desktop).
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center text-[15px] transition-all duration-200 ease-out w-full',
      collapsed ? 'gap-3 px-5 py-3.5 md:justify-center md:gap-0 md:px-0' : 'gap-3 px-5 py-3.5',
      isActive
        ? 'bg-white text-slate-900 font-semibold'
        : 'font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white',
    )
  // La etiqueta se oculta solo cuando está colapsado EN DESKTOP.
  const labelClass = collapsed ? 'md:hidden' : ''

  return (
    <>
    {/* Backdrop en mobile */}
    {mobileNavOpen && (
      <div
        onClick={closeMobile}
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm md:hidden"
      />
    )}

    <aside className={clsx(
      'bg-slate-900 flex flex-col h-full overflow-hidden z-50',
      'fixed inset-y-0 left-0 w-64 shrink-0 md:static',
      'transition-transform duration-300 ease-out md:transition-[width]',
      mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      collapsed ? 'md:w-14' : 'md:w-60',
    )}>

      {/* ── Logo (centrado) ──────────────────────────── */}
      <div className="relative flex items-center justify-center h-20 border-b border-white/6 shrink-0">
        {(!collapsed || mobileNavOpen) && (
          <div className={clsx('flex flex-col items-center leading-none text-center', collapsed && 'md:hidden')}>
            <span className="text-white font-black text-3xl tracking-tight">
              C<span className="text-blue-500">4</span>
            </span>
            <span className="text-slate-500 text-[10px] font-semibold tracking-[0.22em] uppercase mt-1.5">
              Gestión de Obras
            </span>
          </div>
        )}
        {/* Colapsar — solo desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={clsx(
            'hidden md:block text-slate-600 hover:text-slate-300 transition-colors p-1 rounded',
            !collapsed && 'absolute right-2 top-3',
          )}
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />}
        </button>
        {/* Cerrar drawer — solo mobile */}
        <button
          onClick={closeMobile}
          className="md:hidden absolute right-3 top-3 text-slate-500 hover:text-white transition-colors p-1"
          title="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={closeMobile} title={collapsed ? label : undefined} className={linkClass}>
            <Icon className="w-4.5 h-4.5 shrink-0" />
            <span className={labelClass}>{label}</span>
          </NavLink>
        ))}

        {user?.rol === 'admin' && (
          <>
            <div className={clsx('pt-5 pb-1.5', collapsed ? 'px-5 md:px-2' : 'px-5')}>
              <p className={clsx('text-[10px] font-semibold text-slate-600 uppercase tracking-[0.18em]', collapsed && 'md:hidden')}>
                Administración
              </p>
              {collapsed && <hr className="hidden md:block border-white/6" />}
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={closeMobile} title={collapsed ? label : undefined} className={linkClass}>
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className={labelClass}>{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="pb-3 pt-2 border-t border-white/6 space-y-1 shrink-0">
        {[
          { to: '/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
          { to: '/ayuda',         icon: CircleHelp,        label: 'Ayuda'          },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={closeMobile} title={collapsed ? label : undefined} className={linkClass}>
            <Icon className="w-4.5 h-4.5 shrink-0" />
            <span className={labelClass}>{label}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setConfirmLogout(true)}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={clsx(
            'flex items-center text-[15px] font-medium w-full transition-all duration-200 ease-out text-slate-400 hover:bg-red-500/10 hover:text-red-400',
            collapsed ? 'gap-3 px-5 py-3.5 md:justify-center md:gap-0 md:px-0' : 'gap-3 px-5 py-3.5',
          )}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span className={labelClass}>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    {/* ── Confirmación de cierre de sesión ── */}
    <AppDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Cerrar sesión">
      <p className="text-sm text-slate-600">¿Seguro que deseas cerrar sesión?</p>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setConfirmLogout(false)}
          className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => { setConfirmLogout(false); logout(); navigate('/login') }}
          className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 py-2.5 rounded-xl transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </AppDialog>
    </>
  )
}
