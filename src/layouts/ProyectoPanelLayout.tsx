import { useRef, useCallback, useEffect, useState } from 'react'
import { Outlet, NavLink, useParams, useLocation, Navigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Hammer, HardHat,
  Building2, PaintBucket, ClipboardList, Sparkles, BarChart2, Settings2, Users, Lock, Loader2,
} from 'lucide-react'
import ChatPanel from '../components/ChatPanel'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'

const TABS = [
  { slug: '',               label: 'Panel',           icon: LayoutDashboard, end: true },
  { slug: 'analisis',       label: 'Análisis',        icon: BarChart2 },
  { slug: 'demolicion',     label: 'Demolición',      icon: Hammer },
  { slug: 'excavacion',     label: 'Excavación',      icon: HardHat },
  { slug: 'construccion',   label: 'Construcción',    icon: Building2 },
  { slug: 'acabados',       label: 'Acabados',        icon: PaintBucket },
  { slug: 'administracion', label: 'Administración',  icon: ClipboardList },
  { slug: 'equipo',         label: 'Equipo',          icon: Users },
  { slug: 'configuracion',  label: 'Configuración',   icon: Settings2 },
]

const MIN_WIDTH = 320
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 400

export default function ProyectoPanelLayout() {
  const { id } = useParams()
  const chatOpen = useChatStore((s) => s.open)
  const setChatOpen = useChatStore((s) => s.setOpen)
  const chatWidth = useChatStore((s) => s.width)
  const setChatWidth = useChatStore((s) => s.setWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

  // Rol del usuario en este proyecto → control de acceso por sección
  const { pathname } = useLocation()
  const token = useAuthStore((s) => s.token)
  const [rol, setRol] = useState<{ rolObra: string; fase: string | null } | null>(null)
  const [rolListo, setRolListo] = useState(false)
  useEffect(() => {
    if (!id) return
    setRolListo(false)
    fetch(`${API_BASE}/proyectos/${id}/mi-rol`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setRol(d ?? { rolObra: 'jefe_proyecto', fase: null }))
      .catch(() => setRol({ rolObra: 'jefe_proyecto', fase: null }))
      .finally(() => setRolListo(true))
  }, [id, token])
  // Mientras carga (rol null) asumimos acceso total para no parpadear candados
  const esJefeProy = !rol || rol.rolObra === 'jefe_proyecto'
  const puedeVer = (slug: string) => esJefeProy || slug === rol?.fase
  const mostrarChat = esJefeProy || rol?.rolObra === 'jefe_fase'
  const seccionActual = pathname.match(/\/panel(?:\/([^/]+))?/)?.[1] ?? ''
  const bloqueado = rolListo && !esJefeProy && !puedeVer(seccionActual)

  // Permite abrir el chat desde otros componentes (ej. empty state del Panel)
  useEffect(() => {
    const open = () => setChatOpen(true)
    window.addEventListener('c4:open-chat', open)
    return () => window.removeEventListener('c4:open-chat', open)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = chatWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const delta = startX.current - ev.clientX
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta))
      setChatWidth(next)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [chatWidth])

  return (
    <div className="flex flex-col -m-6" style={{ height: 'calc(100vh - 56px)' }}>

      <style>{`
        @keyframes aurora-shift {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        .aurora-btn {
          background: linear-gradient(
            135deg,
            #60a5fa 0%,
            #3b82f6 20%,
            #4f46e5 40%,
            #1e3a8a 60%,
            #020617 80%,
            #3b82f6 100%
          );
          background-size: 400% 400%;
          animation: aurora-shift 6s ease infinite;
        }
        .aurora-btn:hover { filter: brightness(1.15); transform: translateY(-1px); }
        .aurora-btn:active { transform: translateY(0px); }
        .resize-handle:hover { background-color: #3b82f6; }
      `}</style>

      {/* Sub-nav */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center overflow-x-auto">
            {TABS.map(({ slug, label, icon: Icon, end }) => {
              if (!puedeVer(slug)) {
                return (
                  <div
                    key={label}
                    title="No tienes permiso a este módulo"
                    className="flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 border-transparent text-slate-300 cursor-not-allowed select-none"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {label}
                  </div>
                )
              }
              return (
                <NavLink
                  key={label}
                  to={slug ? `/proyectos/${id}/panel/${slug}` : `/proyectos/${id}/panel`}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                      isActive
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </NavLink>
              )
            })}
          </div>

          {mostrarChat && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="aurora-btn flex items-center gap-1.5 mr-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all duration-200"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Asistente C4
            </button>
          )}
        </div>
      </div>

      {/* Contenido + sidebar */}
      <div className="flex-1 flex overflow-hidden">

        <div className="flex-1 overflow-hidden">
          {!rolListo ? (
            <div className="h-full flex items-center justify-center gap-2 text-slate-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : bloqueado ? (
            // Trabajador en su landing (Panel) → lo mandamos a su fase; otra sección bloqueada → aviso
            seccionActual === '' && rol?.fase ? (
              <Navigate to={`/proyectos/${id}/panel/${rol.fase}`} replace />
            ) : (
              <SinPermiso id={id} fase={rol?.fase} />
            )
          ) : (
            <Outlet />
          )}
        </div>

        {/* Sidebar chat — siempre en DOM para animar */}
        {id && mostrarChat && (
          <div
            className="shrink-0 flex overflow-hidden transition-all duration-300 ease-in-out"
            style={{ width: chatOpen ? chatWidth : 0, opacity: chatOpen ? 1 : 0 }}
          >
            {/* Drag handle */}
            {chatOpen && (
              <div
                onMouseDown={onMouseDown}
                className="resize-handle w-1 shrink-0 bg-slate-200 hover:bg-blue-400 cursor-col-resize transition-colors duration-150 active:bg-blue-500"
                title="Arrastrar para redimensionar"
              />
            )}

            <div className="flex-1 overflow-hidden flex flex-col">
              <ChatPanel proyectoId={id} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const FASE_LABEL: Record<string, string> = {
  demolicion: 'Demolición', excavacion: 'Excavación', construccion: 'Construcción',
  acabados: 'Acabados', administracion: 'Administración',
}

function SinPermiso({ id, fase }: { id?: string; fase?: string | null }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-bold text-slate-700">No tienes permiso a este módulo</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        Tu rol solo accede a la fase que te asignaron. Si necesitas más accesos, pídeselo al jefe de proyecto.
      </p>
      {fase && id && (
        <Link
          to={`/proyectos/${id}/panel/${fase}`}
          className="mt-5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2.5 rounded-xl transition-colors"
        >
          Ir a mi módulo · {FASE_LABEL[fase] ?? fase}
        </Link>
      )}
    </div>
  )
}
