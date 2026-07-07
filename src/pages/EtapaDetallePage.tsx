import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, Loader2, Plus, Trash2,
  ImagePlus, X, ListChecks, StickyNote, Users, CheckCircle2, Sparkles, ScanEye, Lock,
  Wand2, Search, Ruler, Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'
import {
  ESQUEMAS_REGISTRO, FASES_CONFIG_MIN,
  agruparPorEtapa, avanceEtapa, estadoEtapaInfo, estadoRegistroClase,
} from '../lib/registros-fase'
import type { RegistroFase, EtapaFase } from '../lib/registros-fase'

interface Foto { id: string; nombre: string; dataUrl: string; fecha: string }
interface EtapaDatos { fotos?: Foto[]; notas?: string; asignados?: string; responsables?: string[]; analisisIA?: { texto: string; fecha: string } }
interface Miembro { id: string; usuarioId: string; nombre: string; email: string; rolObra: string; fase: string | null }
interface PartidaCat { codigo: string; partida: string; unidad: string; fase: string; especialidad: string; alcance?: string; control?: string }

const nf = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })

const uid = () => Math.random().toString(36).slice(2, 10)

const FASE_LABEL: Record<string, string> = {
  demolicion: 'Demolición', excavacion: 'Excavación', construccion: 'Construcción',
  acabados: 'Acabados', administracion: 'Administración',
}

export default function EtapaDetallePage() {
  const { id: proyectoId, fase, etapa: etapaKey } = useParams<{ id: string; fase: string; etapa: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const esquema = ESQUEMAS_REGISTRO[fase ?? '']
  const config = FASES_CONFIG_MIN[fase ?? '']
  const detalleKey = `${fase}__et__${etapaKey}`
  const etapasKey = `${fase}__etapas`

  const [etapasList, setEtapasList] = useState<EtapaFase[]>([])
  const idxEtapa = etapasList.findIndex((e) => e.key === etapaKey)
  const etapa = etapasList[idxEtapa]

  const [registros, setRegistros] = useState<RegistroFase[]>([])
  const [datos, setDatos] = useState<EtapaDatos>({})
  const [loading, setLoading] = useState(true)
  const [nuevaAct, setNuevaAct] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [analizando, setAnalizando] = useState(false)
  const [lightbox, setLightbox] = useState<Foto | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Metrado (actividad expandida) + biblioteca de partidas con IA
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modalPartidas, setModalPartidas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<PartidaCat[]>([])
  const [buscando, setBuscando] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [agregandoPartidas, setAgregandoPartidas] = useState(false)

  // Equipo del proyecto + permiso para asignar responsables
  const [equipo, setEquipo] = useState<Miembro[]>([])
  const [puedeAsignar, setPuedeAsignar] = useState(false)

  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>('{}')

  useEffect(() => {
    if (!proyectoId || !fase || !etapaKey) return
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, { headers })
        .then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${etapasKey}`, { headers })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([regs, det, etps]) => {
      setRegistros(Array.isArray(regs) ? regs : [])
      const d = (det?.datos ?? {}) as EtapaDatos
      lastSaved.current = JSON.stringify(d)
      setDatos(d)
      setEtapasList(Array.isArray(etps?.datos?.etapas) ? etps.datos.etapas : [])
    }).finally(() => setLoading(false))
  }, [proyectoId, fase, etapaKey])

  // Equipo del proyecto (para el selector de responsables) + mi rol
  useEffect(() => {
    if (!proyectoId) return
    Promise.all([
      fetch(`${API_BASE}/proyectos/${proyectoId}/equipo`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(`${API_BASE}/proyectos/${proyectoId}/mi-rol`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([eq, rol]) => {
      setEquipo(Array.isArray(eq) ? eq : [])
      setPuedeAsignar(rol?.rolObra === 'jefe_proyecto' || rol?.rolObra === 'jefe_fase')
    })
  }, [proyectoId])

  // Refresco en vivo cuando la IA crea etapas o genera el proyecto
  useEffect(() => {
    if (!proyectoId || !fase) return
    const refetch = () => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${etapasKey}`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setEtapasList(Array.isArray(d?.datos?.etapas) ? d.datos.etapas : [])).catch(() => {})
      fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, { headers })
        .then((r) => (r.ok ? r.json() : [])).then((d) => setRegistros(Array.isArray(d) ? d : [])).catch(() => {})
    }
    window.addEventListener('c4:etapas-updated', refetch)
    window.addEventListener('c4:proyecto-updated', refetch)
    return () => {
      window.removeEventListener('c4:etapas-updated', refetch)
      window.removeEventListener('c4:proyecto-updated', refetch)
    }
  }, [proyectoId, fase, etapasKey])

  // Persistir datos de la etapa (fotos, notas, asignados) debounced
  function persistir(next: EtapaDatos) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (notasTimer.current) clearTimeout(notasTimer.current)
    setGuardado('saving')
    notasTimer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 600)
  }

  const regsEtapa = useMemo(() => {
    if (!fase || !etapaKey) return []
    return agruparPorEtapa(etapasList, registros)[etapaKey] ?? []
  }, [etapasList, etapaKey, registros, fase])

  // Responsables = ids de usuario del equipo. Toggle (solo jefe).
  const responsables = datos.responsables ?? []
  const toggleResponsable = (usuarioId: string) => {
    if (!puedeAsignar) return
    const next = responsables.includes(usuarioId)
      ? responsables.filter((x) => x !== usuarioId)
      : [...responsables, usuarioId]
    persistir({ ...datos, responsables: next })
  }
  const seleccionados = equipo.filter((m) => responsables.includes(m.usuarioId))

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando etapa...</span>
    </div>
  )

  if (!esquema || !etapa) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
      <p className="text-sm">Etapa no encontrada.</p>
      <button onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}`)} className="text-xs text-blue-600 hover:underline">
        Volver al pipeline
      </button>
    </div>
  )

  const pct = avanceEtapa(fase!, etapasList, etapaKey!, registros)
  const est = estadoEtapaInfo(pct)
  const fotos = datos.fotos ?? []
  const prev = idxEtapa > 0 ? etapasList[idxEtapa - 1] : null
  const next = idxEtapa < etapasList.length - 1 ? etapasList[idxEtapa + 1] : null

  // ── Actividades ──
  async function agregarActividad() {
    if (!nuevaAct.trim()) return
    const r = await fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, {
      method: 'POST', headers,
      body: JSON.stringify({ nombre: nuevaAct.trim(), estado: esquema.estados[0], datos: { etapa: etapaKey } }),
    })
    const saved = await r.json()
    setRegistros((p) => [...p, saved])
    setNuevaAct(''); setAgregando(false)
  }
  async function cambiarEstado(reg: RegistroFase, estado: string) {
    setRegistros((p) => p.map((x) => x.id === reg.id ? { ...x, estado } : x))
    await fetch(`${API_BASE}/registros-fase/${reg.id}`, { method: 'PATCH', headers, body: JSON.stringify({ estado }) })
  }
  async function asignarResponsable(reg: RegistroFase, value: string) {
    const datosNuevos = { ...reg.datos, responsable: value }
    setRegistros((p) => p.map((x) => x.id === reg.id ? { ...x, datos: datosNuevos } : x))
    await fetch(`${API_BASE}/registros-fase/${reg.id}`, { method: 'PATCH', headers, body: JSON.stringify({ datos: datosNuevos }) })
  }
  async function eliminarActividad(rid: string) {
    setRegistros((p) => p.filter((x) => x.id !== rid))
    await fetch(`${API_BASE}/registros-fase/${rid}`, { method: 'DELETE', headers })
  }

  // ── Metrado (dentro de cada actividad) ──
  function actualizarLocal(reg: RegistroFase, patch: Record<string, any>) {
    setRegistros((p) => p.map((x) => x.id === reg.id ? { ...x, datos: { ...x.datos, ...patch } } : x))
  }
  async function guardarDatos(reg: RegistroFase) {
    setGuardado('saving')
    try {
      const r = await fetch(`${API_BASE}/registros-fase/${reg.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ datos: reg.datos }),
      })
      if (!r.ok) throw new Error()
      setGuardado('saved')
    } catch { setGuardado('error') }
  }

  // ── Biblioteca de partidas (catálogo maestro) ──
  async function buscarCatalogo() {
    if (!busqueda.trim()) return
    setBuscando(true)
    try {
      const r = await fetch(`${API_BASE}/partidas-catalogo/buscar?q=${encodeURIComponent(busqueda.trim())}`, { headers })
      const d = await r.json()
      const arr: PartidaCat[] = Array.isArray(d) ? d : []
      setResultados(arr)
      setSeleccion(new Set(arr.map((p) => p.codigo)))  // por defecto: todas marcadas
    } catch { setResultados([]) } finally { setBuscando(false) }
  }
  function toggleSel(codigo: string) {
    setSeleccion((s) => { const n = new Set(s); n.has(codigo) ? n.delete(codigo) : n.add(codigo); return n })
  }
  async function agregarPartidasSel() {
    const elegidas = resultados.filter((p) => seleccion.has(p.codigo))
    if (!elegidas.length) return
    setAgregandoPartidas(true); setGuardado('saving')
    try {
      const nuevos: RegistroFase[] = []
      for (const p of elegidas) {
        const obs = [p.alcance, p.control ? `Control: ${p.control}` : ''].filter(Boolean).join(' · ')
        const r = await fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, {
          method: 'POST', headers,
          body: JSON.stringify({
            nombre: p.partida, estado: esquema.estados[0],
            datos: { etapa: etapaKey, codigoPartida: p.codigo, unidad: p.unidad, especialidad: p.especialidad, observaciones: obs },
          }),
        })
        if (r.ok) nuevos.push(await r.json())
      }
      setRegistros((prev) => [...prev, ...nuevos])
      setGuardado('saved')
      setModalPartidas(false); setBusqueda(''); setResultados([]); setSeleccion(new Set())
    } catch { setGuardado('error') } finally { setAgregandoPartidas(false) }
  }

  // ── Fotos ──
  async function onArchivos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setSubiendo(true)
    try {
      const nuevas: Foto[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader()
          fr.onload = () => res(String(fr.result))
          fr.onerror = rej
          fr.readAsDataURL(file)
        })
        nuevas.push({ id: uid(), nombre: file.name, dataUrl, fecha: new Date().toISOString() })
      }
      persistir({ ...datos, fotos: [...fotos, ...nuevas] })
    } finally { setSubiendo(false) }
  }
  function eliminarFoto(fid: string) {
    persistir({ ...datos, fotos: fotos.filter((f) => f.id !== fid) })
  }

  async function analizarFotos() {
    if (!fotos.length || analizando) return
    setAnalizando(true)
    try {
      const r = await fetch(`${API_BASE}/chat/analizar-fotos`, {
        method: 'POST', headers,
        body: JSON.stringify({
          fase, etapaNombre: etapa?.nombre, etapaDescripcion: etapa?.descripcion,
          imagenes: fotos.slice(0, 4).map((f) => ({ nombre: f.nombre, dataUrl: f.dataUrl })),
        }),
      })
      const data = await r.json()
      persistir({ ...datos, analisisIA: { texto: data.analisis ?? 'Sin resultado.', fecha: new Date().toISOString() } })
    } catch {
      persistir({ ...datos, analisisIA: { texto: '⚠️ No se pudo analizar las fotos.', fecha: new Date().toISOString() } })
    } finally { setAnalizando(false) }
  }

  return (
    <div className="h-full overflow-y-auto">

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onArchivos} />

      {/* ── Header de la etapa ── */}
      <div className={`border-b ${est.border} ${est.bg} px-6 pt-4 pb-5`}>
        <button
          onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {config?.nombre ?? 'Pipeline'}
        </button>

        <div className="flex items-start gap-4 flex-wrap">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${est.node}`}>
            {pct >= 100 ? <CheckCircle2 className="w-5 h-5" /> : String(idxEtapa + 1).padStart(2, '0')}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-slate-900 leading-tight">{etapa.nombre}</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${est.bg} ${est.text} border ${est.border}`}>
                {est.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">{etapa.descripcion}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-slate-900 tabular-nums leading-none">{pct}%</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">Avance etapa</p>
          </div>
        </div>

        <div className="w-full bg-white/70 rounded-full h-2 mt-4 overflow-hidden">
          <div className={`h-2 rounded-full transition-all duration-500 ${est.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="p-6 grid lg:grid-cols-3 gap-5 items-start">

        {/* ── Columna principal: Galería + Actividades ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Galería de fotos */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Galería de obra</h2>
                <span className="text-[10px] text-slate-400">{fotos.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {fotos.length > 0 && (
                  <button
                    onClick={analizarFotos}
                    disabled={analizando}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {analizando ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanEye className="w-3 h-3" />} Analizar con IA
                  </button>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={subiendo}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Subir fotos
                </button>
              </div>
            </div>
            {fotos.length === 0 ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-12 text-slate-400 hover:bg-slate-50/60 transition-colors"
              >
                <ImagePlus className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium text-slate-500">Sin fotos todavía</p>
                <p className="text-xs">Sube fotos del avance real de esta etapa</p>
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4">
                {fotos.map((f) => (
                  <div key={f.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <img
                      src={f.dataUrl} alt={f.nombre}
                      onClick={() => setLightbox(f)}
                      className="w-full h-full object-cover cursor-zoom-in"
                    />
                    <button
                      onClick={() => eliminarFoto(f.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <p className="absolute bottom-0 inset-x-0 px-2 py-1 text-[9px] text-white bg-linear-to-t from-black/70 to-transparent truncate opacity-0 group-hover:opacity-100 transition-opacity">
                      {f.nombre}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Análisis IA por visión */}
            {(analizando || datos.analisisIA) && (
              <div className="border-t border-slate-100 bg-blue-50/40 px-5 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Análisis del Asistente C4</p>
                  {!analizando && datos.analisisIA && (
                    <button onClick={analizarFotos} className="ml-auto text-[11px] text-blue-600 hover:text-blue-500 font-medium">Re-analizar</button>
                  )}
                </div>
                {analizando ? (
                  <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> Analizando las fotos de la obra...
                  </div>
                ) : (
                  <div className="text-sm text-slate-700 leading-relaxed prose-sm">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                        ul: ({ children }) => <ul className="space-y-0.5 mb-1.5 ml-1">{children}</ul>,
                        li: ({ children }) => <li className="flex gap-1.5"><span className="text-blue-400 shrink-0">·</span><span>{children}</span></li>,
                      }}
                    >
                      {datos.analisisIA!.texto}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Actividades de la etapa */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Actividades</h2>
                <span className="text-[10px] text-slate-400">{regsEtapa.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setModalPartidas(true); setBusqueda(etapa?.nombre ?? '') }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Wand2 className="w-3 h-3" /> Partidas IA
                </button>
                <button
                  onClick={() => setAgregando(true)}
                  className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-900 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Actividad
                </button>
              </div>
            </div>

            {agregando && (
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <input
                  autoFocus value={nuevaAct} onChange={(e) => setNuevaAct(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') agregarActividad(); if (e.key === 'Escape') { setAgregando(false); setNuevaAct('') } }}
                  placeholder={esquema.nombrePlaceholder}
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button onClick={agregarActividad} className="text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-2 rounded-xl transition-colors">Agregar</button>
                <button onClick={() => { setAgregando(false); setNuevaAct('') }} className="text-xs text-slate-400 hover:text-slate-600 px-2">Cancelar</button>
              </div>
            )}

            {regsEtapa.length === 0 && !agregando ? (
              <p className="text-xs text-slate-400 px-5 py-8 text-center">Sin actividades en esta etapa. Agrégalas o pídele al Asistente C4 que genere el proyecto.</p>
            ) : (
              <>
                <p className="text-[11px] text-slate-400 px-5 pt-2.5">Al marcar las actividades como completadas, la etapa avanza sola.</p>
                <div className="divide-y divide-slate-50">
                  {regsEtapa.map((reg) => {
                    const d = reg.datos || {}
                    const abierto = expandido === reg.id
                    const parcial = (Number(d.cantidad) || 0) * (Number(d.precioUnitario) || 0)
                    return (
                    <div key={reg.id} className="group">
                      <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                        <button
                          onClick={() => setExpandido(abierto ? null : reg.id)}
                          className="text-slate-300 hover:text-slate-600 shrink-0"
                          title="Metrado y detalle"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                        </button>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${estadoRegistroClase(reg.estado)}`}>{reg.estado || '—'}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700 truncate block" title={reg.nombre}>{reg.nombre}</span>
                          {d.codigoPartida && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              WBS {d.codigoPartida}{d.unidad ? ` · ${d.unidad}` : ''}{parcial > 0 ? ` · S/ ${nf.format(parcial)}` : ''}
                            </span>
                          )}
                        </div>
                        {/* Responsable de la actividad — selector del equipo (solo jefe asigna) */}
                        <div className="flex items-center gap-1 shrink-0 w-44">
                          <Users className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          {puedeAsignar && equipo.length > 0 ? (
                            <select
                              value={reg.datos?.responsable ?? ''}
                              onChange={(e) => asignarResponsable(reg, e.target.value)}
                              className="w-full text-[11px] text-slate-600 border border-transparent hover:border-slate-200 focus:border-blue-400 rounded-md px-1.5 py-1 outline-none transition-colors bg-transparent focus:bg-white cursor-pointer"
                            >
                              <option value="">Sin asignar</option>
                              {equipo.map((m) => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                            </select>
                          ) : (
                            <span className="w-full text-[11px] text-slate-500 truncate px-1.5">{reg.datos?.responsable || '—'}</span>
                          )}
                        </div>
                        <select
                          value={reg.estado}
                          onChange={(e) => cambiarEstado(reg, e.target.value)}
                          className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1 text-slate-500 outline-none focus:border-blue-400 bg-white"
                        >
                          {esquema.estados.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <button onClick={() => eliminarActividad(reg.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Detalle: metrado + observaciones */}
                      {abierto && (
                        <div className="px-5 pb-4 pt-3 bg-slate-50/50 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <Ruler className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Metrado</span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <label className="block">
                              <span className="text-[10px] text-slate-400">Unidad</span>
                              <input
                                value={d.unidad ?? ''}
                                onChange={(e) => actualizarLocal(reg, { unidad: e.target.value })}
                                onBlur={() => guardarDatos(reg)}
                                placeholder="m2, und…"
                                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-400">Cantidad</span>
                              <input
                                type="number" inputMode="decimal" value={d.cantidad ?? ''}
                                onChange={(e) => actualizarLocal(reg, { cantidad: e.target.value })}
                                onBlur={() => guardarDatos(reg)}
                                placeholder="0"
                                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-400">P.U. (S/)</span>
                              <input
                                type="number" inputMode="decimal" value={d.precioUnitario ?? ''}
                                onChange={(e) => actualizarLocal(reg, { precioUnitario: e.target.value })}
                                onBlur={() => guardarDatos(reg)}
                                placeholder="0.00"
                                className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
                              />
                            </label>
                            <div className="block">
                              <span className="text-[10px] text-slate-400">Parcial (S/)</span>
                              <div className="w-full text-sm font-semibold text-slate-800 border border-slate-100 bg-white rounded-lg px-2 py-1.5 tabular-nums">
                                {nf.format(parcial)}
                              </div>
                            </div>
                          </div>
                          <label className="block mt-3">
                            <span className="text-[10px] text-slate-400">Observaciones / alcance</span>
                            <textarea
                              value={d.observaciones ?? ''}
                              onChange={(e) => actualizarLocal(reg, { observaciones: e.target.value })}
                              onBlur={() => guardarDatos(reg)}
                              rows={2}
                              placeholder="Alcance, control de calidad, notas…"
                              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-2 outline-none focus:border-blue-400 bg-white resize-none"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ── Columna lateral: Notas + Responsables + navegación ── */}
        <div className="space-y-5">
          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Responsables</h2>
            </div>
            {/* Responsables: chips seleccionados (con ✕) + dropdown para agregar */}
            {seleccionados.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {seleccionados.map((m) => (
                  <span key={m.id} className="flex items-center gap-1.5 text-xs pl-1 pr-2 py-1 rounded-full bg-slate-900 text-white">
                    <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{m.nombre.charAt(0).toUpperCase()}</span>
                    {m.nombre}
                    {puedeAsignar && (
                      <button onClick={() => toggleResponsable(m.usuarioId)} className="ml-0.5 text-white/60 hover:text-white" title="Quitar">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              !puedeAsignar && <p className="flex items-center gap-1.5 text-xs text-slate-400 mb-1"><Lock className="w-3.5 h-3.5" /> Sin responsables asignados.</p>
            )}

            {puedeAsignar && (
              equipo.length === 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aún no hay miembros en el equipo. Agrégalos en la pestaña <span className="font-semibold text-slate-600">Equipo</span>.
                </p>
              ) : (() => {
                const disponibles = equipo.filter((m) => !responsables.includes(m.usuarioId))
                return disponibles.length > 0 ? (
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) toggleResponsable(e.target.value) }}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white text-slate-600 cursor-pointer"
                  >
                    <option value="">+ Agregar responsable…</option>
                    {disponibles.map((m) => (
                      <option key={m.id} value={m.usuarioId}>
                        {m.nombre}{m.fase ? ` · ${FASE_LABEL[m.fase] ?? m.fase}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[11px] text-slate-400">Todos los miembros del equipo ya están asignados.</p>
                )
              })()
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Notas de etapa</h2>
            </div>
            <textarea
              value={datos.notas ?? ''}
              onChange={(e) => persistir({ ...datos, notas: e.target.value })}
              placeholder="Observaciones, incidencias, decisiones, pendientes..."
              rows={6}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </section>

          {/* Navegación entre etapas */}
          <div className="flex gap-2">
            <button
              disabled={!prev}
              onClick={() => prev && navigate(`/proyectos/${proyectoId}/panel/${fase}/${prev.key}`)}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>
            <button
              disabled={!next}
              onClick={() => next && navigate(`/proyectos/${proyectoId}/panel/${fase}/${next.key}`)}
              className="flex-1 flex items-center justify-center gap-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: biblioteca de partidas con IA */}
      {modalPartidas && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !agregandoPartidas && setModalPartidas(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Partidas con IA</h3>
                <p className="text-[11px] text-slate-400 truncate">Busca un elemento en la biblioteca maestra y agrégalo como actividades a <span className="font-medium text-slate-600">{etapa?.nombre}</span></p>
              </div>
              <button onClick={() => setModalPartidas(false)} className="text-slate-300 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
              <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-400">
                <Search className="w-4 h-4 text-slate-300 shrink-0" />
                <input
                  autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') buscarCatalogo() }}
                  placeholder="Ej: puerta contraplacada, muro drywall, tarrajeo…"
                  className="flex-1 text-sm outline-none bg-transparent"
                />
              </div>
              <button onClick={buscarCatalogo} disabled={buscando || !busqueda.trim()} className="flex items-center justify-center text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 min-w-18">
                {buscando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {buscando ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-12"><Loader2 className="w-4 h-4 animate-spin" /> Buscando en el catálogo…</div>
              ) : resultados.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-12 px-6">Escribe un elemento y presiona <span className="font-medium text-slate-500">Buscar</span>. Traemos las partidas estándar del catálogo profesional (+8000 partidas).</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {resultados.map((p) => {
                    const sel = seleccion.has(p.codigo)
                    return (
                      <button key={p.codigo} onClick={() => toggleSel(p.codigo)} className="w-full flex items-start gap-3 px-5 py-2.5 text-left hover:bg-slate-50 transition-colors">
                        <span className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${sel ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {sel && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">{p.partida}</p>
                          <p className="text-[10px] text-slate-400 font-mono">WBS {p.codigo} · {p.unidad} · {p.especialidad}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {resultados.length > 0 && (
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                <span className="text-xs text-slate-500">{seleccion.size} de {resultados.length} seleccionadas</span>
                <button onClick={agregarPartidasSel} disabled={agregandoPartidas || seleccion.size === 0} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40">
                  {agregandoPartidas ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Agregar{seleccion.size > 0 ? ` ${seleccion.size}` : ''} a la etapa
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8 cursor-zoom-out"
        >
          <button className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
          <img src={lightbox.dataUrl} alt={lightbox.nombre} className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  )
}
