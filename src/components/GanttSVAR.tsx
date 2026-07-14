import { useRef, Component, type ReactNode } from 'react'
import { Gantt, Willow } from '@svar-ui/react-gantt'
import '@svar-ui/react-gantt/style.css'

// Red de seguridad: si el Gantt fallara en runtime, mostramos un aviso en vez de romper la página.
class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() {
    if (this.state.err) return <div className="p-10 text-center text-sm text-slate-400">No se pudo cargar el cronograma. Recarga la página (Ctrl+Shift+R) o avísame.</div>
    return this.props.children
  }
}

// Gantt profesional (SVAR) aislado. Recibe las tareas ya mapeadas + la vista (día/semana/mes)
// y avisa al padre cuándo se hace click en una partida (para abrir el panel de control).

export type SvarTask = {
  id: string
  text: string
  type: 'summary' | 'task' | 'milestone'
  parent?: string
  start?: Date
  end?: Date
  duration?: number
  progress?: number
  open?: boolean
  cost?: number
  fase?: string
  registroId?: string
  atrasada?: boolean
}
export type Vista = 'dia' | 'semana' | 'mes'

const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`
const MES_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre']
const mesAnio = (d: Date) => `${MES_FULL[d.getMonth()]} ${d.getFullYear()}`

const SCALES: Record<Vista, any[]> = {
  dia: [
    { unit: 'month', step: 1, format: mesAnio },
    { unit: 'day', step: 1, format: (d: Date) => String(d.getDate()) },
  ],
  semana: [
    { unit: 'month', step: 1, format: mesAnio },
    { unit: 'week', step: 1, format: (d: Date) => `${d.getDate()} ${MES_ABBR[d.getMonth()]}` },
  ],
  mes: [
    { unit: 'year', step: 1, format: (d: Date) => String(d.getFullYear()) },
    { unit: 'month', step: 1, format: (d: Date) => `${MES_ABBR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` },
  ],
}
const CELL_W: Record<Vista, number> = { dia: 36, semana: 96, mes: 116 }

const columns: any[] = [
  { id: 'text', header: 'Actividad', flexgrow: 2, width: 240 },
  { id: 'cost', header: 'Costo (S/)', align: 'right', width: 112, template: (v: any) => (v ? soles(Number(v)) : '') },
  { id: 'progress', header: '%', align: 'center', width: 54, template: (v: any, row: any) => (row?.type === 'summary' ? '' : `${Math.round(Number(v) || 0)}%`) },
]

export default function GanttSVAR({
  tasks, vista, hoy, onSelect,
}: {
  tasks: SvarTask[]
  vista: Vista
  hoy: Date
  onSelect: (registroId: string) => void
}) {
  const apiRef = useRef<any>(null)
  const init = (api: any) => {
    apiRef.current = api
    api.on('select-task', (ev: any) => {
      const t = api.getTask(ev.id)
      if (t && t.type !== 'summary' && t.registroId) onSelect(String(t.registroId))
    })
  }
  const markers = hoy ? [{ start: hoy, text: 'HOY', css: 'c4-hoy' }] : []
  const highlightTime = (date: Date, unit: string) => (unit === 'day' && date.getDay() === 0 ? 'c4-domingo' : '')

  // key: remonta el Gantt cuando cambia la vista o los datos (SVAR no siempre reacciona a props)
  const sig = `${vista}:${tasks.length}:${tasks.reduce((s, t) => s + (t.duration || 0), 0)}`

  return (
    <div className="c4-gantt-wrap">
      <style>{`
        .c4-gantt-wrap { height: 580px; }
        .c4-gantt-wrap .wx-gantt { height: 100%; }
        .c4-gantt-wrap .c4-domingo { background: #f1f5f9; }
        .c4-gantt-wrap .wx-marker.c4-hoy, .c4-gantt-wrap .c4-hoy { background: #ef4444 !important; color: #fff; }
      `}</style>
      <Boundary>
        <Willow>
          <Gantt
            key={sig}
            tasks={tasks as any}
            links={[]}
            scales={SCALES[vista] ?? SCALES.semana}
            columns={columns}
            cellWidth={CELL_W[vista] ?? CELL_W.semana}
            cellHeight={34}
            scaleHeight={36}
            markers={markers as any}
            highlightTime={highlightTime}
            readonly
            init={init}
          />
        </Willow>
      </Boundary>
    </div>
  )
}
