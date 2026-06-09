import { CalendarRange, Flag, Maximize2 } from 'lucide-react'
import type { CabidaMin, FinancieroMin } from '../lib/cronograma'
import { FASE_COLOR, generarCronograma, etiquetaSemana, ticksEje } from '../lib/cronograma'

const LABEL_W = 42 // % del ancho para la columna de nombres
const TRACK_W = 100 - LABEL_W

export default function CronogramaGantt({ cabida, financiero, inicio = null, onAbrir }: {
  cabida: CabidaMin; financiero: FinancieroMin; inicio?: Date | null; onAbrir?: () => void
}) {
  const { tareas, total, finObra } = generarCronograma(cabida, financiero)
  const ticks = ticksEje(total)

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
            Duración estimada: {total} semanas
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

      {/* Cabecera de semanas (ticks adaptativos) */}
      <div className="flex border-b border-slate-100 pb-1 mb-1">
        <div className="shrink-0 flex items-end" style={{ width: `${LABEL_W}%` }}>
          <span className="text-[9px] text-slate-400 uppercase tracking-wide">{inicio ? 'Calendario →' : 'Semana →'}</span>
        </div>
        <div className="relative h-3.5" style={{ width: `${TRACK_W}%` }}>
          {ticks.map((s) => (
            <span key={s} className="absolute text-[9px] text-slate-400 -translate-x-1/2"
              style={{ left: `${((s - 1) / total) * 100}%` }}>
              {etiquetaSemana(inicio, s)}
            </span>
          ))}
        </div>
      </div>

      {/* Filas */}
      <div className="relative">
        {/* Hito fin de obra */}
        <div
          className="absolute top-0 bottom-0 w-px bg-rose-300 z-10 pointer-events-none"
          style={{ left: `calc(${LABEL_W}% + ${(finObra / total) * TRACK_W}%)` }}
        >
          <Flag className="w-3 h-3 text-rose-400 -ml-1.5 -mt-0.5" />
        </div>

        {tareas.map((t) => {
          const left = ((t.inicio - 1) / total) * 100
          const width = (t.duracion / total) * 100
          return (
            <div key={t.id} className="flex items-center hover:bg-slate-50 rounded-md">
              <div className="shrink-0 pr-3 py-0.5" style={{ width: `${LABEL_W}%` }}>
                <p className="text-[11px] text-slate-600 truncate" title={t.nombre}>{t.nombre}</p>
              </div>
              <div className="relative h-6" style={{ width: `${TRACK_W}%` }}>
                <div
                  className="absolute top-0.5 h-5 rounded-md flex items-center px-2 overflow-hidden"
                  style={{ left: `${left}%`, width: `${width}%`, backgroundColor: FASE_COLOR[t.fase] }}
                  title={`Semana ${t.inicio} – ${t.inicio + t.duracion - 1} (${t.duracion} sem)`}
                >
                  <span className="text-[10px] font-medium text-white whitespace-nowrap truncate">{t.duracion}s</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-[10px] text-slate-400 mt-3 flex items-center gap-1.5">
        <Flag className="w-3 h-3 text-rose-400 shrink-0" />
        <span><b>Hito fin de obra</b> (entrega de casco) en la semana {finObra}. Estimación paramétrica del motor C4 — ábrela en el Gantt para ajustar fecha de inicio, frentes de trabajo y duraciones.</span>
      </p>
    </div>
  )
}
