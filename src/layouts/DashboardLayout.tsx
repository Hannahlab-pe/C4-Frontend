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
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div key={transitionKey} className="page-transition h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
