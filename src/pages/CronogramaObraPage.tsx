import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarRange, Loader2, CalendarClock,
  AlertTriangle, Sparkles, User, X, Ruler, Wallet, ClipboardList,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from '../components/AppDialog'
import GanttSVAR, { type SvarTask, type Vista } from '../components/GanttSVAR'
import {
  ESQUEMAS_REGISTRO, FASES_CONFIG_MIN, agruparPorEtapa, avanceEtapa, avanceFase,
  type RegistroFase, type EtapaFase,
} from '../lib/registros-fase'

const FASES = ['demolicion', 'excavacion', 'construccion', 'acabados', 'administracion'] as const

// ── Helpers de fecha (date-only, sin sustos de zona horaria) ──
const DIA_MS = 86400000
const parseISO = (s?: string): Date | null => {
  if (!s) return null
  const d = new Date(`${String(s).slice(0, 10)}T12:00:00`)
  return isNaN(d.getTime()) ? null : d
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DIA_MS)
const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA_MS)
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const toInput = (d: Date) => d.toISOString().slice(0, 10)
const fmtCorto = (d: Date) => d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

function avanceReg(fase: string, r: RegistroFase): number {
  if (r.datos?.avance != null && r.datos?.avance !== '' && !isNaN(Number(r.datos.avance))) return clamp(Number(r.datos.avance))
  const esq = ESQUEMAS_REGISTRO[fase]
  if (esq?.estadosFinales.includes(r.estado)) return 100
  if (r.estado && esq && r.estado !== esq.estados[0]) return 50
  return 0
}

interface Row {
  id: string
  tipo: 'fase' | 'etapa' | 'actividad'
  nivel: 0 | 1 | 2
  fase: string
  nombre: string
  inicio: Date | null
  fin: Date | null
  avance: number
  responsable?: string
  estado?: string
  registroId?: string
  atrasada: boolean
  hito: boolean
  groupId?: string   // para colapsar
  costo?: number         // costo presupuestado (S/)
  valorGanado?: number   // costo × avance
}

const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400'
const FASE_LABEL: Record<string, string> = { demolicion: 'Demolición', excavacion: 'Excavación', construccion: 'Construcción', acabados: 'Acabados', administracion: 'Administración' }

export default function CronogramaObraPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.token)
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const [etapasPorFase, setEtapasPorFase] = useState<Record<string, EtapaFase[]>>({})
  const [regsPorFase, setRegsPorFase] = useState<Record<string, RegistroFase[]>>({})
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('semana')
  const [edit, setEdit] = useState<Row | null>(null)
  const [editVals, setEditVals] = useState<{ fechaInicio: string; duracionDias: number; avance: number; responsable: string; costo: number; costoReal: number }>({ fechaInicio: '', duracionDias: 1, avance: 0, responsable: '', costo: 0, costoReal: 0 })
  const [incidencias, setIncidencias] = useState<{ id: string; fecha: string; texto: string }[]>([])
  const [incidInput, setIncidInput] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [cfg, setCfg] = useState<any>({})

  const cargar = useCallback(() => {
    if (!proyectoId) return
    Promise.all([
      ...FASES.flatMap((f) => [
        fetch(`${API_BASE}/fases-detalle/${proyectoId}/${f}__etapas`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${API_BASE}/registros-fase/${proyectoId}/${f}`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]),
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/cronograma_config`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then((res) => {
      const et: Record<string, EtapaFase[]> = {}
      const rg: Record<string, RegistroFase[]> = {}
      FASES.forEach((f, i) => {
        et[f] = Array.isArray(res[i * 2]?.datos?.etapas) ? res[i * 2].datos.etapas : []
        rg[f] = Array.isArray(res[i * 2 + 1]) ? res[i * 2 + 1] : []
      })
      setEtapasPorFase(et); setRegsPorFase(rg)
      setCfg(res[FASES.length * 2]?.datos ?? {})
    }).finally(() => setLoading(false))
  }, [proyectoId, headers])

  useEffect(() => {
    setLoading(true); cargar()
    const onUpd = () => cargar()
    window.addEventListener('c4:cronograma-updated', onUpd)
    window.addEventListener('c4:etapas-updated', onUpd)
    window.addEventListener('c4:proyecto-updated', onUpd)
    return () => {
      window.removeEventListener('c4:cronograma-updated', onUpd)
      window.removeEventListener('c4:etapas-updated', onUpd)
      window.removeEventListener('c4:proyecto-updated', onUpd)
    }
  }, [cargar])

  const hoy = useMemo(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d }, [])

  // ── Árbol de filas (fase → etapa → actividad) con fechas — se usa para KPIs y rango ──
  const { minD, maxD, kpis } = useMemo(() => {
    const all: Row[] = []
    let minD: Date | null = null, maxD: Date | null = null
    const push = (d: Date | null, es: 'min' | 'max') => {
      if (!d) return
      if (es === 'min') { if (!minD || d < minD) minD = d }
      else { if (!maxD || d > maxD) maxD = d }
    }

    for (const fase of FASES) {
      const regs = regsPorFase[fase] ?? []
      const etapas = etapasPorFase[fase] ?? []
      if (!regs.length) continue

      // fechas de la fase (de sus actividades)
      const conFecha = regs.filter((r) => parseISO(r.datos?.fechaInicio))
      const faseIni = conFecha.length ? conFecha.map((r) => parseISO(r.datos.fechaInicio)!).reduce((a, b) => (a < b ? a : b)) : null
      const faseFinArr = conFecha.map((r) => addDays(parseISO(r.datos.fechaInicio)!, Math.max(1, num(r.datos?.duracionDias))))
      const faseFin = faseFinArr.length ? faseFinArr.reduce((a, b) => (a > b ? a : b)) : null
      push(faseIni, 'min'); push(faseFin, 'max')

      const faseId = `fase:${fase}`
      all.push({
        id: faseId, tipo: 'fase', nivel: 0, fase,
        nombre: FASES_CONFIG_MIN[fase]?.nombre ?? fase,
        inicio: faseIni, fin: faseFin, avance: avanceFase(fase, etapas, regs),
        atrasada: false, hito: false,
      })

      const grupos = etapas.length ? agruparPorEtapa(etapas, regs) : { '': regs }
      const listaEtapas: { key: string; nombre: string }[] = etapas.length
        ? etapas.map((e) => ({ key: e.key, nombre: e.nombre }))
        : [{ key: '', nombre: 'Actividades' }]

      for (const et of listaEtapas) {
        const propios = grupos[et.key] ?? []
        if (!propios.length) continue
        const etConF = propios.filter((r) => parseISO(r.datos?.fechaInicio))
        const etIni = etConF.length ? etConF.map((r) => parseISO(r.datos.fechaInicio)!).reduce((a, b) => (a < b ? a : b)) : null
        const etFinArr = etConF.map((r) => addDays(parseISO(r.datos.fechaInicio)!, Math.max(1, num(r.datos?.duracionDias))))
        const etFin = etFinArr.length ? etFinArr.reduce((a, b) => (a > b ? a : b)) : null
        const etId = `etapa:${fase}:${et.key}`
        all.push({
          id: etId, tipo: 'etapa', nivel: 1, fase, nombre: et.nombre,
          inicio: etIni, fin: etFin, avance: et.key ? avanceEtapa(fase, etapas, et.key, regs) : avanceFase(fase, etapas, regs),
          atrasada: false, hito: false, groupId: faseId,
        })

        for (const r of propios) {
          const ini = parseISO(r.datos?.fechaInicio)
          const dur = Math.max(1, num(r.datos?.duracionDias))
          const fin = ini ? addDays(ini, dur) : null
          const av = avanceReg(fase, r)
          const atrasada = !!(fin && fin < hoy && av < 100)
          const costo = num(r.datos?.costoPresupuestado)
          all.push({
            id: `reg:${r.id}`, tipo: 'actividad', nivel: 2, fase,
            nombre: r.nombre || 'Actividad', inicio: ini, fin, avance: av,
            responsable: r.datos?.responsable, estado: r.estado, registroId: r.id,
            atrasada, hito: dur <= 1 && !!r.datos?.esHito, groupId: etId,
            costo, valorGanado: Math.round(costo * av / 100),
          })
        }
      }
    }

    // Rollup de costo a etapas y fases (suma de sus actividades)
    const acum: Record<string, { c: number; vg: number }> = {}
    for (const r of all) if (r.tipo === 'actividad') {
      const bump = (gid?: string) => { if (!gid) return; (acum[gid] ??= { c: 0, vg: 0 }); acum[gid].c += r.costo ?? 0; acum[gid].vg += r.valorGanado ?? 0 }
      bump(r.groupId); bump(`fase:${r.fase}`)
    }
    for (const r of all) if (r.tipo !== 'actividad' && acum[r.id]) { r.costo = acum[r.id].c; r.valorGanado = acum[r.id].vg }

    // padding del rango
    if (minD) minD = addDays(minD, -3)
    if (maxD) maxD = addDays(maxD, 5)

    // KPIs
    const acts = all.filter((r) => r.tipo === 'actividad')
    const atrasadas = acts.filter((r) => r.atrasada).length
    const avanceGlobal = acts.length ? Math.round(acts.reduce((s, r) => s + r.avance, 0) / acts.length) : 0
    const duracion = minD && maxD ? diffDays(minD, maxD) : 0
    const presupuesto = acts.reduce((s, r) => s + (r.costo ?? 0), 0)
    const valorGanado = acts.reduce((s, r) => s + (r.valorGanado ?? 0), 0)
    const avanceCosto = presupuesto ? Math.round(valorGanado / presupuesto * 100) : 0

    return { rows: all, minD, maxD, kpis: { atrasadas, avanceGlobal, duracion, inicio: minD, fin: maxD, nActs: acts.length, presupuesto, valorGanado, avanceCosto } }
  }, [regsPorFase, etapasPorFase, hoy])

  // ── Tareas para el Gantt SVAR (fase/etapa = resumen, actividad = tarea) con costo rollup ──
  const svarTasks = useMemo<SvarTask[]>(() => {
    const out: SvarTask[] = []
    const costAcum: Record<string, number> = {}
    for (const fase of FASES) {
      const regs = regsPorFase[fase] ?? []
      const etapas = etapasPorFase[fase] ?? []
      const conFecha = regs.filter((r) => parseISO(r.datos?.fechaInicio))
      if (!conFecha.length) continue
      const faseId = `fase:${fase}`
      out.push({ id: faseId, text: FASES_CONFIG_MIN[fase]?.nombre ?? fase, type: 'summary', open: true, fase })
      const grupos = etapas.length ? agruparPorEtapa(etapas, regs) : { '': regs }
      const listaEtapas = etapas.length ? etapas.map((e) => ({ key: e.key, nombre: e.nombre })) : [{ key: '', nombre: 'Actividades' }]
      for (const et of listaEtapas) {
        const propios = (grupos[et.key] ?? []).filter((r) => parseISO(r.datos?.fechaInicio))
        if (!propios.length) continue
        const etId = `etapa:${fase}:${et.key}`
        out.push({ id: etId, text: et.nombre, type: 'summary', parent: faseId, open: true, fase })
        for (const r of propios) {
          const ini = parseISO(r.datos?.fechaInicio)!
          const dur = Math.max(1, num(r.datos?.duracionDias))
          const fin = addDays(ini, dur)
          const av = Math.round(avanceReg(fase, r))
          const costo = num(r.datos?.costoPresupuestado) || (num(r.datos?.cantidad) * num(r.datos?.precioUnitario)) || 0
          costAcum[etId] = (costAcum[etId] ?? 0) + costo
          costAcum[faseId] = (costAcum[faseId] ?? 0) + costo
          out.push({
            id: `reg:${r.id}`, text: r.nombre || 'Actividad', type: 'task', parent: etId,
            start: ini, end: fin, duration: dur, progress: av,
            cost: costo || undefined, fase, registroId: r.id, atrasada: !!(fin < hoy && av < 100),
          })
        }
      }
    }
    for (const t of out) if (t.type === 'summary' && costAcum[t.id]) t.cost = costAcum[t.id]
    return out
  }, [regsPorFase, etapasPorFase, hoy])

  function abrirEditReg(registroId: string) {
    let reg: RegistroFase | undefined, fFase = ''
    for (const f of FASES) {
      const found = (regsPorFase[f] ?? []).find((r) => r.id === registroId)
      if (found) { reg = found; fFase = f; break }
    }
    if (!reg) return
    const d = reg.datos ?? {}
    const ini = parseISO(d.fechaInicio)
    const dur = Math.max(1, num(d.duracionDias))
    const fin = ini ? addDays(ini, dur) : null
    const av = Math.round(avanceReg(fFase, reg))
    const costo = num(d.costoPresupuestado) || (num(d.cantidad) * num(d.precioUnitario)) || 0
    setEdit({
      id: `reg:${reg.id}`, tipo: 'actividad', nivel: 2, fase: fFase, nombre: reg.nombre || 'Actividad',
      inicio: ini, fin, avance: av, responsable: d.responsable, estado: reg.estado, registroId: reg.id,
      atrasada: !!(fin && fin < hoy && av < 100), hito: false, costo,
    })
    setEditVals({ fechaInicio: ini ? toInput(ini) : '', duracionDias: dur, avance: av, responsable: d.responsable ?? '', costo, costoReal: num(d.costoReal) || 0 })
    setIncidencias(Array.isArray(d.anotaciones) ? d.anotaciones : [])
    setIncidInput('')
  }
  function addIncidencia() {
    const t = incidInput.trim()
    if (!t) return
    setIncidencias((xs) => [...xs, { id: Math.random().toString(36).slice(2, 9), fecha: new Date().toISOString().slice(0, 10), texto: t }])
    setIncidInput('')
  }
  function removeIncidencia(id: string) {
    setIncidencias((xs) => xs.filter((a) => a.id !== id))
  }

  async function guardarEdit() {
    if (!edit?.registroId) return
    setGuardandoEdit(true); setGuardado('saving')
    // hallar el registro para mezclar sus datos
    const reg = Object.values(regsPorFase).flat().find((r) => r.id === edit.registroId)
    const datos = {
      ...(reg?.datos ?? {}),
      fechaInicio: editVals.fechaInicio || undefined,
      duracionDias: Math.max(1, num(editVals.duracionDias)),
      avance: clamp(num(editVals.avance)),
      responsable: editVals.responsable || undefined,
      costoPresupuestado: num(editVals.costo) || undefined,
      costoReal: num(editVals.costoReal) || undefined,
      anotaciones: incidencias,
    }
    try {
      const r = await fetch(`${API_BASE}/registros-fase/${edit.registroId}`, { method: 'PATCH', headers, body: JSON.stringify({ datos }) })
      if (!r.ok) throw new Error()
      setGuardado('saved'); setEdit(null); cargar()
    } catch { setGuardado('error') } finally { setGuardandoEdit(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando cronograma...</span>
    </div>
  )

  const hayFechas = !!minD && !!maxD
  const abrirChat = () => window.dispatchEvent(new Event('c4:open-chat'))

  return (
    <div className="h-full overflow-y-auto">
      {/* Header + KPIs */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><CalendarRange className="w-5 h-5" /></div>
          <div>
            <h1 className="text-base font-bold">Cronograma de obra</h1>
            <p className="text-xs text-slate-300">Gantt de ejecución — actividades por fase, avance y atrasos</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Inicio', value: kpis.inicio ? fmtCorto(kpis.inicio) : '—' },
            { label: 'Fin estimado', value: kpis.fin ? fmtCorto(kpis.fin) : '—' },
            { label: 'Avance físico', value: `${kpis.avanceGlobal}%` },
            { label: 'Presupuesto', value: kpis.presupuesto ? soles(kpis.presupuesto) : '—' },
            { label: 'Valor ganado', value: kpis.presupuesto ? `${soles(kpis.valorGanado)} · ${kpis.avanceCosto}%` : '—' },
            { label: 'Atrasadas', value: String(kpis.atrasadas), alerta: kpis.atrasadas > 0 },
          ].map((k) => (
            <div key={k.label} className="bg-white/10 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-300 mb-0.5">{k.label}</p>
              <p className={`text-sm font-bold ${(k as any).alerta ? 'text-red-300' : ''}`}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alerta de presupuesto excedido */}
      {(() => {
        const baseline = Number(cfg?.presupuestoBaseline) || 0
        const exc = baseline && kpis.presupuesto > baseline ? kpis.presupuesto - baseline : 0
        return exc > 0 ? (
          <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><b>Presupuesto excedido</b> — el costo actual ({soles(kpis.presupuesto)}) supera la línea base ({soles(baseline)}) en <b>{soles(exc)}</b>. Revisa los metrados/precios que editaste.</span>
          </div>
        ) : null
      })()}

      {/* Barra de acciones */}
      <div className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">Click en una partida para abrir su panel de control (fechas, encargado, presupuesto e incidencias). O pídele a la IA que lo arme.</p>
        <div className="flex items-center gap-2">
          {/* Vistas: día / semana / mes */}
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            {(['dia', 'semana', 'mes'] as Vista[]).map((k) => (
              <button
                key={k}
                onClick={() => setVista(k)}
                className={`px-2.5 py-1.5 text-xs font-medium capitalize transition-colors ${vista === k ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {k === 'dia' ? 'Día' : k}
              </button>
            ))}
          </div>
          <button onClick={abrirChat} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
            <Sparkles className="w-3.5 h-3.5" /> Armar con IA
          </button>
        </div>
      </div>

      {!hayFechas ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3 px-6 text-center">
          <CalendarClock className="w-12 h-12 opacity-30" />
          <p className="text-sm font-semibold text-slate-600">Aún no hay cronograma</p>
          <p className="text-xs max-w-md leading-relaxed">
            Ninguna actividad tiene fecha todavía. Pídele a la IA <span className="font-medium text-slate-600">"arma el cronograma de obra empezando el [fecha]"</span> y lo genera desde tus etapas y actividades, o agrega las fechas tú mismo (necesitas tener actividades creadas en las fases).
          </p>
          <button onClick={abrirChat} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl">
            <Sparkles className="w-3.5 h-3.5" /> Armar con IA
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <GanttSVAR tasks={svarTasks} vista={vista} hoy={hoy} onSelect={abrirEditReg} />
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Las barras de resumen son fases y etapas; las de color, las partidas. El relleno es el % de avance. La línea roja marca HOY y los domingos salen sombreados (no laborables). Click en una partida para abrir su panel de control.
          </p>
        </div>
      )}

      {/* Panel de control de la partida */}
      <AppDialog open={edit !== null} onClose={() => setEdit(null)} title="Control de la partida" wide>
        {edit && (() => {
          const regE = Object.values(regsPorFase).flat().find((r) => r.id === edit.registroId)
          const d = regE?.datos ?? {}
          const f = d.fundamentoDuracion
          const metrado = num(d.cantidad), pu = num(d.precioUnitario), unidad = d.unidad
          const iniD = editVals.fechaInicio ? new Date(editVals.fechaInicio + 'T12:00:00') : null
          const finD = iniD ? addDays(iniD, Math.max(1, num(editVals.duracionDias))) : null
          const ppto = num(editVals.costo), real = num(editVals.costoReal)
          const ganado = ppto * clamp(editVals.avance) / 100
          const desvio = real - ppto
          const sem = real <= 0
            ? { c: 'slate', t: 'Sin costo real registrado aún' }
            : desvio > 0
              ? { c: 'red', t: `Excedido en ${soles(desvio)} sobre lo presupuestado` }
              : real >= ppto * 0.9
                ? { c: 'amber', t: `Al límite — te queda ${soles(ppto - real)}` }
                : { c: 'emerald', t: `Dentro de presupuesto — te queda ${soles(ppto - real)}` }
          const SC: Record<string, string> = {
            slate: 'bg-slate-50 border-slate-200 text-slate-600',
            red: 'bg-red-50 border-red-200 text-red-700',
            amber: 'bg-amber-50 border-amber-200 text-amber-700',
            emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
          }
          const DOT: Record<string, string> = { slate: 'bg-slate-400', red: 'bg-red-500', amber: 'bg-amber-500', emerald: 'bg-emerald-500' }
          return (
          <div className="space-y-5">
            {/* Encabezado */}
            <div>
              <p className="text-sm font-semibold text-slate-800">{edit.nombre}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{FASE_LABEL[edit.fase] ?? edit.fase}</span>
                {edit.estado && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{edit.estado}</span>}
                {edit.atrasada && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Atrasada</span>}
              </div>
            </div>

            {f && (
              <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 leading-relaxed">
                <Ruler className="w-3.5 h-3.5 inline-block mr-1 align-[-2px]" /> Duración calculada: <b>{Number(f.metrado).toLocaleString('es-PE')} {f.unidad ?? ''}</b> ÷ {f.rendimiento_diario}/día{f.frentes > 1 ? ` ÷ ${f.frentes} frentes` : ''} = <b>{f.dias_utiles} días útiles</b>{f.estimado ? ' (rendimiento referencial — ajústalo)' : ''}.
              </p>
            )}

            {/* Fechas y avance */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Fechas y avance</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Inicio</label>
                  <input type="date" className={inputCls} value={editVals.fechaInicio} onChange={(e) => setEditVals((v) => ({ ...v, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Duración (días)</label>
                  <input type="number" min={1} className={inputCls} value={editVals.duracionDias} onChange={(e) => setEditVals((v) => ({ ...v, duracionDias: num(e.target.value) }))} />
                </div>
              </div>
              {iniD && finD && <p className="text-[11px] text-slate-500 mt-1.5">Va del <b>{fmtCorto(iniD)}</b> al <b>{fmtCorto(finD)}</b>.</p>}
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-600 mb-1">Avance: <span className="font-semibold text-slate-800">{editVals.avance}%</span></label>
                <input type="range" min={0} max={100} step={5} className="w-full accent-slate-800" value={editVals.avance} onChange={(e) => setEditVals((v) => ({ ...v, avance: num(e.target.value) }))} />
              </div>
            </section>

            {/* Encargado */}
            <section>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Encargado</label>
              <input className={inputCls} value={editVals.responsable} onChange={(e) => setEditVals((v) => ({ ...v, responsable: e.target.value }))} placeholder="Nombre del responsable / cuadrilla" />
            </section>

            {/* Presupuesto vs real */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Presupuesto de la partida</p>
              {metrado > 0 && pu > 0 && (
                <p className="text-[11px] text-slate-500 mb-2">Metrado <b>{metrado.toLocaleString('es-PE')} {unidad ?? ''}</b> × PU <b>{soles(pu)}</b> = <b>{soles(metrado * pu)}</b></p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Presupuestado (S/)</label>
                  <input type="number" className={inputCls} value={editVals.costo || ''} onChange={(e) => setEditVals((v) => ({ ...v, costo: num(e.target.value) }))} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Costo real / gastado (S/)</label>
                  <input type="number" className={inputCls} value={editVals.costoReal || ''} onChange={(e) => setEditVals((v) => ({ ...v, costoReal: num(e.target.value) }))} placeholder="0" />
                </div>
              </div>
              {ppto > 0 && (
                <div className={`mt-2 text-[11px] rounded-xl px-3 py-2 border ${SC[sem.c]}`}>
                  <b className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full shrink-0 ${DOT[sem.c]}`} /> {sem.t}</b>
                  <span className="block mt-0.5 text-slate-500">Valor ganado (avance × presupuestado): {soles(ganado)} ({clamp(editVals.avance)}%)</span>
                </div>
              )}
            </section>

            {/* Incidencias / bitácora */}
            <section>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Incidencias / bitácora</p>
              <div className="flex gap-2">
                <input
                  className={inputCls}
                  value={incidInput}
                  onChange={(e) => setIncidInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addIncidencia() } }}
                  placeholder="Ej: llovió, se atrasó 1 día / faltó fierro"
                />
                <button onClick={addIncidencia} className="shrink-0 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 rounded-xl">Agregar</button>
              </div>
              {incidencias.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {incidencias.map((a) => (
                    <li key={a.id} className="flex items-start gap-2 text-xs bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 tabular-nums">{a.fecha}</span>
                      <span className="flex-1 text-slate-700">{a.texto}</span>
                      <button onClick={() => removeIncidencia(a.id)} className="text-slate-300 hover:text-red-400 shrink-0"><X className="w-3.5 h-3.5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setEdit(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarEdit} disabled={guardandoEdit} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">{guardandoEdit ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
          )
        })()}
      </AppDialog>
    </div>
  )
}
