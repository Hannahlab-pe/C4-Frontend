import { useEffect, useState } from 'react'
import { Plus, Search, MapPin, HardHat, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppDialog from '../components/AppDialog'

interface Proyecto {
  id: string
  nombre: string
  distrito?: string
  ubicacion?: string
  createdAt: string
}

export default function ProyectosPage() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [distrito, setDistrito] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    api.get('/proyectos')
      .then((r) => setProyectos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function crearProyecto() {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      const { data } = await api.post('/proyectos', {
        nombre: nombre.trim(),
        distrito: distrito.trim() || undefined,
      })
      setShowModal(false)
      setNombre('')
      setDistrito('')
      navigate(`/proyectos/${data.id}/panel`)
    } catch {
      setCreando(false)
    }
  }

  const filtrados = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.distrito ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o distrito..."
            className="text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full bg-transparent"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <HardHat className="w-8 h-8 text-slate-300" />
            <p className="text-sm text-slate-400">
              {proyectos.length === 0
                ? 'Aún no tienes proyectos. ¡Crea el primero!'
                : 'Sin resultados para esa búsqueda.'}
            </p>
          </div>
        ) : (
          <>
            {filtrados.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/proyectos/${p.id}/panel`)}
                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left group last:border-b-0"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                  <HardHat className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> IA activa
                    </span>
                  </div>
                  {p.distrito && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {p.distrito}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
              </button>
            ))}
          </>
        )}

        <div className="px-6 py-4 flex justify-center border-t border-slate-100">
          <button
            onClick={() => setShowModal(true)}
            className="text-slate-400 text-xs font-medium hover:text-blue-500 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Crear nuevo proyecto
          </button>
        </div>
      </div>

      {/* Modal */}
      <AppDialog open={showModal} onClose={() => setShowModal(false)} title="Nuevo proyecto">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre del proyecto <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crearProyecto()}
              placeholder="Ej: Edificio Multifamiliar — San Isidro"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Distrito <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crearProyecto()}
              placeholder="Ej: Miraflores"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={crearProyecto}
            disabled={!nombre.trim() || creando}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {creando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Crear y abrir
          </button>
        </div>
      </AppDialog>
    </div>
  )
}
