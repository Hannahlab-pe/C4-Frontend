import { useState } from 'react'
import { Boxes, Calculator, ClipboardList, Wallet } from 'lucide-react'
import RecursosTab from '../components/presupuestos/RecursosTab'
import PartidasTab from '../components/presupuestos/PartidasTab'
import PresupuestosTab from '../components/presupuestos/PresupuestosTab'

type Tab = 'recursos' | 'partidas' | 'presupuestos'

const TABS: { key: Tab; label: string; icon: typeof Boxes }[] = [
  { key: 'recursos', label: 'Recursos', icon: Boxes },
  { key: 'partidas', label: 'Partidas / APU', icon: Calculator },
  { key: 'presupuestos', label: 'Presupuestos', icon: ClipboardList },
]

export default function PresupuestosPage() {
  const [tab, setTab] = useState<Tab>('presupuestos')

  return (
    <div className="space-y-5">
      {/* Header azul noche */}
      <div className="bg-linear-to-r from-slate-800 to-slate-700 rounded-2xl px-6 py-5 text-white flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Presupuestos y Costos</h1>
          <p className="text-xs text-slate-300 mt-0.5">Recursos, análisis de precios unitarios (APU) y presupuestos — la base del ERP.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              tab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'recursos' && <RecursosTab />}
      {tab === 'partidas' && <PartidasTab />}
      {tab === 'presupuestos' && <PresupuestosTab />}
    </div>
  )
}
