import { useState } from 'react'
import type { ComponentType } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart2, HardHat, Archive, MapPin, Wallet,
  SlidersHorizontal, CircleHelp,
  LogOut, PanelLeftClose, PanelLeftOpen, X,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import AppDialog from './AppDialog'
import clsx from 'clsx'

type Item = { to: string; icon: ComponentType<{ className?: string }>; label: string }

const grupoPrincipal: Item[] = [
  { to: '/dashboard',    icon: BarChart2, label: 'Dashboard'    },
  { to: '/proyectos',    icon: HardHat,   label: 'Proyectos'    },
  { to: '/presupuestos', icon: Wallet,    label: 'Presupuestos' },
]

const grupoConocimiento: Item[] = [
  { to: '/base-conocimiento', icon: Archive, label: 'Base de Conocimiento' },
  { to: '/normativas',        icon: MapPin,  label: 'Normativas'           },
]

const grupoSistema: Item[] = [
  { to: '/configuracion', icon: SlidersHorizontal, label: 'Configuración' },
  { to: '/ayuda',         icon: CircleHelp,        label: 'Ayuda'         },
]

export default function Sidebar() {
  const navigate  = useNavigate()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileNav = useUiStore((s) => s.setMobileNav)
  const closeMobile = () => setMobileNav(false)

  // Sidebar claro. Activo: pill azul sólido (máximo contraste). Inactivo: slate oscuro legible.
  const itemClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      'flex items-center gap-3 rounded-xl text-[14px] my-0.5 transition-colors duration-150',
      collapsed ? 'mx-2 px-3 py-2.5 md:justify-center md:gap-0 md:mx-1.5 md:px-2.5' : 'mx-2 px-3 py-2.5',
      isActive
        ? 'bg-[var(--c4-topbar)] text-white font-semibold shadow-lg shadow-slate-900/15'
        : 'font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    )
  const labelClass = collapsed ? 'md:hidden' : ''

  const renderItem = ({ to, icon: Icon, label }: Item) => (
    <NavLink key={to} to={to} onClick={closeMobile} title={collapsed ? label : undefined} className={itemClass}>
      {({ isActive }) => (
        <>
          <Icon className={clsx('w-4.5 h-4.5 shrink-0', isActive ? 'text-blue-400' : 'text-slate-400')} />
          <span className={labelClass}>{label}</span>
        </>
      )}
    </NavLink>
  )

  const renderGrupo = (label: string, items: Item[]) => (
    <>
      <div className={clsx('pt-4 pb-1', collapsed ? 'px-4 md:px-2' : 'px-4')}>
        <p className={clsx('text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]', collapsed && 'md:hidden')}>
          {label}
        </p>
        {collapsed && <hr className="hidden md:block border-slate-200" />}
      </div>
      {items.map(renderItem)}
    </>
  )

  return (
    <>
    {/* Backdrop en mobile */}
    {mobileNavOpen && (
      <div onClick={closeMobile} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden" />
    )}

    <aside className={clsx(
      'bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden z-50',
      'fixed inset-y-0 left-0 w-64 shrink-0 md:static',
      'transition-transform duration-300 ease-out md:transition-[width]',
      mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      collapsed ? 'md:w-16' : 'md:w-59',
    )}>

      {/* Cabecera del drawer — solo mobile (marca + cerrar) */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 shrink-0 border-b border-slate-100">
        <span className="font-display text-xl font-extrabold text-slate-900 tracking-tight">C<span className="text-blue-600">4</span></span>
        <button onClick={closeMobile} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors" title="Cerrar menú">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pt-2 pb-2">
        {renderGrupo('Principal', grupoPrincipal)}
        {user?.rol === 'admin' && renderGrupo('Conocimiento', grupoConocimiento)}
      </nav>

      {/* Footer: sistema + logout + colapsar (desktop) */}
      <div className="pt-2 pb-3 border-t border-slate-200 shrink-0">
        {grupoSistema.map(renderItem)}
        <button
          onClick={() => setConfirmLogout(true)}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={clsx(
            'flex items-center gap-3 rounded-xl text-[14px] my-0.5 transition-colors duration-150 font-medium text-slate-600 hover:bg-red-50 hover:text-red-600',
            collapsed ? 'mx-2 px-3 py-2.5 md:justify-center md:gap-0 md:mx-1.5 md:px-2.5' : 'mx-2 px-3 py-2.5',
          )}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span className={labelClass}>Cerrar sesión</span>
        </button>

        {/* Colapsar — solo desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir' : 'Colapsar'}
          className={clsx(
            'hidden md:flex items-center gap-3 rounded-xl text-[13px] font-medium my-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors',
            collapsed ? 'mx-1.5 px-2.5 py-2.5 justify-center' : 'mx-2 px-3 py-2.5',
          )}
        >
          {collapsed ? <PanelLeftOpen className="w-4.5 h-4.5 shrink-0" /> : <PanelLeftClose className="w-4.5 h-4.5 shrink-0" />}
          {!collapsed && <span>Colapsar menú</span>}
        </button>
      </div>
    </aside>

    {/* Confirmación de cierre de sesión */}
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
