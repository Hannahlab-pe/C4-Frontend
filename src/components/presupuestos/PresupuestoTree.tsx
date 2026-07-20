import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft, Plus, Loader2, Trash2, RefreshCw, Lock, FolderPlus, ListPlus, Check, Download, Boxes,
} from 'lucide-react'
import AppDialog from '../AppDialog'
import {
  presupuestosApi, soles, num, TIPO_PRESUP_META,
  type ArbolResponse, type Partida, type PresupuestoItem,
} from '../../lib/presupuestos'
import Valorizaciones from './Valorizaciones'

interface Fila { item: PresupuestoItem; depth: number }

function aplanar(items: PresupuestoItem[]): Fila[] {
  const porPadre = new Map<string | null, PresupuestoItem[]>()
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

export default function PresupuestoTree({ presupuestoId, onBack }: { presupuestoId: string; onBack: () => void }) {
  const [arbol, setArbol] = useState<ArbolResponse | null>(null)
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculando, setRecalculando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [vista, setVista] = useState<'presupuesto' | 'valorizaciones'>('presupuesto')

  // edición inline de metrado
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  // modal agregar
  const [addCtx, setAddCtx] = useState<{ parentId: string | null; parentLabel: string } | null>(null)
  const [prefabOpen, setPrefabOpen] = useState(false)

  const recargar = useCallback(() => presupuestosApi.arbol(presupuestoId).then(setArbol), [presupuestoId])

  useEffect(() => {
    setLoading(true)
    Promise.all([presupuestosApi.arbol(presupuestoId), presupuestosApi.listarPartidas()])
      .then(([a, ps]) => { setArbol(a); setPartidas(ps) })
      .finally(() => setLoading(false))
  }, [presupuestoId])

  const filas = useMemo(() => (arbol ? aplanar(arbol.items) : []), [arbol])
  const congelado = arbol?.presupuesto.congelado

  async function recalcular() {
    setRecalculando(true)
    try { setArbol(await presupuestosApi.recalcular(presupuestoId)) } finally { setRecalculando(false) }
  }
  async function guardarMetrado(id: string) {
    const metrado = Number(editVal); setEditId(null)
    if (Number.isNaN(metrado)) return
    await presupuestosApi.actualizarItem(id, { metrado })
    recargar()
  }
  async function eliminar(id: string) {
    await presupuestosApi.eliminarItem(id); recargar()
  }
  async function exportar() {
    setExportando(true)
    try {
      const blob = await presupuestosApi.exportarExcel(presupuestoId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${arbol?.presupuesto.nombre || 'presupuesto'}.xlsx`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } finally { setExportando(false) }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
  if (!arbol) return <p className="text-sm text-slate-400 py-12 text-center">No se pudo cargar el presupuesto.</p>

  const p = arbol.presupuesto
  const meta = TIPO_PRESUP_META[p.tipo] ?? { label: p.tipo, badge: 'bg-slate-100 text-slate-600 border-slate-200' }

  return (
    <div className="space-y-4">
      {/* Cabecera del presupuesto */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"><ChevronLeft className="w-5 h-5" /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 truncate">{p.nombre}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>{meta.label}</span>
              {congelado && <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500"><Lock className="w-3 h-3" /> Congelado</span>}
            </div>
            <p className="text-xs text-slate-400">GG {num(Number(p.ggPorcentaje) * 100, 1)}% · Utilidad {num(Number(p.utilidadPorcentaje) * 100, 1)}% · IGV {num(Number(p.igvPorcentaje) * 100, 0)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {([['presupuesto', 'Presupuesto'], ['valorizaciones', 'Valorizaciones']] as const).map(([k, lbl]) => (
              <button key={k} onClick={() => setVista(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${vista === k ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {lbl}
              </button>
            ))}
          </div>
          {vista === 'presupuesto' && (<>
          <button onClick={exportar} disabled={exportando} title="Descargar el presupuesto en Excel"
            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            {exportando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Excel
          </button>
          <button onClick={recalcular} disabled={recalculando || congelado}
            title={congelado ? 'Congelado' : 'Refresca los P.U. desde los APU en vivo'}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm font-medium px-3 py-2 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <RefreshCw className={`w-4 h-4 ${recalculando ? 'animate-spin' : ''}`} /> Recalcular
          </button>
          {!congelado && (
            <button onClick={() => setPrefabOpen(true)} title="Agregar un prefabricado Betondecken (prelosa / muro Doppel)"
              className="flex items-center gap-2 border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-sm font-medium px-3 py-2 rounded-xl transition-colors">
              <Boxes className="w-4 h-4" /> Prefabricado
            </button>
          )}
          {!congelado && (
            <button onClick={() => setAddCtx({ parentId: null, parentLabel: 'Nivel raíz' })}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Agregar
            </button>
          )}
          </>)}
        </div>
      </div>

      {vista === 'valorizaciones' ? (
        <Valorizaciones presupuestoId={presupuestoId} />
      ) : (<>
      {/* Árbol */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-3 font-semibold">Descripción</th>
                <th className="px-3 py-3 font-semibold text-right w-28">Metrado</th>
                <th className="px-3 py-3 font-semibold text-right w-28">P.U. (S/)</th>
                <th className="px-4 py-3 font-semibold text-right w-32">Parcial (S/)</th>
                <th className="px-2 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filas.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">Presupuesto vacío. Usa <b>Agregar</b> para crear títulos y partidas.</td></tr>
              )}
              {filas.map(({ item, depth }) => {
                const esTitulo = item.tipo === 'titulo'
                const monto = esTitulo ? arbol.subtotales[item.id] : arbol.parciales[item.id]
                return (
                  <tr key={item.id} className={`group ${esTitulo ? 'bg-slate-50/50' : 'hover:bg-slate-50/60'}`}>
                    <td className="px-4 py-2.5">
                      <div style={{ paddingLeft: depth * 20 }} className="flex items-center gap-2">
                        {item.codigo && <span className="font-mono text-[11px] text-slate-400 shrink-0">{item.codigo}</span>}
                        <span className={esTitulo ? 'font-bold text-slate-800 uppercase text-[13px] tracking-wide' : 'text-slate-700'}>{item.descripcion || <span className="text-slate-400 italic">(sin nombre)</span>}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {esTitulo ? '' : editId === item.id ? (
                        <input autoFocus type="number" step="0.0001" value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          onBlur={() => guardarMetrado(item.id)}
                          onKeyDown={(e) => { if (e.key === 'Enter') guardarMetrado(item.id); if (e.key === 'Escape') setEditId(null) }}
                          className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-100" />
                      ) : (
                        <button disabled={congelado} onClick={() => { setEditId(item.id); setEditVal(String(Number(item.metrado ?? 0))) }}
                          className="text-slate-700 tabular-nums enabled:hover:text-blue-600 enabled:hover:underline decoration-dotted underline-offset-4 disabled:cursor-default">
                          {num(item.metrado ?? 0, 2)}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">{esTitulo ? '' : num(item.costoUnitarioSnapshot ?? 0)}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${esTitulo ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{num(monto ?? 0)}</td>
                    <td className="px-2 py-2.5">
                      {!congelado && (
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {esTitulo && (
                            <button onClick={() => setAddCtx({ parentId: item.id, parentLabel: item.descripcion || 'título' })}
                              title="Agregar dentro" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Plus className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => eliminar(item.id)} title="Eliminar" className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-4">
          <div className="ml-auto max-w-sm space-y-1.5">
            <TotalRow label="Costo Directo" value={arbol.costoDirecto} />
            <TotalRow label={`Gastos Generales (${num(Number(p.ggPorcentaje) * 100, 1)}%${Number(p.ggFijo) > 0 ? ' + fijo' : ''})`} value={arbol.gastosGenerales} />
            <TotalRow label={`Utilidad (${num(Number(p.utilidadPorcentaje) * 100, 1)}%)`} value={arbol.utilidad} />
            <div className="border-t border-slate-200 my-1" />
            <TotalRow label="Subtotal" value={arbol.subtotal} semi />
            <TotalRow label={`IGV (${num(Number(p.igvPorcentaje) * 100, 0)}%)`} value={arbol.igv} />
            <div className="border-t-2 border-slate-300 my-1" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">TOTAL</span>
              <span className="text-lg font-bold text-blue-600 tabular-nums">{soles(arbol.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {congelado && (
        <p className="text-[11px] text-slate-400 px-1 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Línea base congelada: los cambios se registran como adicional/deductivo, no editando el árbol.</p>
      )}
      </>)}

      {addCtx && (
        <AgregarItemDialog
          ctx={addCtx} partidas={partidas} presupuestoId={presupuestoId}
          onClose={() => setAddCtx(null)}
          onDone={() => { setAddCtx(null); recargar() }}
        />
      )}

      {prefabOpen && arbol && (
        <BetondeckenDialog
          partidas={partidas}
          titulos={arbol.items.filter((i) => i.tipo === 'titulo')}
          presupuestoId={presupuestoId}
          onClose={() => setPrefabOpen(false)}
          onDone={() => { setPrefabOpen(false); recargar() }}
        />
      )}
    </div>
  )
}

// ── Modal: agregar un prefabricado Betondecken (prelosa / muro Doppel) ──
function BetondeckenDialog({ partidas, titulos, presupuestoId, onClose, onDone }: {
  partidas: Partida[]; titulos: PresupuestoItem[]; presupuestoId: string; onClose: () => void; onDone: () => void
}) {
  const prefab = partidas.filter((p) => (p.especialidad || '').toLowerCase().includes('betondecken') || (p.codigo || '').toUpperCase().startsWith('BD'))
  const [sel, setSel] = useState('')
  const [metrado, setMetrado] = useState('')
  const [parentId, setParentId] = useState('')
  const [precio, setPrecio] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const selPartida = prefab.find((p) => p.id === sel)
  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

  useEffect(() => {
    if (!sel) { setPrecio(null); return }
    presupuestosApi.getApu(sel).then((r) => setPrecio(r.calculo.costoUnitario)).catch(() => setPrecio(null))
  }, [sel])

  async function agregar() {
    if (!sel) return
    setGuardando(true)
    try {
      await presupuestosApi.crearItem(presupuestoId, {
        tipo: 'partida', parentId: parentId || null, partidaId: sel,
        codigo: selPartida?.codigo || '', descripcion: selPartida?.descripcion || '',
        metrado: Number(metrado) || 0,
      })
      onDone()
    } finally { setGuardando(false) }
  }

  return (
    <AppDialog open onClose={onClose} title="Prefabricado Betondecken">
      {prefab.length === 0 ? (
        <p className="text-sm text-slate-500">El catálogo Betondecken aún no está disponible. Reinicia el backend para sembrarlo.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500 mb-3">
            Elige un prefabricado <b>Doppel</b>. El precio es <b>referencial</b> — edítalo en la pestaña Recursos con el precio real de Betondecken.
          </p>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {prefab.map((p) => (
              <button key={p.id} onClick={() => setSel(p.id)}
                className={`w-full text-left flex items-center justify-between gap-3 border rounded-xl px-3 py-2.5 transition-colors ${sel === p.id ? 'border-blue-400 bg-blue-50/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{p.descripcion}</p>
                  <p className="text-[11px] text-slate-400">{p.codigo} · {p.unidad}</p>
                </div>
                {sel === p.id && precio != null && <span className="text-sm font-bold text-blue-600 tabular-nums shrink-0">{soles(precio)}/{p.unidad}</span>}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Metrado</label>
              <input type="number" step="0.0001" value={metrado} onChange={(e) => setMetrado(e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Dentro de</label>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
                <option value="">Nivel raíz</option>
                {titulos.map((t) => <option key={t.id} value={t.id}>{t.descripcion || t.codigo}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={agregar} disabled={guardando || !sel}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Boxes className="w-4 h-4" />} Agregar al presupuesto
            </button>
          </div>
        </>
      )}
    </AppDialog>
  )
}

function TotalRow({ label, value, semi }: { label: string; value: number; semi?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs ${semi ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${semi ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{soles(value)}</span>
    </div>
  )
}

// ── Modal: agregar título o partida ──
function AgregarItemDialog({ ctx, partidas, presupuestoId, onClose, onDone }: {
  ctx: { parentId: string | null; parentLabel: string }
  partidas: Partida[]; presupuestoId: string; onClose: () => void; onDone: () => void
}) {
  const [tipo, setTipo] = useState<'titulo' | 'partida'>('titulo')
  const [codigo, setCodigo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [partidaId, setPartidaId] = useState('')
  const [metrado, setMetrado] = useState('')
  const [guardando, setGuardando] = useState(false)

  const partidaSel = partidas.find((p) => p.id === partidaId)

  async function guardar() {
    setGuardando(true)
    try {
      if (tipo === 'titulo') {
        if (!descripcion.trim()) return
        await presupuestosApi.crearItem(presupuestoId, { tipo: 'titulo', parentId: ctx.parentId, codigo: codigo.trim(), descripcion: descripcion.trim() })
      } else {
        if (!partidaId) return
        await presupuestosApi.crearItem(presupuestoId, {
          tipo: 'partida', parentId: ctx.parentId, partidaId,
          codigo: codigo.trim() || partidaSel?.codigo || '',
          descripcion: descripcion.trim() || partidaSel?.descripcion || '',
          metrado: Number(metrado) || 0,
        })
      }
      onDone()
    } finally { setGuardando(false) }
  }

  const valido = tipo === 'titulo' ? !!descripcion.trim() : !!partidaId
  const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

  return (
    <AppDialog open onClose={onClose} title="Agregar elemento">
      <p className="text-xs text-slate-400 mb-3">Dentro de: <span className="font-medium text-slate-600">{ctx.parentLabel}</span></p>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4">
        {([['titulo', 'Título', FolderPlus], ['partida', 'Partida', ListPlus]] as const).map(([k, lbl, Icon]) => (
          <button key={k} onClick={() => setTipo(k)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tipo === k ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Icon className="w-3.5 h-3.5" /> {lbl}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Código</label>
            <input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder={tipo === 'titulo' ? '01' : 'auto'} className={inputCls} />
          </div>
          {tipo === 'partida' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Metrado</label>
              <input type="number" step="0.0001" value={metrado} onChange={(e) => setMetrado(e.target.value)} placeholder="0" className={inputCls} />
            </div>
          )}
          <div className={tipo === 'partida' ? '' : 'col-span-2'}>
            {tipo === 'partida' && partidaSel && <><label className="block text-xs font-medium text-slate-600 mb-1.5">Unidad</label><div className="px-3 py-2.5 text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-100">{partidaSel.unidad}</div></>}
          </div>
        </div>

        {tipo === 'partida' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Partida (del catálogo) <span className="text-red-400">*</span></label>
            <select value={partidaId} onChange={(e) => setPartidaId(e.target.value)} className={inputCls}>
              <option value="">Selecciona una partida…</option>
              {partidas.map((p) => <option key={p.id} value={p.id}>{p.codigo} · {p.descripcion}</option>)}
            </select>
            {partidas.length === 0 && <p className="text-[11px] text-amber-500 mt-1">No hay partidas en el catálogo. Créalas en la pestaña Partidas / APU.</p>}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Descripción {tipo === 'titulo' && <span className="text-red-400">*</span>}
            {tipo === 'partida' && <span className="text-slate-400 font-normal"> (opcional, toma la de la partida)</span>}
          </label>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
            placeholder={tipo === 'titulo' ? 'ESTRUCTURAS' : partidaSel?.descripcion ?? '...'} className={inputCls} />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
        <button onClick={guardar} disabled={guardando || !valido}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-4 h-4" />} Agregar
        </button>
      </div>
    </AppDialog>
  )
}
