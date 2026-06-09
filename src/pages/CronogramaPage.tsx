import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CalendarRange, Loader2, BarChart2, ArrowLeft, Flag, Minus, Plus, RotateCcw, Users, Check, Cloud,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import type { CabidaMin, FinancieroMin, CronoOverrides } from '../lib/cronograma'
import {
  FASE_COLOR, generarCronograma, etiquetaMes, posicionHoy, obraPorFrentes,
} from '../lib/cronograma'

interface Estado {
  inicioISO: string | null
  frentes: number
  duraciones: Record<string, number>
}

function cargarEstado(id: string): Estado {
  try {
    const raw = localStorage.getItem(`c4-crono-${id}`)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { inicioISO: null, frentes: 1, duraciones: {} }
}

export default function CronogramaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{ cabida?: CabidaMin; financiero?: FinancieroMin; distrito?: string } | null>(null)
  const [estado, setEstado] = useState<Estado>(() => cargarEstado(id ?? ''))
  const [guardado, setGuardado] = useState<'idle' | 'guardando' | 'ok'>('idle')
  const hidratado = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Carga inicial: análisis + estado del cronograma persistido en BD
  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/${id}/analisis`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        setData(d)
        if (d?.cronograma && typeof d.cronograma === 'object') {
          setEstado({
            inicioISO: d.cronograma.inicioISO ?? null,
            frentes: d.cronograma.frentes ?? 1,
            duraciones: d.cronograma.duraciones ?? {},
          })
        }
      })
      .catch(() => setData(null))
      .finally(() => { setLoading(false); hidratado.current = true })
  }, [id, token])

  // Persistir: localStorage inmediato + BD con debounce
  useEffect(() => {
    if (id) localStorage.setItem(`c4-crono-${id}`, JSON.stringify(estado))
    if (!id || !hidratado.current) return
    setGuardado('guardando')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      fetch(`${API_BASE}/chat/${id}/cronograma`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(estado),
      })
        .then(() => setGuardado('ok'))
        .catch(() => setGuardado('idle'))
    }, 700)
  }, [id, token, estado])

  const inicio = estado.inicioISO ? new Date(estado.inicioISO + 'T00:00:00') : null

  const overrides: CronoOverrides = useMemo(() => {
    const ov: CronoOverrides = { duraciones: estado.duraciones }
    if (data?.financiero) ov.obra = obraPorFrentes(data.financiero.meses_construccion, estado.frentes)
    return ov
  }, [data, estado.frentes, estado.duraciones])

  const crono = useMemo(
    () => (data?.cabida && data?.financiero ? generarCronograma(data.cabida, data.financiero, overrides) : null),
    [data, overrides],
  )

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando cronograma...</span>
    </div>
  )

  if (!crono) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
      <BarChart2 className="w-12 h-12 text-slate-200" />
      <p className="text-slate-600 font-medium">Sin análisis generado</p>
      <p className="text-sm text-slate-400">Ejecuta un análisis completo en el Asistente C4 para construir el cronograma.</p>
    </div>
  )

  const { tareas, total, finObra, pre } = crono
  const meses = Array.from({ length: total }, (_, i) => i + 1)
  const hoy = posicionHoy(inicio, total)
  const setDur = (tid: string, delta: number) => {
    setEstado((s) => {
      const actual = tareas.find((t) => t.id === tid)?.duracion ?? 1
      const nuevo = Math.max(1, actual + delta)
      return { ...s, duraciones: { ...s.duraciones, [tid]: nuevo } }
    })
  }
  const reset = () => setEstado({ inicioISO: estado.inicioISO, frentes: 1, duraciones: {} })

  // Hitos
  const hitos = [
    { mes: pre + 1, label: 'Inicio de obra', color: '#0ea5e9' },
    { mes: finObra, label: 'Fin de obra', color: '#f43f5e' },
    { mes: total, label: 'Entrega final', color: '#f59e0b' },
  ]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`../analisis`)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-blue-600" /> Cronograma del Proyecto
            </h2>
            {data?.distrito && <p className="text-xs text-slate-400 mt-0.5">{data.distrito} · {total} meses</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {guardado === 'guardando' ? (
              <><Cloud className="w-3.5 h-3.5 animate-pulse" /> Guardando…</>
            ) : guardado === 'ok' ? (
              <><Check className="w-3.5 h-3.5 text-emerald-500" /> Guardado</>
            ) : null}
          </span>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100">
            <RotateCcw className="w-3.5 h-3.5" /> Restablecer
          </button>
        </div>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-5">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Fecha de inicio</label>
          <input
            type="date"
            value={estado.inicioISO ?? ''}
            onChange={(e) => setEstado((s) => ({ ...s, inicioISO: e.target.value || null }))}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Users className="w-3 h-3" /> Frentes de trabajo
          </label>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setEstado((s) => ({ ...s, frentes: n }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  estado.frentes === n ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >{n}</button>
            ))}
          </div>
        </div>
        <div className="text-xs text-slate-400 max-w-xs leading-relaxed">
          Más frentes = más cuadrillas en paralelo = obra más corta.
          {estado.frentes > 1 && <span className="text-blue-600 font-medium"> Obra comprimida a {crono.obra} meses.</span>}
        </div>
      </div>

      {/* Gantt */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 mb-3">
          {Object.entries(FASE_COLOR).map(([fase, color]) => (
            <div key={fase} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-[11px] text-slate-500">{fase}</span>
            </div>
          ))}
        </div>

        {/* Cabecera de meses */}
        <div className="flex border-b border-slate-100 pb-1 mb-1">
          <div className="w-[38%] shrink-0 flex items-end">
            <span className="text-[9px] text-slate-400 uppercase tracking-wide">{inicio ? 'Calendario →' : 'Mes del proyecto →'}</span>
          </div>
          <div className="flex-1 relative flex">
            {meses.map((m) => (
              <div key={m} className="flex-1 text-center text-[9px] text-slate-400 border-l border-slate-100 first:border-0">
                {etiquetaMes(inicio, m)}
              </div>
            ))}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="relative">
          {/* Hitos verticales */}
          {hitos.map((h) => (
            <div key={h.label} className="absolute top-0 bottom-6 w-px z-10 pointer-events-none"
              style={{ left: `calc(38% + ${(h.mes / total) * 62}%)`, backgroundColor: h.color, opacity: 0.5 }}>
              <Flag className="w-3 h-3 -ml-1.5 -mt-0.5" style={{ color: h.color }} />
            </div>
          ))}
          {/* Línea HOY */}
          {hoy != null && (
            <div className="absolute top-0 bottom-6 w-0.5 bg-emerald-500 z-20 pointer-events-none"
              style={{ left: `calc(38% + ${hoy * 62}%)` }}>
              <span className="absolute -top-0.5 left-1 text-[9px] font-bold text-emerald-600 whitespace-nowrap">HOY</span>
            </div>
          )}

          {tareas.map((t) => {
            const left = ((t.inicio - 1) / total) * 100
            const width = (t.duracion / total) * 100
            const finMes = t.inicio + t.duracion - 1
            return (
              <div key={t.id} className="flex items-center hover:bg-slate-50 rounded-md group">
                <div className="w-[38%] shrink-0 pr-2 py-0.5 flex items-center gap-2">
                  <p className="text-[11px] text-slate-600 truncate flex-1" title={t.nombre}>{t.nombre}</p>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setDur(t.id, -1)} className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><Minus className="w-2.5 h-2.5" /></button>
                    <span className="text-[10px] text-slate-400 w-5 text-center">{t.duracion}m</span>
                    <button onClick={() => setDur(t.id, +1)} className="w-4 h-4 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"><Plus className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
                <div className="flex-1 relative h-6">
                  <div
                    className="absolute top-0.5 h-5 rounded-md flex items-center px-2 overflow-hidden"
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: FASE_COLOR[t.fase] }}
                    title={`${inicio ? etiquetaMes(inicio, t.inicio) + ' – ' + etiquetaMes(inicio, finMes) : 'Mes ' + t.inicio + ' – ' + finMes} (${t.duracion}m)`}
                  >
                    <span className="text-[10px] font-medium text-white whitespace-nowrap truncate">
                      {inicio ? etiquetaMes(inicio, t.inicio) : `${t.duracion}m`}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pie con hitos */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-100">
          {hitos.map((h) => (
            <div key={h.label} className="flex items-center gap-1.5">
              <Flag className="w-3 h-3" style={{ color: h.color }} />
              <span className="text-[11px] text-slate-500">{h.label}: <b className="text-slate-700">{inicio ? etiquetaMes(inicio, h.mes) : `mes ${h.mes}`}</b></span>
            </div>
          ))}
          {hoy != null && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="text-[11px] text-slate-500">Línea <b className="text-emerald-600">HOY</b></span>
            </div>
          )}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Cronograma base estimado por el motor C4 según área construida, pisos y sótanos. Ajusta la <b>fecha de inicio</b> para ver el calendario real,
        los <b>frentes de trabajo</b> para comprimir la obra, y arrastra <b>±</b> sobre cada tarea para afinar duraciones. Los cambios se guardan automáticamente.
      </p>
    </div>
  )
}
