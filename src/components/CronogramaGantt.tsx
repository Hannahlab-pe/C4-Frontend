import { CalendarRange, Flag, Maximize2 } from 'lucide-react'
import type { CabidaMin, FinancieroMin } from '../lib/cronograma'
import { FASE_COLOR, generarCronograma, etiquetaMes } from '../lib/cronograma'

function Barra({ inicio, duracion, total, color }: {
  inicio: number; duracion: number; total: number; color: string
}) {
  const left = ((inicio - 1) / total) * 100
  const width = (duracion / total) * 100
  return (
    <div className="relative h-6">
      <div
        className="absolute top-0.5 h-5 rounded-md flex items-center px-2 overflow-hidden"
        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
        title={`Mes ${inicio} – ${inicio + duracion - 1} (${duracion} ${duracion === 1 ? 'mes' : 'meses'})`}
      >
        <span className="text-[10px] font-medium text-white whitespace-nowrap truncate">{duracion}m</span>
      </div>
    </div>
  )
}

export default function CronogramaGantt({ cabida, financiero, inicio = null, onAbrir }: {
  cabida: CabidaMin; financiero: FinancieroMin; inicio?: Date | null; onAbrir?: () => void
}) {
  const { tareas, total, finObra } = generarCronograma(cabida, financiero)
  const meses = Array.from({ length: total }, (_, i) => i + 1)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Cronograma del Proyecto</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Duración estimada: {total} meses
          </span>
          {onAbrir && (
            <button
              onClick={onAbrir}
              className="flex items-center gap-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Abrir Gantt
            </button>
          )}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(FASE_COLOR).map(([fase, color]) => (
          <div key={fase} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-slate-500">{fase}</span>
          </div>
        ))}
      </div>

      {/* Cabecera de meses */}
      <div className="flex border-b border-slate-100 pb-1 mb-1">
        <div className="w-[42%] shrink-0 flex items-end">
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">{inicio ? 'Mes calendario →' : 'Mes del proyecto →'}</span>
        </div>
        <div className="flex-1 relative flex">
          {meses.map((m) => (
            <div key={m} className="flex-1 text-center text-[9px] text-slate-400 border-l border-slate-100 first:border-0">
              {etiquetaMes(inicio, m)}
            </div>
          ))}
        </div>
      </div>

      {/* Filas */}
      <div className="relative">
        {/* Hito fin de obra */}
        <div
          className="absolute top-0 bottom-0 w-px bg-rose-300 z-10 pointer-events-none"
          style={{ left: `calc(42% + ${(finObra / total) * 58}%)` }}
        >
          <Flag className="w-3 h-3 text-rose-400 -ml-1.5 -mt-0.5" />
        </div>

        {tareas.map((t) => (
          <div key={t.id} className="flex items-center hover:bg-slate-50 rounded-md">
            <div className="w-[42%] shrink-0 pr-3 py-0.5">
              <p className="text-[11px] text-slate-600 truncate" title={t.nombre}>{t.nombre}</p>
            </div>
            <div className="flex-1">
              <Barra inicio={t.inicio} duracion={t.duracion} total={total} color={FASE_COLOR[t.fase]} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1.5">
        <Flag className="w-3 h-3 text-rose-400 shrink-0" />
        <span><b>Hito fin de obra</b> (entrega de casco) al mes {finObra}. Estimación paramétrica del motor C4 — ábrela en el Gantt para ajustar fecha de inicio, frentes de trabajo y duraciones.</span>
      </p>
    </div>
  )
}
