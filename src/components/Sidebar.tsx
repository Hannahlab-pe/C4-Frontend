import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Building2, LayoutDashboard, FolderKanban,
  Settings, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/proyectos', icon: FolderKanban, label: 'Proyectos' },
]

const adminItems = [
  { to: '/base-conocimiento', icon: BookOpen, label: 'Base de Conocimiento' },
]

const bottomItems = [
  { to: '/configuracion', icon: Settings, label: 'Configuración' },
  { to: '/ayuda', icon: HelpCircle, label: 'Ayuda' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={clsx(
        'bg-slate-900 flex flex-col h-full shrink-0 transition-all duration-300 overflow-hidden',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo + toggle */}
      <div className={clsx(
        'flex items-center border-b border-slate-800 shrink-0',
        collapsed ? 'justify-center px-0 py-5' : 'justify-between px-4 py-5',
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm leading-none">C4</p>
              <p className="text-slate-500 text-xs mt-0.5 truncate">Gestión de Obras</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            title="Colapsar sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Botón expandir (solo en collapsed) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center py-3 text-slate-500 hover:text-slate-300 transition-colors border-b border-slate-800"
          title="Expandir sidebar"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      )}

      {/* Nav principal */}
      <nav className={clsx('flex-1 py-4 space-y-0.5', collapsed ? 'px-2' : 'px-3')}>
        {!collapsed && (
          <p className="text-slate-600 text-xs font-medium uppercase tracking-widest px-2 mb-3">
            Principal
          </p>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              clsx(
                'flex items-center rounded-xl text-sm font-medium transition-all',
                collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {/* Admin section */}
        {user?.rol === 'admin' && (
          <>
            {!collapsed && (
              <p className="text-slate-600 text-xs font-medium uppercase tracking-widest px-2 mb-3 mt-5">
                Admin
              </p>
            )}
            {collapsed && <div className="border-t border-slate-800 my-2" />}
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center rounded-xl text-sm font-medium transition-all',
                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Nav inferior */}
      <div className={clsx(
        'py-4 border-t border-slate-800 space-y-0.5',
        collapsed ? 'px-2' : 'px-3',
      )}>
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={clsx(
              'flex items-center rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}

        {/* Usuario */}
        <div className={clsx(
          'flex items-center mt-2 rounded-xl bg-slate-800/60',
          collapsed ? 'flex-col gap-1.5 p-2' : 'gap-3 px-3 py-3',
        )}>
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
            <span className="text-blue-400 text-xs font-bold">
              {user?.nombre?.charAt(0) ?? 'U'}
            </span>
          </div>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.nombre}</p>
                <p className="text-slate-500 text-xs capitalize truncate">{user?.rol}</p>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}
