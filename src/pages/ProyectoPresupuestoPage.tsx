import { useParams } from 'react-router-dom'
import { Wallet } from 'lucide-react'
import PresupuestosTab from '../components/presupuestos/PresupuestosTab'

/** Presupuestos de ESTE proyecto (embebido en el panel). El catálogo maestro (recursos + APU)
 *  vive en el módulo top-level Presupuestos; acá solo se arma/ve el presupuesto de la obra. */
export default function ProyectoPresupuestoPage() {
  const { id } = useParams()

  return (
    <div className="h-full overflow-y-auto">
      {/* Header azul noche (igual que los demás módulos del proyecto) */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 md:py-5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5 text-slate-500" />
        </div>
        <div>
          <p className="text-xs text-slate-500">
            Arma y controla los presupuestos de este proyecto. El catálogo de recursos y APU está en el módulo Presupuestos.
          </p>
        </div>
      </div>

      <div className="p-6">
        {id && <PresupuestosTab proyectoId={id} />}
      </div>
    </div>
  )
}
