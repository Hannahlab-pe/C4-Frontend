import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import AppDialog from '../AppDialog'
import InfoTip from '../InfoTip'
import {
  presupuestosApi, soles, num,
  type ValorizacionResumen, type ValorizacionDetalle, type ValorizacionItemCalc,
} from '../../lib/presupuestos'

interface Fila { item: ValorizacionItemCalc; depth: number }

function aplanar(items: ValorizacionItemCalc[]): Fila[] {
  const porPadre = new Map<string | null, ValorizacionItemCalc[]>()
  for (const it of items) {
    const k = it.parentId ?? null
    if (!porPadre.has(k)) porPadre.set(k, [])
    porPadre.get(k)!.push(it)
  }
  for (const arr of porPadre.values()) arr.sort((a, b) => a.orden - b.orden)
  const filas: Fila[] = []
  const walk = (padre: string | null, depth: number) => {
    for (const it of porPadre.get(padre) ?? []) {
      filas.push({ item: it, depth })
      if (it.tipo === 'titulo') walk(it.id, depth + 1)
    }
  }
  walk(null, 0)
  return filas
}

export default function Valorizaciones({ presupuestoId }: { presupuestoId: string }) {
  const [lista, setLista] = useState<ValorizacionResumen[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [detalle, setDetalle] = useState<ValorizacionDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [cargandoDet, setCargandoDet] = useState(false)
  const [nueva, setNueva] = useState(false)
  const [periodo, setPeriodo] = useState('')
  const [creando, setCreando] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')
  // Condiciones de cobro del contrato (se guardan en la cabecera, afectan todas las valorizaciones)
  const [adelInput, setAdelInput] = useState('0')
  const [garInput, setGarInput] = useState('0')

  const cargarLista = useCallback(async () => {
    const l = await presupuestosApi.listarValorizaciones(presupuestoId)
    setLista(l)
    return l
  }, [presupuestoId])

  useEffect(() => {
    setLoading(true)
    cargarLista()
      .then((l) => { if (l.length) setSelId(l[l.length - 1].id) })
      .finally(() => setLoading(false))
  }, [cargarLista])

  useEffect(() => {
    if (!selId) { setDetalle(null); return }
    setCargandoDet(true)
    presupuestosApi.getValorizacion(selId).then(setDetalle).finally(() => setCargandoDet(false))
  }, [selId])

  // Sincroniza los inputs de % con lo guardado (fracción → %)
  useEffect(() => {
    if (!detalle) return
    setAdelInput(String(+((detalle.totales.adelanto_pct ?? 0) * 100).toFixed(2)))
    setGarInput(String(+((detalle.totales.fondo_garantia_pct ?? 0) * 100).toFixed(2)))
  }, [detalle])

  async function guardarDeduccion(campo: 'adelantoPct' | 'fondoGarantiaPct', valorPct: string) {
    const frac = Math.min(1, Math.max(0, (Number(valorPct) || 0) / 100))
    await presupuestosApi.actualizarDeducciones(presupuestoId, { [campo]: frac })
    if (selId) setDetalle(await presupuestosApi.getValorizacion(selId))
  }

  async function crear() {
    setCreando(true)
    try {
      const det = await presupuestosApi.crearValorizacion(presupuestoId, periodo)
      setNueva(false); setPeriodo('')
      await cargarLista()
      setSelId(det.valorizacion.id)
      setDetalle(det)
    } finally { setCreando(false) }
  }

  async function guardarAvance(itemId: string) {
    const pct = Number(editVal); setEditId(null)
    if (Number.isNaN(pct) || !selId) return
    setSavingId(itemId)
    try { setDetalle(await presupuestosApi.actualizarAvance(selId, itemId, pct)) }
    finally { setSavingId(null) }
  }

  async function eliminar(id: string) {
    await presupuestosApi.eliminarValorizacion(id)
    setSelId(null); setDetalle(null)
    const l = await cargarLista()
    setSelId(l.length ? l[l.length - 1].id : null)
  }

  const filas = useMemo(() => (detalle ? aplanar(detalle.items) : []), [detalle])
  const esUltima = detalle && lista.length > 0 && lista[lista.length - 1].id === detalle.valorizacion.id

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>

  return (
    <div className="space-y-4">
      {/* Selector de períodos */}
      <div className="flex items-center gap-2 flex-wrap">
        {lista.map((v) => (
          <button key={v.id} onClick={() => setSelId(v.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${selId === v.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            #{v.numero} · {v.periodo}
          </button>
        ))}
        <button onClick={() => setNueva(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nueva valorización
        </button>
      </div>

      {lista.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-slate-600 font-medium">Aún no hay valorizaciones</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Crea la primera para registrar el % de avance de cada partida y ver <b>cuánto facturas este mes</b> contra el presupuesto.
          </p>
        </div>
      )}

      {cargandoDet && !detalle && (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
      )}

      {detalle && (
        <>
          {/* KPIs del período */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Avance global" value={`${num(detalle.totales.avance_global_pct, 1)}%`} sub="del presupuesto" />
            <Kpi label="Valorización bruta" value={soles(detalle.totales.total_periodo)} sub="del período, con IGV" />
            <Kpi label="Neto a cobrar" value={soles(detalle.totales.neto_periodo)} accent sub="este período, tras deducciones" />
            <Kpi label="Neto acumulado" value={soles(detalle.totales.neto_acum)} sub="a la fecha" />
          </div>

          {/* Condiciones de cobro del contrato (se descuentan de cada valorización) */}
          <div className="flex items-center gap-x-6 gap-y-2 flex-wrap bg-white rounded-2xl border border-slate-200 px-4 py-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Condiciones de cobro</span>
              <InfoTip title="¿Qué se descuenta de la valorización?">
                <p><b className="text-slate-700">Amortización del adelanto</b>: si el cliente te dio un adelanto (para caja o materiales), cada valorización devuelve una parte. Se descuenta ese % sobre el bruto del período.</p>
                <p><b className="text-slate-700">Fondo de garantía</b> (retención): el cliente retiene un % de cada valorización como garantía y te lo devuelve en la liquidación final.</p>
                <p><b className="text-slate-700">Neto a cobrar</b> = bruto − amortización − garantía. Ajusta los % a tu contrato.</p>
              </InfoTip>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Adelanto amortizable
              <span className="flex items-center">
                <input type="number" min={0} max={100} step="0.1" value={adelInput}
                  onChange={(e) => setAdelInput(e.target.value)}
                  onBlur={() => guardarDeduccion('adelantoPct', adelInput)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <span className="ml-1 text-slate-400">%</span>
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              Fondo de garantía
              <span className="flex items-center">
                <input type="number" min={0} max={100} step="0.1" value={garInput}
                  onChange={(e) => setGarInput(e.target.value)}
                  onBlur={() => guardarDeduccion('fondoGarantiaPct', garInput)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                  className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                <span className="ml-1 text-slate-400">%</span>
              </span>
            </label>
          </div>

          {/* Tabla de avance */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="px-4 py-3 font-semibold">Descripción</th>
                    <th className="px-3 py-3 font-semibold text-right w-32">Presupuesto (S/)</th>
                    <th className="px-3 py-3 font-semibold text-right w-24">% Avance</th>
                    <th className="px-3 py-3 font-semibold text-right w-36">Valorizado período</th>
                    <th className="px-4 py-3 font-semibold text-right w-32">Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filas.map(({ item, depth }) => {
                    const esTitulo = item.tipo === 'titulo'
                    return (
                      <tr key={item.id} className={esTitulo ? 'bg-slate-50/50' : 'hover:bg-slate-50/60'}>
                        <td className="px-4 py-2.5">
                          <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-2">
                            {item.codigo && <span className="font-mono text-[11px] text-slate-400 shrink-0">{item.codigo}</span>}
                            <span className={esTitulo ? 'font-bold text-slate-800 uppercase text-[13px] tracking-wide' : 'text-slate-700'}>{item.descripcion || <span className="text-slate-400 italic">(sin nombre)</span>}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{num(item.parcial)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {esTitulo ? '' : editId === item.id ? (
                            <input autoFocus type="number" min={0} max={100} step="1" value={editVal}
                              onChange={(e) => setEditVal(e.target.value)}
                              onBlur={() => guardarAvance(item.id)}
                              onKeyDown={(e) => { if (e.key === 'Enter') guardarAvance(item.id); if (e.key === 'Escape') setEditId(null) }}
                              className="w-16 border border-blue-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-100" />
                          ) : (
                            <button onClick={() => { setEditId(item.id); setEditVal(String(item.pctAvance ?? 0)) }}
                              className="text-slate-700 tabular-nums hover:text-blue-600 hover:underline decoration-dotted underline-offset-4 inline-flex items-center gap-1">
                              {savingId === item.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              {num(item.pctAvance ?? 0, 0)}%
                            </button>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums ${esTitulo ? 'font-bold text-slate-800' : 'font-semibold text-emerald-700'}`}>{num(item.valorizadoPeriodo)}</td>
                        <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{num(item.valorizadoAcum)}</td>
                      </tr>
                    )
                  })}
                  {filas.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">El presupuesto no tiene partidas todavía.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totales del período */}
            <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-4">
              <div className="ml-auto max-w-sm space-y-1.5">
                <Row label="Costo directo del período" value={detalle.totales.cd_periodo} />
                <Row label="Gastos generales" value={detalle.totales.gg_periodo} />
                <Row label="Utilidad" value={detalle.totales.ut_periodo} />
                <Row label="IGV" value={detalle.totales.igv_periodo} />
                <div className="border-t border-slate-200 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Valorización bruta del período</span>
                  <span className="text-sm font-bold text-slate-700 tabular-nums">{soles(detalle.totales.total_periodo)}</span>
                </div>
                {detalle.totales.adelanto_pct > 0 && (
                  <Row label={`− Amortización de adelanto (${num(detalle.totales.adelanto_pct * 100, 1)}%)`} value={-detalle.totales.amort_periodo} />
                )}
                {detalle.totales.fondo_garantia_pct > 0 && (
                  <Row label={`− Fondo de garantía (${num(detalle.totales.fondo_garantia_pct * 100, 1)}%)`} value={-detalle.totales.retencion_periodo} />
                )}
                <div className="border-t-2 border-slate-300 my-1" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">NETO A COBRAR</span>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">{soles(detalle.totales.neto_periodo)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] text-slate-400">
              El % de avance es <b>acumulado</b> (total ejecutado a la fecha). Lo del período = lo nuevo respecto a la valorización anterior.
            </p>
            {esUltima && lista.length > 0 && (
              <button onClick={() => eliminar(detalle.valorizacion.id)} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar esta valorización
              </button>
            )}
          </div>
        </>
      )}

      {/* Nueva valorización */}
      <AppDialog open={nueva} onClose={() => setNueva(false)} title="Nueva valorización">
        <p className="text-xs text-slate-500 mb-3">Arranca desde el avance acumulado de la anterior. Solo pon el nombre del período.</p>
        <label className="block text-xs font-medium text-slate-600 mb-1.5">Período</label>
        <input autoFocus value={periodo} onChange={(e) => setPeriodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Ej: Agosto 2026"
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
        <div className="flex gap-3 mt-6">
          <button onClick={() => setNueva(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={crear} disabled={creando}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {creando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear valorización
          </button>
        </div>
      </AppDialog>
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
      <p className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-700 tabular-nums">{soles(value)}</span>
    </div>
  )
}
