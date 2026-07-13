import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  CalendarRange, Loader2, ChevronRight, ChevronDown, CalendarClock,
  AlertTriangle, Flag, Sparkles, ZoomIn, ZoomOut, User,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from '../components/AppDialog'
import {
  ESQUEMAS_REGISTRO, FASES_CONFIG_MIN, agruparPorEtapa, avanceEtapa, avanceFase,
  type RegistroFase, type EtapaFase,
} from '../lib/registros-fase'

const FASES = ['demolicion', 'excavacion', 'construccion', 'acabados', 'administracion'] as const

const FASE_COLOR: Record<string, { bar: string; soft: string; text: string }> = {
  demolicion:     { bar: 'bg-rose-500',    soft: 'bg-rose-100',    text: 'text-rose-700' },
  excavacion:     { bar: 'bg-orange-500',  soft: 'bg-orange-100',  text: 'text-orange-700' },
  construccion:   { bar: 'bg-blue-500',    soft: 'bg-blue-100',    text: 'text-blue-700' },
  acabados:       { bar: 'bg-violet-500',  soft: 'bg-violet-100',  text: 'text-violet-700' },
  administracion: { bar: 'bg-emerald-500', soft: 'bg-emerald-100', text: 'text-emerald-700' },
}

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

export default function CronogramaObraPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.token)
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token])

  const [etapasPorFase, setEtapasPorFase] = useState<Record<string, EtapaFase[]>>({})
  const [regsPorFase, setRegsPorFase] = useState<Record<string, RegistroFase[]>>({})
  const [loading, setLoading] = useState(true)
  const [colapsados, setColapsados] = useState<Set<string>>(new Set())
  const [dayW, setDayW] = useState(6)
  const [edit, setEdit] = useState<Row | null>(null)
  const [editVals, setEditVals] = useState<{ fechaInicio: string; duracionDias: number; avance: number; responsable: string; costo: number }>({ fechaInicio: '', duracionDias: 1, avance: 0, responsable: '', costo: 0 })
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

  // ── Construir el árbol de filas (fase → etapa → actividad) con fechas ──
  const { rows, minD, maxD, kpis } = useMemo(() => {
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
      if (colapsados.has(faseId)) continue

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
        if (colapsados.has(etId)) continue

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
  }, [regsPorFase, etapasPorFase, colapsados, hoy])

  const totalDays = minD && maxD ? diffDays(minD, maxD) : 0
  const timelineW = Math.max(600, totalDays * dayW)
  const xDe = (d: Date) => (minD ? diffDays(minD, d) * dayW : 0)

  // columnas de meses para el header
  const meses = useMemo(() => {
    if (!minD || !maxD) return [] as { label: string; left: number; width: number }[]
    const out: { label: string; left: number; width: number }[] = []
    let cur = new Date(minD.getFullYear(), minD.getMonth(), 1, 12)
    while (cur < maxD) {
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1, 12)
      const ini = cur < minD ? minD : cur
      const fin = next > maxD ? maxD : next
      out.push({
        label: cur.toLocaleDateString('es-PE', { month: 'short', year: '2-digit' }),
        left: xDe(ini), width: Math.max(0, diffDays(ini, fin) * dayW),
      })
      cur = next
    }
    return out
  }, [minD, maxD, dayW])

  const toggle = (id: string) => setColapsados((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  function abrirEdit(row: Row) {
    if (row.tipo !== 'actividad' || !row.registroId) return
    setEdit(row)
    setEditVals({
      fechaInicio: row.inicio ? toInput(row.inicio) : '',
      duracionDias: row.inicio && row.fin ? diffDays(row.inicio, row.fin) : 1,
      avance: row.avance,
      responsable: row.responsable ?? '',
      costo: row.costo ?? 0,
    })
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
        <p className="text-xs text-slate-500">Click en una actividad para editar fecha, duración, avance y costo. O pídele a la IA que lo arme.</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setDayW((z) => Math.max(2, z - 2))} className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDayW((z) => Math.min(20, z + 2))} className="w-7 h-7 flex items-center justify-center border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"><ZoomIn className="w-3.5 h-3.5" /></button>
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
            <div className="overflow-x-auto">
              <div style={{ width: 320 + timelineW }}>
                {/* Header de meses */}
                <div className="flex sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                  <div className="sticky left-0 z-30 w-80 shrink-0 bg-slate-50 border-r border-slate-200 px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Actividad</div>
                  <div className="relative shrink-0" style={{ width: timelineW, height: 32 }}>
                    {meses.map((m, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-r border-slate-200 text-[11px] text-slate-500 font-medium flex items-center px-2 capitalize" style={{ left: m.left, width: m.width }}>
                        {m.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filas */}
                <div className="relative">
                  {/* Línea de HOY */}
                  {minD && maxD && hoy >= minD && hoy <= maxD && (
                    <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10 pointer-events-none" style={{ left: 320 + xDe(hoy) }}>
                      <div className="absolute -top-0 -left-4 text-[9px] text-red-500 font-bold bg-white px-1 rounded">HOY</div>
                    </div>
                  )}

                  {rows.map((row) => {
                    const col = FASE_COLOR[row.fase] ?? FASE_COLOR.construccion
                    const tieneBar = !!(row.inicio && row.fin)
                    const left = row.inicio ? xDe(row.inicio) : 0
                    const width = row.inicio && row.fin ? Math.max(6, diffDays(row.inicio, row.fin) * dayW) : 0
                    const esGrupo = row.tipo !== 'actividad'
                    const colapsado = colapsados.has(row.id)
                    return (
                      <div key={row.id} className={`flex items-stretch border-b border-slate-50 group ${row.tipo === 'actividad' ? 'hover:bg-slate-50/60 cursor-pointer' : 'bg-slate-50/40'}`}
                        onClick={() => abrirEdit(row)}>
                        {/* Columna izquierda (nombre) */}
                        <div className={`sticky left-0 z-10 w-80 shrink-0 border-r border-slate-200 px-4 py-2 flex items-center gap-1.5 ${row.tipo === 'actividad' ? 'bg-white group-hover:bg-slate-50/60' : 'bg-slate-50/40'}`}
                          style={{ paddingLeft: 12 + row.nivel * 16 }}>
                          {esGrupo ? (
                            <button onClick={(e) => { e.stopPropagation(); toggle(row.id) }} className="text-slate-400 hover:text-slate-600 shrink-0">
                              {colapsado ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          ) : <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.bar}`} />}
                          <div className="min-w-0 flex-1">
                            <p className={`truncate ${row.nivel === 0 ? 'text-sm font-bold text-slate-800' : row.nivel === 1 ? 'text-xs font-semibold text-slate-700' : 'text-xs text-slate-600'}`}>{row.nombre}</p>
                            {row.tipo === 'actividad' && row.responsable && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate"><User className="w-2.5 h-2.5" />{row.responsable}</p>
                            )}
                          </div>
                          {row.atrasada && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                          {!!row.costo && (
                            <span className="text-[10px] tabular-nums shrink-0 text-slate-500 hidden sm:inline" title={`Valor ganado: ${soles(row.valorGanado ?? 0)}`}>{soles(row.costo)}</span>
                          )}
                          <span className={`text-[10px] font-semibold tabular-nums shrink-0 w-8 text-right ${row.avance >= 100 ? 'text-emerald-600' : 'text-slate-400'}`}>{row.avance}%</span>
                        </div>
                        {/* Timeline */}
                        <div className="relative shrink-0 py-2" style={{ width: timelineW }}>
                          {tieneBar ? (
                            <div className={`absolute h-5 rounded-md ${esGrupo ? `${col.soft} border ${col.text}` : col.bar} shadow-sm overflow-hidden`}
                              style={{ left, width, top: row.nivel === 0 ? 8 : 9 }}
                              title={`${row.nombre}: ${fmtCorto(row.inicio!)} → ${fmtCorto(row.fin!)} · ${row.avance}%`}>
                              {!esGrupo && <div className="absolute inset-y-0 left-0 bg-black/25" style={{ width: `${row.avance}%` }} />}
                              {row.atrasada && <div className="absolute inset-0 ring-2 ring-red-400 rounded-md" />}
                              {esGrupo && <div className="absolute inset-y-0 left-0 bg-black/10" style={{ width: `${row.avance}%` }} />}
                            </div>
                          ) : (
                            <div className="absolute left-2 top-2.5 text-[10px] text-slate-300 italic">sin fecha</div>
                          )}
                          {row.hito && row.inicio && (
                            <Flag className="absolute w-3.5 h-3.5 text-slate-700" style={{ left: left - 6, top: 8 }} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Las barras claras son fases/etapas (resumen); las de color, actividades. El relleno oscuro es el % de avance. La línea roja es HOY; en rojo, lo atrasado.
          </p>
        </div>
      )}

      {/* Modal editar actividad */}
      <AppDialog open={edit !== null} onClose={() => setEdit(null)} title="Editar actividad del cronograma">
        {edit && (() => {
          const regE = Object.values(regsPorFase).flat().find((r) => r.id === edit.registroId)
          const f = regE?.datos?.fundamentoDuracion
          return (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-800">{edit.nombre}</p>
            {f && (
              <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 leading-relaxed">
                📐 Duración calculada: <b>{Number(f.metrado).toLocaleString('es-PE')} {f.unidad ?? ''}</b> ÷ {f.rendimiento_diario}/día{f.frentes > 1 ? ` ÷ ${f.frentes} frentes` : ''} = <b>{f.dias_utiles} días útiles</b> (metrado ÷ rendimiento).
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de inicio</label>
                <input type="date" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400" value={editVals.fechaInicio} onChange={(e) => setEditVals((v) => ({ ...v, fechaInicio: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Duración (días)</label>
                <input type="number" min={1} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400" value={editVals.duracionDias} onChange={(e) => setEditVals((v) => ({ ...v, duracionDias: num(e.target.value) }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Avance: <span className="font-semibold text-slate-800">{editVals.avance}%</span></label>
              <input type="range" min={0} max={100} step={5} className="w-full accent-slate-800" value={editVals.avance} onChange={(e) => setEditVals((v) => ({ ...v, avance: num(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Responsable</label>
                <input className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400" value={editVals.responsable} onChange={(e) => setEditVals((v) => ({ ...v, responsable: e.target.value }))} placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Costo presupuestado (S/)</label>
                <input type="number" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400" value={editVals.costo || ''} onChange={(e) => setEditVals((v) => ({ ...v, costo: num(e.target.value) }))} placeholder="0" />
                {editVals.costo > 0 && <p className="text-[10px] text-slate-400 mt-1">Valor ganado: {soles(editVals.costo * clamp(editVals.avance) / 100)} ({clamp(editVals.avance)}%)</p>}
              </div>
            </div>
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
