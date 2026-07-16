import { useEffect, useState } from 'react'
import { Upload, Loader2, FileSpreadsheet, ChevronLeft, Check, AlertTriangle } from 'lucide-react'
import api from '../../lib/api'
import { presupuestosApi, num, TIPO_PRESUP_META, type Partida, type TipoPresupuesto } from '../../lib/presupuestos'

interface Match { tipo: 'codigo' | 'texto' | 'nuevo'; partidaId: string | null; codigoCatalogo: string | null; descripcionCatalogo: string | null; confianza: number }
interface FilaPreview {
  fila: number; esTitulo: boolean; codigo: string; descripcion: string; unidad: string
  metrado: number | null; precioUnitario: number | null; parcial: number | null; nivel: number; match: Match | null
}
interface Preview {
  hoja: string; columnas: Record<string, number>; advertencias: string[]
  resumen: { titulos: number; partidas: number; match_codigo: number; match_texto: number; nuevas: number }
  filas: FilaPreview[]
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

export default function ImportarExcel({ proyectoId, onCancel, onDone }: { proyectoId: string; onCancel: () => void; onDone: (id: string) => void }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState('')
  const [partidas, setPartidas] = useState<Partida[]>([])
  const [decisiones, setDecisiones] = useState<Record<number, string>>({}) // idx → 'match:<id>' | 'nueva' | 'solo'
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoPresupuesto>('meta')
  const [gg, setGg] = useState('10'); const [ut, setUt] = useState('8'); const [igv, setIgv] = useState('18')
  const [creando, setCreando] = useState(false)

  useEffect(() => { presupuestosApi.listarPartidas().then(setPartidas).catch(() => {}) }, [])

  async function subir(file: File) {
    setSubiendo(true); setError('')
    try {
      const fd = new FormData(); fd.append('archivo', file)
      const { data } = await api.post<any>('/presupuestos/import/preview', fd)
      if (data?.error) { setError(data.error); return }
      setPreview(data)
      setNombre(file.name.replace(/\.(xlsx|xls)$/i, ''))
      const dec: Record<number, string> = {}
      data.filas.forEach((f: FilaPreview, i: number) => { if (!f.esTitulo) dec[i] = f.match?.partidaId ? `match:${f.match.partidaId}` : 'nueva' })
      setDecisiones(dec)
    } catch (e: any) { setError(e?.response?.data?.message || e?.message || 'No pude leer el archivo.') }
    finally { setSubiendo(false) }
  }

  async function confirmar() {
    if (!preview || !nombre.trim()) return
    setCreando(true)
    try {
      const filas = preview.filas.map((f, i) => {
        if (f.esTitulo) return { esTitulo: true, codigo: f.codigo, descripcion: f.descripcion, nivel: f.nivel }
        const d = decisiones[i] || 'nueva'
        const decision = d.startsWith('match:') ? 'match' : d
        const partidaId = d.startsWith('match:') ? d.slice(6) : undefined
        return { esTitulo: false, codigo: f.codigo, descripcion: f.descripcion, unidad: f.unidad, metrado: f.metrado, precioUnitario: f.precioUnitario, nivel: f.nivel, decision, partidaId }
      })
      const { data } = await api.post<any>('/presupuestos/import/confirmar', {
        proyectoId, nombre: nombre.trim(), tipo, archivo: preview.hoja,
        ggPorcentaje: Number(gg) / 100, utilidadPorcentaje: Number(ut) / 100, igvPorcentaje: Number(igv) / 100, filas,
      })
      onDone(data.presupuesto.id)
    } finally { setCreando(false) }
  }

  // ── Paso 1: subir archivo ──
  if (!preview) {
    return (
      <div className="space-y-4">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ChevronLeft className="w-4 h-4" /> Volver</button>
        <label className="block bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer py-16 text-center">
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = '' }} />
          {subiendo ? (
            <div className="flex flex-col items-center gap-3 text-slate-400"><Loader2 className="w-8 h-8 animate-spin" /><p className="text-sm">Leyendo y analizando el Excel…</p></div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center"><Upload className="w-7 h-7 text-blue-500" /></div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Sube tu presupuesto en Excel</p>
                <p className="text-xs text-slate-400 mt-1">Tu archivo de siempre (propio o exportado de S10). Lo analizamos y tú revisas antes de importar.</p>
              </div>
            </div>
          )}
        </label>
        {error && <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>}
      </div>
    )
  }

  const r = preview.resumen
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => setPreview(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ChevronLeft className="w-4 h-4" /> Otro archivo</button>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{r.titulos} títulos · {r.partidas} partidas</span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">{r.match_codigo} por código</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">{r.match_texto} por texto</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{r.nuevas} nuevas</span>
        </div>
      </div>

      {preview.advertencias.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
          {preview.advertencias.map((a, i) => <p key={i} className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 shrink-0" /> {a}</p>)}
        </div>
      )}

      {/* Metadatos del presupuesto */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre del presupuesto <span className="text-red-400">*</span></label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPresupuesto)} className={inputCls}>
            {(['meta', 'venta', 'linea_base'] as TipoPresupuesto[]).map((t) => <option key={t} value={t}>{TIPO_PRESUP_META[t].label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['GG', gg, setGg], ['Ut', ut, setUt], ['IGV', igv, setIgv]].map(([lbl, val, set]: any) => (
            <div key={lbl}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{lbl} %</label>
              <input type="number" value={val} onChange={(e) => set(e.target.value)} className={inputCls + ' px-2 tabular-nums'} />
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de revisión */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[52vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-4 py-2.5 font-semibold">Excel: descripción</th>
                <th className="px-3 py-2.5 font-semibold text-right">Met.</th>
                <th className="px-3 py-2.5 font-semibold text-right">P.U.</th>
                <th className="px-3 py-2.5 font-semibold">Coincidencia</th>
                <th className="px-3 py-2.5 font-semibold">¿Qué hacer?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {preview.filas.map((f, i) => f.esTitulo ? (
                <tr key={i} className="bg-slate-50/60">
                  <td colSpan={5} className="px-4 py-2">
                    <span className="font-mono text-[11px] text-slate-400 mr-2">{f.codigo}</span>
                    <span className="font-bold text-slate-700 uppercase text-[13px] tracking-wide">{f.descripcion}</span>
                  </td>
                </tr>
              ) : (
                <tr key={i} className="hover:bg-slate-50/40">
                  <td className="px-4 py-2">
                    <span className="font-mono text-[11px] text-slate-400 mr-1.5">{f.codigo}</span>
                    <span className="text-slate-700">{f.descripcion}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{f.metrado != null ? num(f.metrado) : '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{f.precioUnitario != null ? num(f.precioUnitario) : '—'}</td>
                  <td className="px-3 py-2">
                    {f.match?.tipo === 'codigo' ? <Badge cls="bg-emerald-50 text-emerald-700 border-emerald-200" txt="Código ✓" />
                      : f.match?.tipo === 'texto' ? <Badge cls="bg-amber-50 text-amber-700 border-amber-200" txt={`Sugerido ${Math.round(f.match.confianza * 100)}%`} />
                      : <Badge cls="bg-slate-100 text-slate-500 border-slate-200" txt="Sin match" />}
                  </td>
                  <td className="px-3 py-2">
                    <select value={decisiones[i] ?? 'nueva'} onChange={(e) => setDecisiones((d) => ({ ...d, [i]: e.target.value }))}
                      className="w-full max-w-72 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 bg-white outline-none focus:border-blue-400">
                      <optgroup label="Usar partida del catálogo">
                        {partidas.map((p) => <option key={p.id} value={`match:${p.id}`}>{p.codigo} · {p.descripcion.slice(0, 45)}</option>)}
                      </optgroup>
                      <option value="nueva">➕ Crear como partida nueva</option>
                      <option value="solo">Solo en este presupuesto</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <button onClick={onCancel} className="border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
        <button onClick={confirmar} disabled={creando || !nombre.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
          {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Importar {r.partidas} partidas
        </button>
      </div>
      <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><FileSpreadsheet className="w-3 h-3" /> Se creará un presupuesto NUEVO — nada se sobrescribe. Los precios se toman tal cual del Excel.</p>
    </div>
  )
}

function Badge({ cls, txt }: { cls: string; txt: string }) {
  return <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap ${cls}`}>{txt}</span>
}
