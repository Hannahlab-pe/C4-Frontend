import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { HelpCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Ícono "?" que abre una explicación al hacer clic.
 * Úsalo junto al título de cada sección para explicar de dónde salen los números.
 */
export default function InfoTip({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Popover className="inline-flex align-middle">
      <PopoverButton
        className="text-slate-300 hover:text-slate-500 transition-colors outline-none cursor-help"
        title="¿Cómo se calcula?"
        aria-label="Cómo se calcula"
      >
        <HelpCircle className="w-4 h-4" />
      </PopoverButton>
      <PopoverPanel
        anchor={{ to: 'bottom start', gap: 8 }}
        transition
        className="z-50 w-72 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-left
                   transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-95 data-closed:-translate-y-1"
      >
        {title && <p className="font-display text-[13px] font-bold text-slate-900 mb-1.5">{title}</p>}
        <div className="text-xs text-slate-500 leading-relaxed space-y-1.5">{children}</div>
      </PopoverPanel>
    </Popover>
  )
}
