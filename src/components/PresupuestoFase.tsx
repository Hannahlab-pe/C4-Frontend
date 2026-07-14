import { useEffect, useRef, useState } from 'react'
import { Trash2, Loader2, ClipboardList, Calculator, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

// Muestra las PARTIDAS del presupuesto cargado en esta fase (registros-fase con origen 'presupuesto').
// Tabla editable metrado × PU → parcial, con total (costo directo de la fase). Independiente de las etapas.

interface Reg {
  id: string
  nombre: string
  estado?: string
  datos?: {
    unidad?: string
    cantidad?: number
    precioUnitario?: number
    costoPresupuestado?: number
    origen?: string
    [k: string]: any
  }
}

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const soles = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`
const UNIDADES = ['m3', 'm2', 'ml', 'und', 'glb', 'viaje', 'kg', 'ton', 'día']
const cell = 'w-full text-sm border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-100'
const cellNum = `${cell} text-right tabular-nums`

export default function PresupuestoFase({ proyectoId, fase }: { proyectoId: string; fase: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const [regs, setRegs] = useState<Reg[]>([])
  const [loading, setLoading] = useState(true)
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const cargar = (showLoader = true) => {
    if (showLoader) setLoading(true)
    fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, { headers, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const arr: Reg[] = Array.isArray(d) ? d : []
        setRegs(arr.filter((r) => r.datos?.origen === 'presupuesto' || (r.datos?.cantidad != null && r.datos?.precioUnitario != null)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }
  useEffect(() => {
    cargar()
    const onUpd = () => cargar(false)
    window.addEventListener('c4:etapas-updated', onUpd)
    window.addEventListener('c4:cronograma-updated', onUpd)
    return () => {
      window.removeEventListener('c4:etapas-updated', onUpd)
      window.removeEventListener('c4:cronograma-updated', onUpd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId, fase])

  // Edición inline. PATCH de registros-fase REEMPLAZA datos → hay que mezclar. Debounce por registro.
  const patchDebounced = (id: string, body: Record<string, any>) => {
    setGuardado('saving')
    if (timers.current[id]) clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => {
      fetch(`${API_BASE}/registros-fase/${id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
        .then((r) => { if (!r.ok) throw new Error(); setGuardado('saved') })
        .catch(() => setGuardado('error'))
    }, 500)
  }
  const updDatos = (reg: Reg, patch: Record<string, any>) => {
    const datos = { ...(reg.datos ?? {}), ...patch }
    setRegs((rs) => rs.map((r) => r.id === reg.id ? { ...r, datos } : r))
    patchDebounced(reg.id, { datos })
  }
  const updNombre = (reg: Reg, nombre: string) => {
    setRegs((rs) => rs.map((r) => r.id === reg.id ? { ...r, nombre } : r))
    patchDebounced(reg.id, { nombre })
  }
  const eliminar = (reg: Reg) => {
    setRegs((rs) => rs.filter((r) => r.id !== reg.id))
    fetch(`${API_BASE}/registros-fase/${reg.id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando presupuesto...</span>
    </div>
  )

  const total = regs.reduce((s, r) => s + num(r.datos?.cantidad) * num(r.datos?.precioUnitario), 0)

  if (regs.length === 0) return (
    <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
      <ClipboardList className="w-8 h-8 text-blue-400 mx-auto mb-2" />
      <p className="text-sm font-semibold text-slate-700">Aún no hay partidas del presupuesto</p>
      <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
        Súbele al chat tu presupuesto en Excel y dile <span className="font-medium text-slate-600">"carga las partidas y arma el cronograma"</span>. Las partidas de esta fase aparecen aquí con su metrado y precio, y quedan ligadas al Gantt.
      </p>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5"><Calculator className="w-3.5 h-3.5 text-slate-400" /><p className="text-[11px] text-slate-400 uppercase tracking-wider">Costo directo de la fase</p></div>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{soles(total)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Partidas</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{regs.length}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700">Partidas del presupuesto</p>
        <p className="text-xs text-slate-400 mt-0.5">Cargadas del Excel por la IA. Metrado × precio unitario = parcial. Ajusta los precios con tu APU si hace falta; el total es el costo directo (sin GG, utilidad ni IGV).</p>
      </div>

      <p className="text-[11px] text-blue-600 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Estas partidas alimentan el Cronograma de obra: cada una lleva su costo y su avance.</p>

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
              {regs.map((r) => {
                const parcial = num(r.datos?.cantidad) * num(r.datos?.precioUnitario)
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-1.5">
                      <input className={cell} value={r.nombre} onChange={(e) => updNombre(r, e.target.value)} placeholder="Descripción de la partida" />
                    </td>
                    <td className="px-1 py-1.5">
                      <select className={`${cell} text-center`} value={r.datos?.unidad ?? 'und'} onChange={(e) => updDatos(r, { unidad: e.target.value })}>
                        {[...new Set([r.datos?.unidad ?? 'und', ...UNIDADES])].filter(Boolean).map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" className={cellNum} value={r.datos?.cantidad ?? ''} onChange={(e) => updDatos(r, { cantidad: num(e.target.value) })} placeholder="0" />
                    </td>
                    <td className="px-1 py-1.5">
                      <input type="number" className={cellNum} value={r.datos?.precioUnitario ?? ''} onChange={(e) => updDatos(r, { precioUnitario: num(e.target.value) })} placeholder="0" />
                    </td>
                    <td className="px-3 py-1.5 text-right font-semibold text-slate-800 tabular-nums">{soles(parcial)}</td>
                    <td className="px-1 py-1.5 text-center">
                      <button onClick={() => eliminar(r)} title="Eliminar" className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-slate-600 uppercase tracking-wide">Costo directo · {fase}</td>
                <td className="px-3 py-3 text-right text-base font-black text-slate-900 tabular-nums">{soles(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        El costo directo es la suma de las partidas. El precio de venta al cliente añade Gastos Generales, Utilidad e IGV por encima de este monto.
      </p>
    </div>
  )
}
