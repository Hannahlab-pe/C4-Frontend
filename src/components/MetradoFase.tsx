import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, Loader2, ClipboardList, Calculator, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

interface Partida {
  id: string
  descripcion: string
  unidad: string
  metrado: number
  precioUnitario: number
}

const uid = () => Math.random().toString(36).slice(2, 10)
const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const UNIDADES = ['m3', 'm2', 'ml', 'und', 'glb', 'viaje', 'kg', 'ton']

function soles(n: number) {
  return `S/ ${Math.round(n).toLocaleString('es-PE')}`
}

const cell = 'w-full text-sm border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100'
const cellNum = `${cell} text-right tabular-nums`

export default function MetradoFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'excavacion__metrado'

  const [partidas, setPartidas] = useState<Partida[]>([])
  const [loading, setLoading] = useState(true)
  const [autogen, setAutogen] = useState(false)
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cargar = (showLoader = true) => {
    if (showLoader) setLoading(true)
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const a = Array.isArray(d?.datos?.partidas) ? d.datos.partidas : []
        lastSaved.current = JSON.stringify(a); setPartidas(a)
        if (d?.datos?._autogen) setAutogen(true)
      })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => {
    cargar()
    const onUpd = () => cargar(false)
    window.addEventListener('c4:metrado-updated', onUpd)
    return () => window.removeEventListener('c4:metrado-updated', onUpd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId])

  function persistir(next: Partida[]) {
    setPartidas(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { partidas: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 500)
  }
  const upd = (id: string, patch: Partial<Partida>) => persistir(partidas.map((p) => p.id === id ? { ...p, ...patch } : p))
  const agregar = () => persistir([...partidas, { id: uid(), descripcion: '', unidad: 'm3', metrado: 0, precioUnitario: 0 }])
  const eliminar = (id: string) => persistir(partidas.filter((p) => p.id !== id))

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando metrado...</span>
    </div>
  )

  const total = partidas.reduce((s, p) => s + num(p.metrado) * num(p.precioUnitario), 0)

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Calculator className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Costo total excavación</p></div>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{soles(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Partidas</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{partidas.length}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Metrado y presupuesto de excavación</p>
          <p className="text-xs text-slate-400 mt-0.5">Partidas × precio unitario. Pídele a la IA que lo arme desde el volumen y las calzaduras, y ajusta los precios.</p>
        </div>
        <button onClick={agregar} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Partida
        </button>
      </div>

      {autogen && (
        <p className="text-[11px] text-blue-600 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Pre-llenado por la IA desde el volumen y las calzaduras. Los precios son referenciales de mercado (Lima) — ajústalos.</p>
      )}

      {partidas.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <ClipboardList className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no hay metrado</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Dile a la IA "arma el metrado de excavación" y lo pre-llena desde el volumen (excavación masiva, eliminación) y las calzaduras, con precios referenciales que puedes ajustar.
          </p>
          <button onClick={agregar} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar partida
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-2.5">Partida</th>
                  <th className="text-center font-medium px-2 py-2.5 w-20">Und</th>
                  <th className="text-right font-medium px-2 py-2.5 w-28">Metrado</th>
                  <th className="text-right font-medium px-2 py-2.5 w-28">P.U. (S/)</th>
                  <th className="text-right font-medium px-3 py-2.5 w-32">Parcial (S/)</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {partidas.map((p) => {
                  const parcial = num(p.metrado) * num(p.precioUnitario)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-1.5">
                        <input className={cell} value={p.descripcion} onChange={(e) => upd(p.id, { descripcion: e.target.value })} placeholder="Descripción de la partida" />
                      </td>
                      <td className="px-1 py-1.5">
                        <select className={`${cell} text-center`} value={p.unidad} onChange={(e) => upd(p.id, { unidad: e.target.value })}>
                          {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" className={cellNum} value={p.metrado || ''} onChange={(e) => upd(p.id, { metrado: num(e.target.value) })} placeholder="0" />
                      </td>
                      <td className="px-1 py-1.5">
                        <input type="number" className={cellNum} value={p.precioUnitario || ''} onChange={(e) => upd(p.id, { precioUnitario: num(e.target.value) })} placeholder="0" />
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-slate-800 tabular-nums">{soles(parcial)}</td>
                      <td className="px-1 py-1.5 text-center">
                        <button onClick={() => eliminar(p.id)} title="Eliminar" className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-600 uppercase tracking-wide">Total excavación</td>
                  <td className="px-3 py-3 text-right text-base font-black text-slate-900 tabular-nums">{soles(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Los precios unitarios son referenciales del mercado limeño e incluyen mano de obra, equipo y materiales según la partida. Ajústalos con tus valores reales o tu análisis de precios unitarios (APU).
      </p>
    </div>
  )
}
