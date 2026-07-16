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
      <div className="bg-linear-to-r from-slate-800 to-slate-700 px-6 py-4 md:py-5 text-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wallet className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-bold">Presupuesto de la obra</h2>
          <p className="text-xs text-slate-300 mt-0.5">
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
