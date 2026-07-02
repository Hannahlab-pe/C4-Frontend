import { useEffect } from 'react'
import { Check, Loader2, AlertCircle } from 'lucide-react'
import { useGuardadoStore } from '../store/guardadoStore'

export default function GuardadoIndicator() {
  const estado = useGuardadoStore((s) => s.estado)
  const setEstado = useGuardadoStore((s) => s.setEstado)

  // El "Guardado" se auto-oculta a los 2s; el error se queda hasta el próximo guardado.
  useEffect(() => {
    if (estado === 'saved') {
      const t = setTimeout(() => setEstado('idle'), 2000)
      return () => clearTimeout(t)
    }
  }, [estado, setEstado])

  if (estado === 'idle') return null

  const cfg = {
    saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, txt: 'Guardando…', cls: 'text-slate-500 border-slate-200' },
    saved: { icon: <Check className="w-3.5 h-3.5" />, txt: 'Guardado', cls: 'text-emerald-600 border-emerald-200' },
    error: { icon: <AlertCircle className="w-3.5 h-3.5" />, txt: 'No se guardó — revisa tu conexión', cls: 'text-red-600 border-red-200' },
  }[estado]

  return (
    <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-1.5 bg-white border rounded-full px-3.5 py-2 shadow-lg text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {cfg.txt}
    </div>
  )
}
