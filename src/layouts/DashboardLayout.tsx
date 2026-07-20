import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

export default function DashboardLayout() {
  const { pathname } = useLocation()

  // Dentro del panel de un proyecto NO remontamos al cambiar de pestaña:
  // usamos como key la base del panel (/proyectos/:id/panel), así el layout y el
  // chat persisten. En el resto, la key es el pathname para conservar la transición.
  const panelBase = pathname.match(/^(\/proyectos\/[^/]+\/panel)/)
  const transitionKey = panelBase ? panelBase[1] : pathname

  return (
    // Topbar oscuro a todo el ancho arriba; debajo la fila [sidebar claro | contenido]
    <div className="flex flex-col h-dvh bg-slate-100 overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 min-w-0">
          <div key={transitionKey} className="page-transition h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
