import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, HardHat, Archive, MapPin,
  SlidersHorizontal, CircleHelp,
  LogOut, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
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

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center text-sm font-medium transition-all duration-150 rounded-lg',
      collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
      isActive
        ? 'bg-white/10 text-white'
        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200',
    )

  return (
    <aside className={clsx(
      'bg-slate-900 flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden',
      collapsed ? 'w-14' : 'w-56',
    )}>

      {/* ── Logo ─────────────────────────────────────── */}
      <div className={clsx(
        'flex items-center h-14 border-b border-white/6 shrink-0',
        collapsed ? 'justify-center' : 'justify-between px-4',
      )}>
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span className="text-white font-black text-lg tracking-tight">
              C<span className="text-blue-500">4</span>
            </span>
            <span className="text-slate-500 text-[9px] font-semibold tracking-[0.18em] uppercase mt-0.5">
              Gestión de Obras
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-slate-600 hover:text-slate-300 transition-colors p-1 rounded"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-3.5 h-3.5" />
            : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* ── Nav ──────────────────────────────────────── */}
      <nav className={clsx('flex-1 py-4 space-y-0.5', collapsed ? 'px-1.5' : 'px-3')}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined} className={linkClass}>
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {user?.rol === 'admin' && (
          <>
            <div className={clsx('pt-4 pb-1', collapsed ? '' : 'px-1')}>
              {collapsed
                ? <hr className="border-white/6" />
                : <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.15em]">
                    Administración
                  </p>}
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} title={collapsed ? label : undefined} className={linkClass}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div className={clsx(
        'pb-4 border-t border-white/6 space-y-0.5',
        collapsed ? 'px-1.5 pt-3' : 'px-3 pt-3',
      )}>
        {[
          { to: '/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
          { to: '/ayuda',         icon: CircleHelp,        label: 'Ayuda'          },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} title={collapsed ? label : undefined}
            className={clsx(
              'flex items-center text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors rounded-lg',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {/* Usuario */}
        <div className={clsx(
          'flex items-center pt-3 mt-1 border-t border-white/6',
          collapsed ? 'flex-col gap-2' : 'gap-2.5 px-1',
        )}>
          <div className="w-7 h-7 rounded-md bg-white/8 flex items-center justify-center shrink-0">
            <span className="text-slate-300 text-[11px] font-bold">
              {user?.nombre?.charAt(0)?.toUpperCase() ?? 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate leading-tight">{user?.nombre}</p>
              <p className="text-slate-500 text-[10px] capitalize truncate">{user?.rol}</p>
            </div>
          )}
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
            title="Cerrar sesión"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
