import { useState, useRef, useCallback } from 'react'
import { Outlet, NavLink, useParams } from 'react-router-dom'
import {
  LayoutDashboard, Hammer, HardHat,
  Building2, PaintBucket, ClipboardList, Sparkles, BarChart2,
} from 'lucide-react'
import ChatPanel from '../components/ChatPanel'

const TABS = [
  { slug: '',               label: 'Panel',           icon: LayoutDashboard, end: true },
  { slug: 'analisis',       label: 'Análisis',        icon: BarChart2 },
  { slug: 'demolicion',     label: 'Demolición',      icon: Hammer },
  { slug: 'excavacion',     label: 'Excavación',      icon: HardHat },
  { slug: 'construccion',   label: 'Construcción',    icon: Building2 },
  { slug: 'acabados',       label: 'Acabados',        icon: PaintBucket },
  { slug: 'administracion', label: 'Administración',  icon: ClipboardList },
]

const MIN_WIDTH = 320
const MAX_WIDTH = 720
const DEFAULT_WIDTH = 400

export default function ProyectoPanelLayout() {
  const { id } = useParams()
  const [chatOpen, setChatOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(DEFAULT_WIDTH)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_WIDTH)

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
            {TABS.map(({ slug, label, icon: Icon, end }) => (
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
            ))}
          </div>

          <button
            onClick={() => setChatOpen((v) => !v)}
            className="aurora-btn flex items-center gap-1.5 mr-3 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white shadow-md transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Asistente C4
          </button>
        </div>
      </div>

      {/* Contenido + sidebar */}
      <div className="flex-1 flex overflow-hidden">

        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Sidebar chat — siempre en DOM para animar */}
        {id && (
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
              <ChatPanel proyectoId={id} onClose={() => setChatOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
