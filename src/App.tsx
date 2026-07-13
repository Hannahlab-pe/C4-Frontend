import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import ProyectoPanelLayout from './layouts/ProyectoPanelLayout'
import DashboardPage from './pages/DashboardPage'
import ProyectosPage from './pages/ProyectosPage'
import ProyectoPanelPage from './pages/ProyectoPanelPage'
import ProyectoFasePage from './pages/ProyectoFasePage'
import EtapaDetallePage from './pages/EtapaDetallePage'
import AnalisisPage from './pages/AnalisisPage'
import CronogramaPage from './pages/CronogramaPage'
import CronogramaObraPage from './pages/CronogramaObraPage'
import KnowledgeBasePage from './pages/KnowledgeBasePage'
import NormativasAdminPage from './pages/NormativasAdminPage'
import ProyectoConfigPage from './pages/ProyectoConfigPage'
import EquipoPage from './pages/EquipoPage'
import LogisticaPage from './pages/LogisticaPage'
import { useAuthStore } from './store/authStore'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="proyectos" element={<ProyectosPage />} />
        <Route path="base-conocimiento" element={<KnowledgeBasePage />} />
        <Route path="normativas" element={<NormativasAdminPage />} />

        {/* Panel del proyecto */}
        <Route path="proyectos/:id/panel" element={<ProyectoPanelLayout />}>
          <Route index element={<ProyectoPanelPage />} />
          <Route path="analisis" element={<AnalisisPage />} />
          <Route path="cronograma" element={<CronogramaPage />} />
          <Route path="cronograma-obra" element={<CronogramaObraPage />} />
          <Route path="equipo" element={<EquipoPage />} />
          <Route path="logistica" element={<LogisticaPage />} />
          <Route path="configuracion" element={<ProyectoConfigPage />} />
          <Route path=":fase" element={<ProyectoFasePage />} />
          <Route path=":fase/:etapa" element={<EtapaDetallePage />} />
        </Route>

        {/* Redirect viejo link directo */}
        <Route path="proyectos/:id" element={<Navigate to="panel" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
