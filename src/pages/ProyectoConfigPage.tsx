import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react'
import api from '../lib/api'

export default function ProyectoConfigPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [proyecto, setProyecto] = useState<{ nombre: string } | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [confirmNombre, setConfirmNombre] = useState('')
  const [eliminando, setEliminando] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/proyectos/${id}`).then((r) => setProyecto(r.data)).catch(() => {})
  }, [id])

  function abrirDialog() {
    setConfirmNombre('')
    setShowDialog(true)
  }

  async function eliminarProyecto() {
    if (!id || confirmNombre !== proyecto?.nombre) return
    setEliminando(true)
    try {
      await api.delete(`/proyectos/${id}`)
      navigate('/proyectos', { replace: true })
    } catch {
      setEliminando(false)
    }
  }

  const puedeEliminar = confirmNombre === proyecto?.nombre && !eliminando

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">

        <div className="bg-white rounded-2xl border border-red-200">
          <div className="px-6 py-4 border-b border-red-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="text-sm font-semibold text-red-700">Zona de peligro</h2>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">Eliminar proyecto</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Se eliminará el proyecto y todos sus datos: historial de chat, análisis, documentos y registros de fases. Esta acción no se puede deshacer.
                </p>
              </div>
              <button
                onClick={abrirDialog}
                className="shrink-0 flex items-center gap-1.5 border border-red-300 text-red-600 text-xs font-medium px-3.5 py-2 rounded-xl hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        </div>

      </div>

      <Dialog
        open={showDialog}
        onClose={() => { if (!eliminando) setShowDialog(false) }}
        className="relative z-50"
      >
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 backdrop-blur-sm transition duration-200 ease-out data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
          <DialogPanel
            transition
            className="w-full max-w-md bg-white rounded-2xl shadow-xl transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <DialogTitle className="font-semibold text-slate-800">Eliminar proyecto</DialogTitle>
              <button
                onClick={() => { if (!eliminando) setShowDialog(false) }}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 leading-relaxed">
                  Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos los datos del proyecto incluyendo el historial de chat, análisis, documentos y registros de fases.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1.5">
                  Para confirmar, escribe el nombre del proyecto:{' '}
                  <span className="font-semibold text-slate-800">{proyecto?.nombre}</span>
                </label>
                <input
                  autoFocus
                  value={confirmNombre}
                  onChange={(e) => setConfirmNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && puedeEliminar && eliminarProyecto()}
                  placeholder={proyecto?.nombre ?? ''}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setShowDialog(false)}
                disabled={eliminando}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={eliminarProyecto}
                disabled={!puedeEliminar}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {eliminando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Eliminar definitivamente
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  )
}
