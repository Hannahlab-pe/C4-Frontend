import { useEffect, useState } from 'react'
import { Plus, Loader2, FileText, Lock, ChevronRight, Building2, CalendarDays, FileUp } from 'lucide-react'
import api from '../../lib/api'
import AppDialog from '../AppDialog'
import PresupuestoTree from './PresupuestoTree'
import ImportarExcel from './ImportarExcel'
import {
  presupuestosApi, TIPO_PRESUP_META,
  type Presupuesto, type TipoPresupuesto,
} from '../../lib/presupuestos'

interface Proyecto { id: string; nombre: string; distrito?: string }

function fmtFecha(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '' }
}

export default function PresupuestosTab({ proyectoId: fixed }: { proyectoId?: string } = {}) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoIdSel, setProyectoIdSel] = useState('')
  const proyectoId = fixed ?? proyectoIdSel
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [loadingP, setLoadingP] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // form
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<TipoPresupuesto>('meta')
  const [gg, setGg] = useState('10')
  const [utilidad, setUtilidad] = useState('8')
  const [igv, setIgv] = useState('18')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (fixed) return // modo embebido en el proyecto: el proyecto ya es el contexto
    api.get<Proyecto[]>('/proyectos').then((r) => {
      setProyectos(r.data)
      if (r.data[0]) setProyectoIdSel(r.data[0].id)
    }).catch(() => {})
  }, [fixed])

  const cargarPresupuestos = (pid: string, autoAbrir = false) => {
    if (!pid) return
    setLoadingP(true)
    presupuestosApi.listar(pid).then((l) => {
      setPresupuestos(l)
      if (autoAbrir && fixed && l.length === 1) setAbierto(l[0].id) // en el proyecto: si hay 1 solo, entra directo
    }).catch(() => setPresupuestos([])).finally(() => setLoadingP(false))
  }
  useEffect(() => { setAbierto(null); if (proyectoId) cargarPresupuestos(proyectoId, true) }, [proyectoId])

  async function crear() {
    if (!nombre.trim() || !proyectoId) return
    setCreando(true)
    try {
      const nuevo = await presupuestosApi.crear({
        proyectoId, nombre: nombre.trim(), tipo,
        ggPorcentaje: String(Number(gg) / 100),
        utilidadPorcentaje: String(Number(utilidad) / 100),
        igvPorcentaje: String(Number(igv) / 100),
      })
      setShowModal(false); setNombre('')
      cargarPresupuestos(proyectoId)
      setAbierto(nuevo.id)
    } finally { setCreando(false) }
  }

  if (abierto) return <PresupuestoTree presupuestoId={abierto} onBack={() => { setAbierto(null); cargarPresupuestos(proyectoId) }} />
  if (importando) return <ImportarExcel proyectoId={proyectoId} onCancel={() => setImportando(false)} onDone={(id) => { setImportando(false); cargarPresupuestos(proyectoId); setAbierto(id) }} />

  return (
    <div className="space-y-4">
      {/* Selector de proyecto + nuevo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {fixed ? <div /> : (
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select value={proyectoId} onChange={(e) => setProyectoIdSel(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-white outline-none focus:border-blue-400 min-w-56">
              {proyectos.length === 0 && <option value="">Sin proyectos</option>}
              {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setImportando(true)} disabled={!proyectoId}
            className="flex items-center gap-2 border border-slate-200 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <FileUp className="w-4 h-4" /> Importar Excel
          </button>
          <button onClick={() => setShowModal(true)} disabled={!proyectoId}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Nuevo presupuesto
          </button>
        </div>
      </div>

      {/* Lista */}
      {loadingP ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-5 h-5 text-slate-400 animate-spin" /></div>
      ) : presupuestos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-16 gap-3 text-center">
          <FileText className="w-9 h-9 text-slate-200" />
          <p className="text-sm text-slate-400 max-w-sm">Este proyecto no tiene presupuestos. Crea uno tipo <b>Meta</b> y arma su árbol con títulos y partidas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presupuestos.map((p) => {
            const meta = TIPO_PRESUP_META[p.tipo]
            return (
              <button key={p.id} onClick={() => setAbierto(p.id)}
                className="group relative flex flex-col text-left bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${meta.badge}`}>{meta.label}</span>
                  {p.congelado && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                </div>
                <p className="text-base font-bold text-slate-900 leading-snug line-clamp-2">{p.nombre}</p>
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {fmtFecha(p.createdAt)}</span>
                  <span>GG {Math.round(Number(p.ggPorcentaje) * 100)}% · Ut {Math.round(Number(p.utilidadPorcentaje) * 100)}%</span>
                </div>
                <ChevronRight className="absolute bottom-5 right-5 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-slate-600 translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            )
          })}
        </div>
      )}

      {/* Modal nuevo presupuesto */}
      <AppDialog open={showModal} onClose={() => setShowModal(false)} title="Nuevo presupuesto">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nombre <span className="text-red-400">*</span></label>
            <input autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && crear()}
              placeholder="Presupuesto Meta — Casco estructural" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {(['meta', 'venta', 'linea_base'] as TipoPresupuesto[]).map((t) => (
                <button key={t} onClick={() => setTipo(t)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tipo === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {TIPO_PRESUP_META[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <PctField label="Gastos Grales" value={gg} onChange={setGg} />
            <PctField label="Utilidad" value={utilidad} onChange={setUtilidad} />
            <PctField label="IGV" value={igv} onChange={setIgv} />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={crear} disabled={creando || !nombre.trim()}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
            {creando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Crear y abrir
          </button>
        </div>
      </AppDialog>
    </div>
  )
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

function PctField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div className="flex items-center border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
        <input type="number" step="0.1" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full text-sm text-slate-700 outline-none bg-transparent tabular-nums" />
        <span className="text-slate-400 text-sm">%</span>
      </div>
    </div>
  )
}
