import { useEffect, useRef, useState } from 'react'
import {
  Users, Plus, Trash2, Loader2, X, ImagePlus, CheckCircle2, Circle,
  FileSignature, AlertTriangle, ShieldAlert, MapPin, Pencil,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import AppDialog from './AppDialog'

interface Foto { id: string; nombre: string; dataUrl: string; fecha: string }
interface Reclamo { id: string; fecha: string; descripcion: string; estado: 'abierto' | 'cerrado' }
interface Colindante {
  id: string; nombre: string; ubicacion: string
  estadoPrevio: 'sin_revisar' | 'sin_observaciones' | 'con_observaciones'
  observaciones: string; actaFirmada: boolean
  fotosAntes: Foto[]; fotosDespues: Foto[]; reclamos: Reclamo[]
}

const uid = () => Math.random().toString(36).slice(2, 10)
const hoy = () => new Date().toISOString().slice(0, 10)
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

const ESTADO = {
  sin_revisar:      { txt: 'Sin revisar',             cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  sin_observaciones:{ txt: 'Sin observaciones',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  con_observaciones:{ txt: 'Con observaciones previas',cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export default function ColindantesFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'colindantes' // a nivel proyecto (compartido entre fases)

  const [lista, setLista] = useState<Colindante[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Partial<Colindante> | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [reclamoDe, setReclamoDe] = useState<string | null>(null)
  const [nuevoReclamo, setNuevoReclamo] = useState('')
  const lastSaved = useRef('[]')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<{ id: string; tipo: 'antes' | 'despues' } | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)

  const cargar = () => {
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const arr = Array.isArray(d?.datos?.colindantes) ? d.datos.colindantes : []
        lastSaved.current = JSON.stringify(arr)
        setLista(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [proyectoId])

  useEffect(() => {
    const onUpd = () => cargar()
    window.addEventListener('c4:colindantes-updated', onUpd)
    return () => window.removeEventListener('c4:colindantes-updated', onUpd)
  }, [proyectoId])

  function persistir(next: Colindante[]) {
    setLista(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: { colindantes: next } }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 600)
  }
  const upd = (id: string, patch: Partial<Colindante>) =>
    persistir(lista.map((c) => c.id === id ? { ...c, ...patch } : c))

  // ── Colindante CRUD ──
  function guardarColindante() {
    if (!modal?.nombre?.trim()) return
    if (modal.id) {
      upd(modal.id, { nombre: modal.nombre.trim(), ubicacion: modal.ubicacion ?? '', estadoPrevio: modal.estadoPrevio ?? 'sin_revisar', observaciones: modal.observaciones ?? '' })
    } else {
      persistir([...lista, {
        id: uid(), nombre: modal.nombre.trim(), ubicacion: modal.ubicacion ?? '',
        estadoPrevio: (modal.estadoPrevio as Colindante['estadoPrevio']) ?? 'sin_revisar',
        observaciones: modal.observaciones ?? '', actaFirmada: false,
        fotosAntes: [], fotosDespues: [], reclamos: [],
      }])
    }
    setModal(null)
  }
  const eliminarColindante = (id: string) => persistir(lista.filter((c) => c.id !== id))

  // ── Fotos ──
  function pedirFoto(id: string, tipo: 'antes' | 'despues') {
    targetRef.current = { id, tipo }
    fileRef.current?.click()
  }
  async function onArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const tgt = targetRef.current
    e.target.value = ''
    if (!files.length || !tgt) return
    setSubiendo(tgt.id)
    try {
      const nuevas: Foto[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(file)
        })
        nuevas.push({ id: uid(), nombre: file.name, dataUrl, fecha: new Date().toISOString() })
      }
      const c = lista.find((x) => x.id === tgt.id)
      if (c) {
        const key = tgt.tipo === 'antes' ? 'fotosAntes' : 'fotosDespues'
        upd(tgt.id, { [key]: [...(c[key] ?? []), ...nuevas] } as Partial<Colindante>)
      }
    } finally { setSubiendo(null); targetRef.current = null }
  }
  function eliminarFoto(id: string, tipo: 'antes' | 'despues', fid: string) {
    const c = lista.find((x) => x.id === id); if (!c) return
    const key = tipo === 'antes' ? 'fotosAntes' : 'fotosDespues'
    upd(id, { [key]: (c[key] ?? []).filter((f) => f.id !== fid) } as Partial<Colindante>)
  }

  // ── Reclamos ──
  function addReclamo(id: string) {
    if (!nuevoReclamo.trim()) return
    const c = lista.find((x) => x.id === id); if (!c) return
    upd(id, { reclamos: [...(c.reclamos ?? []), { id: uid(), fecha: hoy(), descripcion: nuevoReclamo.trim(), estado: 'abierto' }] })
    setNuevoReclamo(''); setReclamoDe(null)
  }
  function toggleReclamo(id: string, rid: string) {
    const c = lista.find((x) => x.id === id); if (!c) return
    upd(id, { reclamos: c.reclamos.map((r) => r.id === rid ? { ...r, estado: r.estado === 'abierto' ? 'cerrado' : 'abierto' } : r) })
  }
  function delReclamo(id: string, rid: string) {
    const c = lista.find((x) => x.id === id); if (!c) return
    upd(id, { reclamos: c.reclamos.filter((r) => r.id !== rid) })
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando colindantes...</span>
    </div>
  )

  const conActa = lista.filter((c) => c.actaFirmada).length
  const reclamosAbiertos = lista.reduce((s, c) => s + c.reclamos.filter((r) => r.estado === 'abierto').length, 0)

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onArchivos} />

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Colindantes</p>
          <p className="text-2xl font-black tabular-nums leading-none text-slate-900">{lista.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Con acta firmada</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${conActa === lista.length && lista.length ? 'text-emerald-600' : 'text-amber-600'}`}>{conActa}/{lista.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">Reclamos abiertos</p>
          <p className={`text-2xl font-black tabular-nums leading-none ${reclamosAbiertos > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{reclamosAbiertos}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">Predios colindantes</p>
          <p className="text-xs text-slate-400 mt-0.5">Constata el estado ANTES de demoler (fotos + acta) para evitar reclamos por daños.</p>
        </div>
        <button onClick={() => setModal({ estadoPrevio: 'sin_revisar' })} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
          <Plus className="w-3.5 h-3.5" /> Colindante
        </button>
      </div>

      {lista.length === 0 ? (
        <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
          <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aún no registraste colindantes</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Pídele al <b>Asistente C4</b> que los registre (cuéntale qué vecinos tienes), o agrégalos tú.
            Sube fotos del estado <b>antes</b> y marca el acta de constatación.
          </p>
          <button onClick={() => setModal({ estadoPrevio: 'sin_revisar' })} className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar colindante
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map((c) => {
            const est = ESTADO[c.estadoPrevio]
            const abiertos = c.reclamos.filter((r) => r.estado === 'abierto').length
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-800">{c.nombre}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${est.cls}`}>{est.txt}</span>
                    </div>
                    {c.ubicacion && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" /> {c.ubicacion}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => upd(c.id, { actaFirmada: !c.actaFirmada })}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${c.actaFirmada ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                      <FileSignature className="w-3.5 h-3.5" /> {c.actaFirmada ? 'Acta firmada' : 'Acta pendiente'}
                    </button>
                    <button onClick={() => setModal(c)} title="Editar" className="text-slate-300 hover:text-slate-600 p-1"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => eliminarColindante(c.id)} title="Eliminar" className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Galerías antes / después */}
                <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                  {(['antes', 'despues'] as const).map((tipo) => {
                    const fotos = tipo === 'antes' ? c.fotosAntes : c.fotosDespues
                    return (
                      <div key={tipo} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                            {tipo === 'antes' ? 'Estado ANTES' : 'Estado DESPUÉS'}
                          </p>
                          <button onClick={() => pedirFoto(c.id, tipo)} disabled={subiendo === c.id} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium transition-colors disabled:opacity-50">
                            {subiendo === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />} Subir
                          </button>
                        </div>
                        {(fotos ?? []).length === 0 ? (
                          <button onClick={() => pedirFoto(c.id, tipo)} className="w-full flex flex-col items-center justify-center gap-1 py-6 text-slate-300 hover:text-slate-400 hover:bg-slate-50/60 rounded-xl border border-dashed border-slate-200 transition-colors">
                            <ImagePlus className="w-5 h-5" /><span className="text-[10px]">Sin fotos</span>
                          </button>
                        ) : (
                          <div className="grid grid-cols-3 gap-1.5">
                            {fotos.map((f) => (
                              <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                <img src={f.dataUrl} alt={f.nombre} onClick={() => setLightbox(f.dataUrl)} className="w-full h-full object-cover cursor-zoom-in" />
                                <button onClick={() => eliminarFoto(c.id, tipo, f.id)} className="absolute top-1 right-1 w-5 h-5 rounded bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Observaciones */}
                {c.observaciones && (
                  <div className="px-5 py-2.5 border-t border-slate-100 flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600">{c.observaciones}</p>
                  </div>
                )}

                {/* Reclamos */}
                <div className="px-5 py-3 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Reclamos {abiertos > 0 && <span className="text-red-500">({abiertos} abiertos)</span>}
                    </p>
                    <button onClick={() => { setReclamoDe(c.id); setNuevoReclamo('') }} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium transition-colors">
                      <Plus className="w-3 h-3" /> Registrar
                    </button>
                  </div>
                  {reclamoDe === c.id && (
                    <div className="flex items-center gap-2 mb-2">
                      <input autoFocus value={nuevoReclamo} onChange={(e) => setNuevoReclamo(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') addReclamo(c.id); if (e.key === 'Escape') setReclamoDe(null) }}
                        placeholder="Ej: Reclamo por fisura en muro tras voladura"
                        className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                      <button onClick={() => addReclamo(c.id)} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-colors">Guardar</button>
                      <button onClick={() => setReclamoDe(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  {c.reclamos.length === 0 ? (
                    <p className="text-[11px] text-slate-300">Sin reclamos.</p>
                  ) : (
                    <div className="space-y-1">
                      {c.reclamos.map((r) => (
                        <div key={r.id} className="flex items-center gap-2 group">
                          <button onClick={() => toggleReclamo(c.id, r.id)} className="shrink-0">
                            {r.estado === 'cerrado' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-red-400" />}
                          </button>
                          <span className={`text-xs flex-1 ${r.estado === 'cerrado' ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{r.descripcion}</span>
                          <span className="text-[10px] text-slate-400">{r.fecha}</span>
                          <button onClick={() => delReclamo(c.id, r.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal agregar/editar colindante */}
      <AppDialog open={modal !== null} onClose={() => setModal(null)} title={modal?.id ? 'Editar colindante' : 'Nuevo colindante'}>
        {modal && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / referencia</label>
              <input className={inputCls} autoFocus value={modal.nombre ?? ''} onChange={(e) => setModal({ ...modal, nombre: e.target.value })} placeholder="Ej: Vecino izquierda — Sr. Pérez" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ubicación / dirección</label>
              <input className={inputCls} value={modal.ubicacion ?? ''} onChange={(e) => setModal({ ...modal, ubicacion: e.target.value })} placeholder="Ej: Jr. Unión 123 (lado izquierdo)" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Estado previo del predio</label>
              <select className={inputCls} value={modal.estadoPrevio ?? 'sin_revisar'} onChange={(e) => setModal({ ...modal, estadoPrevio: e.target.value as Colindante['estadoPrevio'] })}>
                <option value="sin_revisar">Sin revisar</option>
                <option value="sin_observaciones">Sin observaciones</option>
                <option value="con_observaciones">Con observaciones previas (fisuras, etc.)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
              <textarea className={inputCls} rows={2} value={modal.observaciones ?? ''} onChange={(e) => setModal({ ...modal, observaciones: e.target.value })} placeholder="Rajaduras previas, estructuras sensibles, acuerdos con el vecino..." />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardarColindante} disabled={!modal.nombre?.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {modal.id ? 'Guardar' : 'Agregar'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out">
          <button className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"><X className="w-5 h-5" /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
