import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Truck, Package, Plus, Trash2, Loader2, X, ImagePlus,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

interface Recepcion { id: string; fecha: string; hora?: string; material: string; cantidad?: number; unidad?: string; proveedor?: string; guia?: string; foto?: string }
interface Camion { id: string; fecha: string; hora?: string; tipo: 'ingreso' | 'salida'; placa?: string; motivo: string; viajes?: number; empresa?: string; foto?: string }
interface LogisticaDatos { recepciones?: Recepcion[]; camiones?: Camion[]; desmonteMetaViajes?: number; desmonteMetaM3?: number }

const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)
const horaAhora = () => new Date().toTimeString().slice(0, 5)

const MOTIVO_LABEL: Record<string, string> = {
  material: 'Trae material', desmonte: 'Saca desmonte', concreto: 'Concreto', equipo: 'Equipo', otro: 'Otro',
}

export default function LogisticaPage() {
  const { id: proyectoId } = useParams()
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [datos, setDatos] = useState<LogisticaDatos>({})
  const [loading, setLoading] = useState(true)
  const [formRec, setFormRec] = useState<Partial<Recepcion> | null>(null)
  const [formCam, setFormCam] = useState<Partial<Camion> | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSave = useRef(false)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/logistica`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const v = (d?.datos ?? {}) as LogisticaDatos; lastSaved.current = JSON.stringify(v); setDatos(v) })
      .catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])
  useEffect(() => {
    const onPoll = () => { if (!pendingSave.current) cargar() }
    window.addEventListener('c4:proyecto-updated', onPoll)
    return () => window.removeEventListener('c4:proyecto-updated', onPoll)
  }, [proyectoId])

  function persistir(next: LogisticaDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    pendingSave.current = true
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/logistica`, { method: 'PUT', headers, body: JSON.stringify({ datos: next }) })
        .then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') })
        .catch(() => setGuardado('error')).finally(() => { pendingSave.current = false })
    }, 600)
  }

  const recepciones = datos.recepciones ?? []
  const camiones = datos.camiones ?? []
  const recHoy = recepciones.filter((r) => r.fecha === hoy()).length
  const camHoy = camiones.filter((c) => c.fecha === hoy()).length
  const viajesDesmonte = camiones.filter((c) => c.motivo === 'desmonte' && c.tipo === 'salida').reduce((a, c) => a + (Number(c.viajes) || 1), 0)
  const metaViajes = Number(datos.desmonteMetaViajes) || 0

  async function leerFoto(file: File): Promise<string> {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file) })
  }

  // ── Recepciones ──
  const guardarRec = () => {
    if (!formRec?.material?.trim()) return
    const nueva: Recepcion = { id: uid(), fecha: hoy(), hora: horaAhora(), material: formRec.material.trim(), cantidad: formRec.cantidad, unidad: formRec.unidad, proveedor: formRec.proveedor, guia: formRec.guia, foto: formRec.foto }
    persistir({ ...datos, recepciones: [nueva, ...recepciones] })
    setFormRec(null)
  }
  const delRec = (id: string) => persistir({ ...datos, recepciones: recepciones.filter((r) => r.id !== id) })

  // ── Camiones ──
  const guardarCam = () => {
    if (!formCam) return
    const nuevo: Camion = { id: uid(), fecha: hoy(), hora: horaAhora(), tipo: (formCam.tipo as any) || 'salida', placa: formCam.placa?.toUpperCase(), motivo: formCam.motivo || 'desmonte', viajes: formCam.viajes || 1, empresa: formCam.empresa, foto: formCam.foto }
    persistir({ ...datos, camiones: [nuevo, ...camiones] })
    setFormCam(null)
  }
  const delCam = (id: string) => persistir({ ...datos, camiones: camiones.filter((c) => c.id !== id) })

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando logística...</span>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      {/* Header azul noche (igual que el Cronograma) */}
      <div className="bg-linear-to-r from-slate-800 to-slate-700 px-4 md:px-6 py-4 md:py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Truck className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">Logística de obra</h2>
            <p className="text-xs text-slate-300 mt-0.5">Recepción de materiales y control de camiones. La IA registra desde una foto por Telegram.</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Recepciones hoy</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{recHoy}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{recepciones.length} en total</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Camiones hoy</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{camHoy}</p>
          <p className="text-[11px] text-slate-400 mt-1.5">{camiones.length} movimientos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Viajes de desmonte</p>
          <p className="text-2xl font-black tabular-nums leading-none text-amber-600">
            {viajesDesmonte}{metaViajes > 0 && <span className="text-base text-slate-400 font-bold"> / {metaViajes}</span>}
          </p>
          {metaViajes > 0 ? (
            <>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.round((viajesDesmonte / metaViajes) * 100))}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{Math.round((viajesDesmonte / metaViajes) * 100)}% del volumen previsto{datos.desmonteMetaM3 ? ` (${datos.desmonteMetaM3.toLocaleString('es-PE')} m³)` : ''}</p>
            </>
          ) : (
            <p className="text-[11px] text-slate-400 mt-1.5">volquetes que salieron</p>
          )}
        </div>
      </div>

      {/* Recepción de materiales */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recepción de materiales</h3>
          </div>
          <button onClick={() => setFormRec({ material: '' })} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
            <Plus className="w-3 h-3" /> Recepción
          </button>
        </div>

        {formRec && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 space-y-2">
            <input autoFocus value={formRec.material ?? ''} onChange={(e) => setFormRec({ ...formRec, material: e.target.value })}
              placeholder="Material (ej: Cemento Sol tipo I)" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input type="number" value={formRec.cantidad ?? ''} onChange={(e) => setFormRec({ ...formRec, cantidad: e.target.value ? Number(e.target.value) : undefined })} placeholder="Cantidad" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
              <input value={formRec.unidad ?? ''} onChange={(e) => setFormRec({ ...formRec, unidad: e.target.value })} placeholder="Unidad (bolsas)" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
              <input value={formRec.proveedor ?? ''} onChange={(e) => setFormRec({ ...formRec, proveedor: e.target.value })} placeholder="Proveedor" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
              <input value={formRec.guia ?? ''} onChange={(e) => setFormRec({ ...formRec, guia: e.target.value })} placeholder="N° guía" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-white">
                <ImagePlus className="w-3.5 h-3.5" /> {formRec.foto ? 'Foto lista' : 'Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFormRec({ ...formRec, foto: await leerFoto(f) }); e.target.value = '' }} />
              </label>
              {formRec.foto && <img src={formRec.foto} className="w-8 h-8 rounded object-cover" alt="" />}
              <button onClick={guardarRec} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors ml-auto">Guardar</button>
              <button onClick={() => setFormRec(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {recepciones.length === 0 && !formRec ? (
          <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin recepciones. Regístralas aquí o mándale una foto a la IA por Telegram.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {recepciones.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                {r.foto ? (
                  <img src={r.foto} onClick={() => setLightbox(r.foto!)} className="w-10 h-10 rounded-lg object-cover shrink-0 cursor-zoom-in" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Package className="w-4 h-4 text-slate-300" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">
                    {r.cantidad != null ? `${r.cantidad} ${r.unidad ?? ''} ` : ''}{r.material}
                  </p>
                  <p className="text-[11px] text-slate-400">{r.fecha}{r.hora ? ` ${r.hora}` : ''}{r.proveedor ? ` · ${r.proveedor}` : ''}{r.guia ? ` · Guía ${r.guia}` : ''}</p>
                </div>
                <button onClick={() => delRec(r.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Control de camiones */}
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Control de camiones</h3>
          </div>
          <button onClick={() => setFormCam({ tipo: 'salida', motivo: 'desmonte' })} className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors">
            <Plus className="w-3 h-3" /> Camión
          </button>
        </div>

        {formCam && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={formCam.tipo} onChange={(e) => setFormCam({ ...formCam, tipo: e.target.value as any })} className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400">
                <option value="salida">Salida</option>
                <option value="ingreso">Ingreso</option>
              </select>
              <select value={formCam.motivo} onChange={(e) => setFormCam({ ...formCam, motivo: e.target.value })} className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400">
                <option value="desmonte">Desmonte</option>
                <option value="material">Material</option>
                <option value="concreto">Concreto</option>
                <option value="equipo">Equipo</option>
                <option value="otro">Otro</option>
              </select>
              <input value={formCam.placa ?? ''} onChange={(e) => setFormCam({ ...formCam, placa: e.target.value })} placeholder="Placa" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400 uppercase" />
              <input value={formCam.empresa ?? ''} onChange={(e) => setFormCam({ ...formCam, empresa: e.target.value })} placeholder="Empresa" className="text-sm border border-slate-200 rounded-lg px-2 py-2 outline-none focus:border-blue-400" />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-white">
                <ImagePlus className="w-3.5 h-3.5" /> {formCam.foto ? 'Foto lista' : 'Foto'}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setFormCam({ ...formCam, foto: await leerFoto(f) }); e.target.value = '' }} />
              </label>
              {formCam.foto && <img src={formCam.foto} className="w-8 h-8 rounded object-cover" alt="" />}
              <button onClick={guardarCam} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors ml-auto">Guardar</button>
              <button onClick={() => setFormCam(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
          </div>
        )}

        {camiones.length === 0 && !formCam ? (
          <p className="text-xs text-slate-400 px-5 py-6 text-center">Sin movimientos de camiones. Regístralos aquí o por Telegram ("salió un volquete de desmonte placa ABC-123").</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {camiones.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                {c.foto ? (
                  <img src={c.foto} onClick={() => setLightbox(c.foto!)} className="w-10 h-10 rounded-lg object-cover shrink-0 cursor-zoom-in" alt="" />
                ) : (
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${c.tipo === 'salida' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    {c.tipo === 'salida' ? <ArrowUpFromLine className="w-4 h-4 text-amber-500" /> : <ArrowDownToLine className="w-4 h-4 text-emerald-500" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">
                    <span className={`text-[10px] font-bold uppercase mr-1.5 ${c.tipo === 'salida' ? 'text-amber-600' : 'text-emerald-600'}`}>{c.tipo}</span>
                    {c.placa || 'Camión'} <span className="text-slate-400">· {MOTIVO_LABEL[c.motivo] ?? c.motivo}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">{c.fecha}{c.hora ? ` ${c.hora}` : ''}{c.empresa ? ` · ${c.empresa}` : ''}{c.motivo === 'desmonte' && (c.viajes ?? 1) > 1 ? ` · ${c.viajes} viajes` : ''}</p>
                </div>
                <button onClick={() => delCam(c.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
      </div>
    </div>
  )
}
