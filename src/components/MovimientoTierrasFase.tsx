import { useEffect, useRef, useState } from 'react'
import { Truck, Plus, Trash2, Loader2, Mountain, Layers3, Recycle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import { estadoEtapaInfo } from '../lib/registros-fase'

interface Sotano { id: string; nombre: string; volumenProyectado: number; volumenExcavado: number }
interface MovDatos { botadero?: string; capacidadVolquete?: number; esponjamiento?: number; viajesRealizados?: number; sotanos?: Sotano[] }

const uid = () => Math.random().toString(36).slice(2, 10)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const fmt = (n: number) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })
const inputSm = 'w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export default function MovimientoTierrasFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'movimiento_tierras'

  const [datos, setDatos] = useState<MovDatos>({})
  const [loading, setLoading] = useState(true)
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const v = (d?.datos ?? {}) as MovDatos; lastSaved.current = JSON.stringify(v); setDatos(v) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:tierras-updated', onUpd)
    return () => window.removeEventListener('c4:tierras-updated', onUpd)
  }, [proyectoId])

  function persistir(next: MovDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }
  const setCampo = (k: keyof MovDatos, v: any) => persistir({ ...datos, [k]: v })

  const sotanos = datos.sotanos ?? []
  const setSotano = (id: string, patch: Partial<Sotano>) =>
    persistir({ ...datos, sotanos: sotanos.map((s) => s.id === id ? { ...s, ...patch } : s) })
  const addSotano = () =>
    persistir({ ...datos, sotanos: [...sotanos, { id: uid(), nombre: `Sótano ${sotanos.length + 1}`, volumenProyectado: 0, volumenExcavado: 0 }] })
  const delSotano = (id: string) => persistir({ ...datos, sotanos: sotanos.filter((s) => s.id !== id) })

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando movimiento de tierras...</span>
    </div>
  )

  const cap = num(datos.capacidadVolquete) || 15
  const espon = num(datos.esponjamiento) || 1.25
  const totProy = sotanos.reduce((s, x) => s + num(x.volumenProyectado), 0)
  const totExc = sotanos.reduce((s, x) => s + num(x.volumenExcavado), 0)
  const pct = totProy > 0 ? Math.min(100, Math.round((totExc / totProy) * 100)) : 0
  const viajesEst = cap > 0 ? Math.round((totExc * espon) / cap) : 0
  const viajesReal = datos.viajesRealizados != null && datos.viajesRealizados !== ('' as any) ? num(datos.viajesRealizados) : null
  const est = estadoEtapaInfo(pct)

  return (
    <div className="space-y-5">
      {/* Highlights */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Mountain className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Volumen excavado</p></div>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{fmt(totExc)} <span className="text-sm text-slate-400">/ {fmt(totProy)} m³</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Viajes volquete</p></div>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{viajesReal ?? viajesEst} <span className="text-sm text-slate-400">/ {viajesEst} est.</span></p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Recycle className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">% eliminado</p></div>
          <p className={`text-2xl font-black tabular-nums leading-none ${pct >= 66 ? 'text-emerald-600' : pct >= 33 ? 'text-blue-600' : 'text-amber-600'}`}>{pct}%</p>
        </div>
      </div>

      {/* Barra global */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Avance de eliminación</p>
          <span className="text-sm font-bold text-slate-700">{fmt(totExc)} / {fmt(totProy)} m³</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${est.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Config */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">Botadero / relleno</label>
          <input className={inputSm} value={datos.botadero ?? ''} onChange={(e) => setCampo('botadero', e.target.value)} placeholder="EO-RS autorizada (MINAM)" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Capacidad volquete (m³)</label>
          <input type="number" className={inputSm} value={datos.capacidadVolquete ?? ''} onChange={(e) => setCampo('capacidadVolquete', e.target.value)} placeholder="15" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Esponjamiento</label>
          <input type="number" step="0.05" className={inputSm} value={datos.esponjamiento ?? ''} onChange={(e) => setCampo('esponjamiento', e.target.value)} placeholder="1.25" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Viajes realizados</label>
          <input type="number" className={inputSm} value={datos.viajesRealizados ?? ''} onChange={(e) => setCampo('viajesRealizados', e.target.value)} placeholder={`${viajesEst} (auto)`} />
        </div>
      </div>

      {/* Sótanos / frentes */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-slate-400" />
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Volumen por sótano / frente</h2>
          </div>
          <button onClick={addSotano} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
            <Plus className="w-3 h-3" /> Agregar
          </button>
        </div>

        {sotanos.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-slate-500">Sin frentes. Agrega los sótanos a excavar.</p>
            <p className="text-xs text-slate-400 mt-1">Tip: pídele a la IA que estime el volumen desde la cabida.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {sotanos.map((s) => {
              const sp = num(s.volumenProyectado), se = num(s.volumenExcavado)
              const p = sp > 0 ? Math.min(100, Math.round((se / sp) * 100)) : 0
              const e2 = estadoEtapaInfo(p)
              return (
                <div key={s.id} className="px-5 py-3 flex items-center gap-3 group">
                  <input
                    className="text-sm font-medium text-slate-800 border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-lg px-2 py-1 outline-none w-40 shrink-0 transition-colors"
                    value={s.nombre} onChange={(e) => setSotano(s.id, { nombre: e.target.value })}
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input type="number" className={`${inputSm} w-24`} value={s.volumenProyectado || ''} onChange={(e) => setSotano(s.id, { volumenProyectado: num(e.target.value) })} placeholder="proy. m³" />
                    <span className="text-slate-300">/</span>
                    <input type="number" className={`${inputSm} w-24`} value={s.volumenExcavado || ''} onChange={(e) => setSotano(s.id, { volumenExcavado: num(e.target.value) })} placeholder="exc. m³" />
                  </div>
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-12">
                    <div className={`h-full rounded-full transition-all ${e2.bar}`} style={{ width: `${p}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-600 tabular-nums w-9 text-right">{p}%</span>
                  <button onClick={() => delSotano(s.id)} className="text-slate-300 hover:text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
