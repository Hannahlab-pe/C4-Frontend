import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Hammer, HardHat, Building2, PaintBucket, ClipboardList,
  CheckCircle2, Circle, Clock, Plus, Trash2, Loader2,
  Truck, Wrench, Sparkles, Table2, ListChecks, FileText,
  DollarSign, Phone, AlertCircle, GitBranch, FolderCheck,
  Upload, ShieldAlert, ShieldCheck, FileCheck2, ChevronRight, ChevronUp, ChevronDown, Pencil, ImageIcon, Users, Layers, Mountain, Activity, TestTube2, Gauge, BadgeCheck, type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { setGuardado } from '../store/guardadoStore'
import { API_BASE } from '../lib/config'
import AppDialog from '../components/AppDialog'
import SeguridadFase from '../components/SeguridadFase'
import ColindantesFase from '../components/ColindantesFase'
import CalzadurasFase from '../components/CalzadurasFase'
import SuelosFase from '../components/SuelosFase'
import MovimientoTierrasFase from '../components/MovimientoTierrasFase'
import MonitoreoFase from '../components/MonitoreoFase'
import ControlConcretoFase from '../components/ControlConcretoFase'
import CicloPisoFase from '../components/CicloPisoFase'
import ProductividadFase from '../components/ProductividadFase'
import MetradoFase from '../components/MetradoFase'
import PresupuestoFase from '../components/PresupuestoFase'
import CalidadFase from '../components/CalidadFase'
import {
  ESQUEMAS_REGISTRO, kpisDeRegistros, estadoRegistroClase,
  agruparPorEtapa, avanceEtapa, avanceFase, avanceUnidad, estadoEtapaInfo,
  plantillaEtapas, nuevaEtapaKey,
} from '../lib/registros-fase'
import type { RegistroFase, CampoRegistro, EtapaFase } from '../lib/registros-fase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Tarea {
  id: string
  texto: string
  estado: 'pendiente' | 'en_proceso' | 'completada'
}

interface Equipo {
  id: string; nombre: string; tipo: string; estado: string
  contrataEmpresa?: string; ubicacion?: string; operador?: string
  horasTrabajadas?: number; mantenimientoEstado?: string; notas?: string
}

interface Contrata {
  id: string; empresa: string; ruc: string; tipo: string; servicios: string[]; equipos: string[]
  costoUnitario: number; unidad: string
  presupuestoTotal: number; presupuestoAsignado: number
  contactoNombre: string; contactoTelefono: string
  estado: string; cobertura: string; notas: string
}

interface Seccion {
  titulo: string
  tipo: 'kv' | 'tabla' | 'lista'
  kv?: { label: string; valor: string }[]
  columnas?: string[]
  filas?: string[][]
  items?: string[]
}

interface DocReq {
  id: string; nombre: string; descripcion: string; entidad: string
  obligatorio: boolean; estado: string; documentoId: string | null; notas: string
}

// ─── Config visual de fases ───────────────────────────────────────────────────

const FASES_CONFIG: Record<string, {
  nombre: string; descripcion: string; icon: React.ElementType; accent: string
  tareasDefault: string[]
}> = {
  demolicion: {
    nombre: 'Demolición', descripcion: 'Retiro de estructuras existentes y limpieza del terreno',
    icon: Hammer, accent: 'bg-red-500',
    tareasDefault: [
      'Inspección previa y certificados municipales',
      'Contratación empresa demoledora',
      'Demolición estructural',
      'Retiro de escombros y desmonte',
      'Nivelación y limpieza final',
    ],
  },
  excavacion: {
    nombre: 'Excavación', descripcion: 'Movimiento de tierras, sótanos y calzaduras',
    icon: HardHat, accent: 'bg-orange-500',
    tareasDefault: [
      'Estudio de mecánica de suelos',
      'Diseño de calzaduras y anclajes',
      'Permisos municipales de excavación',
      'Excavación masiva y calzaduras',
      'Habilitación para cimentación',
    ],
  },
  construccion: {
    nombre: 'Construcción', descripcion: 'Casco estructural: cimentación, columnas, losas y muros',
    icon: Building2, accent: 'bg-blue-600',
    tareasDefault: [
      'Cimentación y zapatas',
      'Estructura por piso',
      'Instalaciones empotradas',
      'Albañilería',
      'Azotea y tanque elevado',
    ],
  },
  acabados: {
    nombre: 'Acabados', descripcion: 'Albañilería, revestimientos, pintura y equipamiento',
    icon: PaintBucket, accent: 'bg-emerald-500',
    tareasDefault: [
      'Tarrajeo y contrapisos',
      'Enchapes de baños y cocinas',
      'Carpintería y vidrios',
      'Pintura general',
      'Ascensor e instalaciones comunes',
    ],
  },
  administracion: {
    nombre: 'Administración', descripcion: 'Licencias, SUNARP, independizaciones y entrega',
    icon: ClipboardList, accent: 'bg-violet-500',
    tareasDefault: [
      'Licencia de construcción (municipio)',
      'Pólizas de seguro CAR',
      'Control de costos y valorizaciones',
      'Declaratoria de fábrica (SUNARP)',
      'Independización y entrega',
    ],
  },
}

const ESTADO_SIGUIENTE: Record<string, string> = {
  pendiente: 'en_proceso',
  en_proceso: 'completada',
  completada: 'pendiente',
}

const TIPOS_CONTRATA = [
  { value: 'subcontrato_obra',    label: 'Subcontrato de obra' },
  { value: 'alquiler_maquinaria', label: 'Alquiler de maquinaria' },
  { value: 'transporte',          label: 'Transporte' },
  { value: 'especialidad',        label: 'Especialidad técnica' },
  { value: 'otro',                label: 'Otro' },
]

const TIPOS_EQUIPO = [
  { value: 'grua',            label: 'Grúa torre' },
  { value: 'excavadora',      label: 'Excavadora' },
  { value: 'retroexcavadora', label: 'Retroexcavadora' },
  { value: 'volquete',        label: 'Volquete' },
  { value: 'bomba_concreto',  label: 'Bomba de concreto' },
  { value: 'mezcladora',      label: 'Mezcladora' },
  { value: 'andamios',        label: 'Andamios' },
  { value: 'otro',            label: 'Otro' },
]

const TIPO_EQUIPO_ICON: Record<string, React.ElementType> = {
  grua: Building2, excavadora: HardHat, retroexcavadora: HardHat,
  volquete: Truck, mezcladora: Wrench, bomba_concreto: Wrench,
  andamios: Building2, otro: Wrench,
}

const SECCION_ICON: Record<string, React.ElementType> = {
  kv: FileText, tabla: Table2, lista: ListChecks,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtSoles = (n: number) => `S/ ${Number(n || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

function estadoContrataBadge(estado: string) {
  const map: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    pendiente: 'bg-amber-100 text-amber-700',
    completado: 'bg-blue-100 text-blue-700',
    cancelado: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function EmptyTab({ icon: Icon, titulo, sub }: { icon: LucideIcon; titulo: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-slate-400 gap-2">
      <Icon className="w-9 h-9 opacity-25" />
      <p className="text-sm font-medium text-slate-500">{titulo}</p>
      <p className="text-xs text-center max-w-sm leading-relaxed">{sub}</p>
    </div>
  )
}

// ─── Edición inline del expediente ────────────────────────────────────────────

function Editable({ value, onCommit, className = '' }: {
  value: string; onCommit: (v: string) => void; className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (editing) {
    const commit = () => { setEditing(false); if (draft.trim() !== value) onCommit(draft.trim()) }
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        className={`bg-white border border-blue-300 rounded-md px-1.5 py-0.5 outline-none ring-2 ring-blue-100 text-xs min-w-0 w-full ${className}`}
      />
    )
  }
  return (
    <span
      onClick={() => { setDraft(value); setEditing(true) }}
      title="Click para editar"
      className={`cursor-text rounded px-0.5 -mx-0.5 hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 transition-colors ${className}`}
    >
      {value || '—'}
    </span>
  )
}

function SeccionBloque({ s, onChange }: { s: Seccion; onChange: (next: Seccion) => void }) {
  const Icon = SECCION_ICON[s.tipo] ?? FileText
  return (
    <section className="px-6 py-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{s.titulo}</h3>
      </div>

      {s.tipo === 'kv' && (
        <dl className="grid sm:grid-cols-2 gap-x-10">
          {(s.kv ?? []).map((par, i) => (
            <div key={i} className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100">
              <dt className="text-xs text-slate-500 shrink-0">{par.label}</dt>
              <dd className="text-xs font-semibold text-slate-900 text-right min-w-0">
                <Editable
                  value={par.valor}
                  onCommit={(v) => onChange({ ...s, kv: (s.kv ?? []).map((p, pi) => pi === i ? { ...p, valor: v } : p) })}
                  className="text-right font-semibold"
                />
              </dd>
            </div>
          ))}
        </dl>
      )}

      {s.tipo === 'tabla' && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                {(s.columnas ?? []).map((col, i) => (
                  <th key={i} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 py-2 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(s.filas ?? []).map((fila, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {fila.map((celda, j) => (
                    <td key={j} className={`px-1 py-2.5 align-top ${j === 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                      <Editable
                        value={celda}
                        onCommit={(v) => onChange({
                          ...s,
                          filas: (s.filas ?? []).map((f, fi) => fi === i ? f.map((c, ci) => ci === j ? v : c) : f),
                        })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {s.tipo === 'lista' && (
        <ul className="grid sm:grid-cols-2 gap-x-10">
          {(s.items ?? []).map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 py-1.5 border-b border-slate-100">
              <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.75" />
              <span className="text-xs text-slate-600 leading-relaxed min-w-0 flex-1">
                <Editable
                  value={item}
                  onCommit={(v) => onChange({ ...s, items: (s.items ?? []).map((it, ii) => ii === i ? v : it) })}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProyectoFasePage() {
  const { id: proyectoId, fase } = useParams<{ id: string; fase: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const config = FASES_CONFIG[fase ?? '']
  const esquema = ESQUEMAS_REGISTRO[fase ?? '']

  const [tab, setTab] = useState('etapas')

  const [registros, setRegistros] = useState<RegistroFase[]>([])
  const [loadingRegs, setLoadingRegs] = useState(true)
  const [modalReg, setModalReg] = useState<Partial<RegistroFase> | null>(null)
  const [guardandoReg, setGuardandoReg] = useState(false)

  // Etapas dinámicas del proyecto (creadas por la IA o por el usuario)
  const [etapas, setEtapas] = useState<EtapaFase[]>([])
  const [modalEtapa, setModalEtapa] = useState<{ key?: string; nombre: string; descripcion: string } | null>(null)
  const [confirmDelEtapa, setConfirmDelEtapa] = useState<{ key: string; nombre: string } | null>(null)
  const [anotOpen, setAnotOpen] = useState<string | null>(null)
  const [anotInput, setAnotInput] = useState('')
  const [modalDocManual, setModalDocManual] = useState<{ nombre: string } | null>(null)
  const [guardandoDocManual, setGuardandoDocManual] = useState(false)

  const [contratas, setContratas] = useState<Contrata[]>([])
  const [modalContrata, setModalContrata] = useState<Partial<Contrata> | null>(null)
  const [guardandoContrata, setGuardandoContrata] = useState(false)

  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [modalEquipo, setModalEquipo] = useState<Partial<Equipo> | null>(null)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  const [tareas, setTareas] = useState<Tarea[]>([])
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [guardandoTarea, setGuardandoTarea] = useState<string | null>(null)

  const [secciones, setSecciones] = useState<Seccion[]>([])
  const [guardadoExp, setGuardadoExp] = useState<'idle' | 'guardando' | 'ok'>('idle')
  const lastSavedExp = useRef<string>('[]')
  const expTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [docsReq, setDocsReq] = useState<DocReq[]>([])
  const [subiendoDoc, setSubiendoDoc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docTargetRef = useRef<string | null>(null)

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  useEffect(() => {
    if (!proyectoId || !fase) return
    setTab('etapas')
    setLoadingRegs(true)

    fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRegistros(Array.isArray(d) ? d : []))
      .catch(() => setRegistros([]))
      .finally(() => setLoadingRegs(false))

    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}__etapas`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEtapas(Array.isArray(d?.datos?.etapas) ? d.datos.etapas : []))
      .catch(() => setEtapas([]))

    fetch(`${API_BASE}/contratas-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setContratas(Array.isArray(d) ? d : []))
      .catch(() => setContratas([]))

    fetch(`${API_BASE}/equipos-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEquipos(Array.isArray(d) ? d : []))
      .catch(() => setEquipos([]))

    // El checklist se llena SOLO con lo que genera la IA o agrega el usuario — sin seed genérico
    fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Tarea[]) => setTareas(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const secs = Array.isArray(d?.datos?.secciones) ? d.datos.secciones : []
        lastSavedExp.current = JSON.stringify(secs)
        setSecciones(secs)
      })
      .catch(() => setSecciones([]))

    fetch(`${API_BASE}/documentos-requeridos/${proyectoId}/${fase}`, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDocsReq(Array.isArray(d) ? d : []))
      .catch(() => setDocsReq([]))
  }, [proyectoId, fase])

  // Refresco en vivo cuando la IA crea etapas o genera el proyecto (eventos del chat)
  useEffect(() => {
    if (!proyectoId || !fase) return
    const h = { Authorization: `Bearer ${token}` }
    const refetchTodo = (e?: Event) => {
      const det = (e as CustomEvent)?.detail
      if (det?.fase && det.fase !== fase) return
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}__etapas`, { headers: h, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setEtapas(Array.isArray(d?.datos?.etapas) ? d.datos.etapas : [])).catch(() => {})
      fetch(`${API_BASE}/registros-fase/${proyectoId}/${fase}`, { headers: h, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : [])).then((d) => setRegistros(Array.isArray(d) ? d : [])).catch(() => {})
      fetch(`${API_BASE}/documentos-requeridos/${proyectoId}/${fase}`, { headers: h, cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : [])).then((d) => setDocsReq(Array.isArray(d) ? d : [])).catch(() => {})
    }
    window.addEventListener('c4:etapas-updated', refetchTodo)
    window.addEventListener('c4:proyecto-updated', refetchTodo)
    window.addEventListener('c4:documentos-updated', refetchTodo)
    return () => {
      window.removeEventListener('c4:etapas-updated', refetchTodo)
      window.removeEventListener('c4:proyecto-updated', refetchTodo)
      window.removeEventListener('c4:documentos-updated', refetchTodo)
    }
  }, [proyectoId, fase, token])

  // Persistir ediciones del expediente (debounced)
  useEffect(() => {
    const json = JSON.stringify(secciones)
    if (json === lastSavedExp.current) return
    setGuardadoExp('guardando')
    if (expTimer.current) clearTimeout(expTimer.current)
    expTimer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}`, {
        method: 'PUT', headers,
        body: JSON.stringify({ datos: { secciones } }),
      })
        .then(() => { lastSavedExp.current = json; setGuardadoExp('ok') })
        .catch(() => setGuardadoExp('idle'))
    }, 800)
  }, [secciones])

  if (!config || !esquema) return (
    <div className="h-full flex items-center justify-center">
      <p className="text-slate-400 text-sm">Fase no encontrada.</p>
    </div>
  )

  const Icon = config.icon

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpisReg = kpisDeRegistros(fase!, registros)
  const contratosActivos = contratas.filter((c) => c.estado === 'activo').length
  const presupuestoTotal = contratas.reduce((s, c) => s + Number(c.presupuestoTotal || 0), 0)
  const presupuestoAsignado = contratas.reduce((s, c) => s + Number(c.presupuestoAsignado || 0), 0)
  const avancePresupuestal = presupuestoTotal > 0 ? Math.round((presupuestoAsignado / presupuestoTotal) * 100) : 0
  const kpis = [
    ...kpisReg,
    { label: 'Contratas activas', value: String(contratosActivos) },
    { label: 'Avance presup.', value: `${avancePresupuestal}%` },
  ]
  const avanceGlobal = avanceFase(fase!, etapas, registros)
  const grupos = agruparPorEtapa(etapas, registros)
  const camposDestacados = esquema.secciones.flatMap((s) => s.campos).filter((c) => c.destacado).slice(0, 4)

  // ── Gestión de etapas (persistidas en fases-detalle `${fase}__etapas`) ──────
  async function persistEtapas(next: EtapaFase[]) {
    setEtapas(next)
    setGuardado('saving')
    await fetch(`${API_BASE}/fases-detalle/${proyectoId}/${fase}__etapas`, {
      method: 'PUT', headers, body: JSON.stringify({ datos: { etapas: next } }),
    }).then((r) => { if (!r.ok) throw new Error(); setGuardado('saved') }).catch(() => setGuardado('error'))
  }
  function guardarEtapa() {
    if (!modalEtapa?.nombre?.trim()) return
    const nombre = modalEtapa.nombre.trim()
    const descripcion = modalEtapa.descripcion?.trim() ?? ''
    if (modalEtapa.key) {
      persistEtapas(etapas.map((e) => e.key === modalEtapa.key ? { ...e, nombre, descripcion } : e))
    } else {
      const key = nuevaEtapaKey(nombre, etapas.map((e) => e.key))
      persistEtapas([...etapas, { key, nombre, descripcion }])
    }
    setModalEtapa(null)
  }
  function eliminarEtapa(key: string) {
    persistEtapas(etapas.filter((e) => e.key !== key))
  }
  function moverEtapa(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= etapas.length) return
    const next = [...etapas]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    persistEtapas(next)
  }
  function usarPlantilla() {
    persistEtapas(plantillaEtapas(fase!))
  }

  // ── CRUD registros ────────────────────────────────────────────────────────
  async function guardarRegistro() {
    if (!modalReg?.nombre?.trim()) return
    setGuardandoReg(true)
    try {
      const isNew = !modalReg.id
      const url = isNew
        ? `${API_BASE}/registros-fase/${proyectoId}/${fase}`
        : `${API_BASE}/registros-fase/${modalReg.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalReg) })
      const saved = await r.json()
      setRegistros((prev) => isNew ? [...prev, saved] : prev.map((x) => x.id === saved.id ? saved : x))
      setModalReg(null)
    } finally { setGuardandoReg(false) }
  }

  async function cambiarEstadoRegistro(reg: RegistroFase, estado: string) {
    setRegistros((prev) => prev.map((r) => r.id === reg.id ? { ...r, estado } : r))
    await fetch(`${API_BASE}/registros-fase/${reg.id}`, { method: 'PATCH', headers, body: JSON.stringify({ estado }) })
  }

  async function eliminarRegistro(id: string) {
    setRegistros((prev) => prev.filter((r) => r.id !== id))
    await fetch(`${API_BASE}/registros-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Anotaciones por actividad (bitácora de la tarea) ────────────────────────
  async function guardarDatosRegistro(reg: RegistroFase, datos: Record<string, any>) {
    setRegistros((prev) => prev.map((r) => r.id === reg.id ? { ...r, datos } : r))
    await fetch(`${API_BASE}/registros-fase/${reg.id}`, { method: 'PATCH', headers, body: JSON.stringify({ datos }) })
  }
  function agregarAnotacion(reg: RegistroFase, texto: string) {
    if (!texto.trim()) return
    const anot = { id: Math.random().toString(36).slice(2, 9), fecha: new Date().toISOString().slice(0, 10), texto: texto.trim() }
    guardarDatosRegistro(reg, { ...reg.datos, anotaciones: [...(reg.datos?.anotaciones ?? []), anot] })
  }
  function eliminarAnotacion(reg: RegistroFase, anotId: string) {
    guardarDatosRegistro(reg, { ...reg.datos, anotaciones: (reg.datos?.anotaciones ?? []).filter((a: any) => a.id !== anotId) })
  }

  // ── CRUD contratas / equipos / tareas ─────────────────────────────────────
  async function guardarContrata() {
    if (!modalContrata?.empresa?.trim()) return
    setGuardandoContrata(true)
    try {
      const isNew = !modalContrata.id
      const url = isNew ? `${API_BASE}/contratas-fase/${proyectoId}/${fase}` : `${API_BASE}/contratas-fase/${modalContrata.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalContrata) })
      const saved = await r.json()
      setContratas((prev) => isNew ? [...prev, saved] : prev.map((c) => c.id === saved.id ? saved : c))
      setModalContrata(null)
    } finally { setGuardandoContrata(false) }
  }

  async function eliminarContrata(id: string) {
    setContratas((prev) => prev.filter((c) => c.id !== id))
    await fetch(`${API_BASE}/contratas-fase/${id}`, { method: 'DELETE', headers })
  }

  async function guardarEquipo() {
    if (!modalEquipo?.nombre?.trim()) return
    setGuardandoEquipo(true)
    try {
      const isNew = !modalEquipo.id
      const url = isNew ? `${API_BASE}/equipos-fase/${proyectoId}/${fase}` : `${API_BASE}/equipos-fase/${modalEquipo.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalEquipo) })
      const saved = await r.json()
      setEquipos((prev) => isNew ? [...prev, saved] : prev.map((e) => e.id === saved.id ? saved : e))
      setModalEquipo(null)
    } finally { setGuardandoEquipo(false) }
  }

  async function eliminarEquipo(id: string) {
    setEquipos((prev) => prev.filter((e) => e.id !== id))
    await fetch(`${API_BASE}/equipos-fase/${id}`, { method: 'DELETE', headers })
  }

  async function avanzarEstado(tarea: Tarea) {
    const nuevoEstado = ESTADO_SIGUIENTE[tarea.estado] ?? 'pendiente'
    setGuardandoTarea(tarea.id)
    setTareas((prev) => prev.map((t) => t.id === tarea.id ? { ...t, estado: nuevoEstado as Tarea['estado'] } : t))
    await fetch(`${API_BASE}/tareas-fase/${tarea.id}/estado`, {
      method: 'PATCH', headers, body: JSON.stringify({ estado: nuevoEstado }),
    })
    setGuardandoTarea(null)
  }

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return
    const r = await fetch(`${API_BASE}/tareas-fase/${proyectoId}/${fase}`, {
      method: 'POST', headers, body: JSON.stringify({ texto: nuevaTarea.trim() }),
    })
    const nueva = await r.json()
    setTareas((prev) => [...prev, nueva])
    setNuevaTarea('')
    setAgregando(false)
  }

  async function eliminarTarea(id: string) {
    setTareas((prev) => prev.filter((t) => t.id !== id))
    await fetch(`${API_BASE}/tareas-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Documentos requeridos ─────────────────────────────────────────────────
  function pedirArchivo(docReqId: string) {
    docTargetRef.current = docReqId
    fileInputRef.current?.click()
  }

  async function onArchivoElegido(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    const docReqId = docTargetRef.current
    e.target.value = ''
    if (!file || !docReqId) return
    setSubiendoDoc(docReqId)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const r = await fetch(`${API_BASE}/documentos`, {
        method: 'POST', headers,
        body: JSON.stringify({ proyectoId, nombre: file.name, mimeType: file.type, base64 }),
      })
      const doc = await r.json()
      await fetch(`${API_BASE}/documentos-requeridos/${docReqId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ estado: 'subido', documentoId: doc.id, notas: file.name }),
      })
      setDocsReq((prev) => prev.map((d) => d.id === docReqId ? { ...d, estado: 'subido', documentoId: doc.id, notas: file.name } : d))
    } finally {
      setSubiendoDoc(null)
      docTargetRef.current = null
    }
  }

  async function cambiarEstadoDoc(doc: DocReq, estado: string) {
    setDocsReq((prev) => prev.map((d) => d.id === doc.id ? { ...d, estado } : d))
    await fetch(`${API_BASE}/documentos-requeridos/${doc.id}`, { method: 'PATCH', headers, body: JSON.stringify({ estado }) })
  }

  async function eliminarDoc(id: string) {
    setDocsReq((prev) => prev.filter((d) => d.id !== id))
    await fetch(`${API_BASE}/documentos-requeridos/${id}`, { method: 'DELETE', headers })
  }

  async function guardarDocManual() {
    const nombre = modalDocManual?.nombre?.trim()
    if (!nombre) return
    setGuardandoDocManual(true)
    try {
      const r = await fetch(`${API_BASE}/documentos-requeridos/${proyectoId}/${fase}`, {
        method: 'POST', headers, body: JSON.stringify({ nombre, obligatorio: true }),
      })
      const nuevo = await r.json()
      setDocsReq((prev) => [...prev, nuevo])
      setModalDocManual(null)
    } finally { setGuardandoDocManual(false) }
  }

  const completadasT = tareas.filter((t) => t.estado === 'completada').length
  const docsSubidos = docsReq.filter((d) => d.estado === 'subido' || d.estado === 'no_aplica').length

  const TABS = [
    { key: 'etapas',      label: 'Etapas de obra', icon: GitBranch },
    ...(fase !== 'administracion' ? [{ key: 'seguridad', label: 'Seguridad', icon: ShieldCheck }] : []),
    ...(fase !== 'administracion' ? [{ key: 'calidad', label: 'Calidad', icon: BadgeCheck }] : []),
    ...(fase === 'excavacion' ? [{ key: 'suelos', label: 'Estudio de Suelos', icon: Mountain }, { key: 'calzaduras', label: 'Calzaduras', icon: Layers }, { key: 'tierras', label: 'Mov. de tierras', icon: Truck }, { key: 'metrado', label: 'Metrado y costo', icon: ClipboardList }, { key: 'monitoreo', label: 'Monitoreo', icon: Activity }] : []),
    ...(fase === 'construccion' ? [{ key: 'concreto', label: 'Control de concreto', icon: TestTube2 }, { key: 'ciclo', label: 'Ciclo de piso', icon: Building2 }] : []),
    ...(['construccion', 'acabados', 'administracion'].includes(fase ?? '') ? [{ key: 'partidas', label: 'Metrado y costo', icon: ClipboardList }] : []),
    ...(['demolicion', 'excavacion', 'construccion', 'acabados'].includes(fase ?? '') ? [{ key: 'productividad', label: 'Productividad', icon: Gauge }] : []),
    ...((fase === 'demolicion' || fase === 'excavacion') ? [{ key: 'colindantes', label: 'Colindantes', icon: Users }] : []),
    { key: 'documentos',  label: 'Documentos',     icon: FolderCheck, badge: docsReq.length },
    { key: 'recursos',    label: 'Recursos',       icon: Truck },
    { key: 'presupuesto', label: 'Presupuesto',    icon: DollarSign },
    { key: 'expediente',  label: 'Expediente (IA)', icon: Sparkles },
  ]

  // Fila compacta de registro dentro de una etapa
  function FilaRegistro({ reg }: { reg: RegistroFase }) {
    const d = reg.datos ?? {}
    const responsable = d.responsable || d.cuadrilla || d.contrata || d.responsableObra || ''
    const fecha = d.fechaInicio || d.fechaProgramada || d.fechaIngreso || d.fechaEntregaEstimada || ''
    const anotaciones: any[] = Array.isArray(d.anotaciones) ? d.anotaciones : []
    const abierto = anotOpen === reg.id

    return (
      <div className="px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors group">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${estadoRegistroClase(reg.estado)}`}>
            {reg.estado}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate" title={reg.nombre}>{reg.nombre}</p>
            {/* Encargado + fecha de un vistazo */}
            {(responsable || fecha) && (
              <div className="flex items-center gap-3 mt-0.5">
                {responsable && (
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-44">
                    <span className="w-3.5 h-3.5 rounded bg-slate-200 text-slate-600 text-[7px] font-bold flex items-center justify-center shrink-0">
                      {String(responsable).charAt(0).toUpperCase()}
                    </span>
                    {responsable}
                  </span>
                )}
                {fecha && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="w-3 h-3" />{fecha}{d.duracionDias ? ` · ${d.duracionDias}d` : ''}</span>}
              </div>
            )}
          </div>

          {/* métricas inline */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {fase === 'acabados' && (
              <div className="flex items-center gap-1.5 w-24">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${avanceUnidad(reg)}%` }} />
                </div>
                <span className="text-[10px] text-slate-400 w-7 text-right">{avanceUnidad(reg)}%</span>
              </div>
            )}
            {camposDestacados.slice(0, 2).map((c) => {
              const v = reg.datos?.[c.key]
              if (v == null || v === '') return null
              return (
                <span key={c.key} className="text-[10px] text-slate-400 whitespace-nowrap">
                  {c.label.split(' ')[0]}: <b className="text-slate-600">{c.tipo === 'number' ? Number(v).toLocaleString('es-PE') : String(v)}{c.unidad ? ` ${c.unidad}` : ''}</b>
                </span>
              )
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setAnotOpen(abierto ? null : reg.id); setAnotInput('') }}
              className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-md transition-colors ${abierto || anotaciones.length ? 'text-blue-600 hover:text-blue-700' : 'text-slate-400 hover:text-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
              title="Anotaciones de la tarea"
            >
              <FileText className="w-3 h-3" /> {anotaciones.length > 0 ? anotaciones.length : ''}
            </button>
            <select
              value={reg.estado}
              onChange={(e) => cambiarEstadoRegistro(reg, e.target.value)}
              className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1 text-slate-500 outline-none focus:border-blue-400 bg-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              {esquema.estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <button onClick={() => setModalReg(reg)} className="text-[10px] text-slate-400 hover:text-slate-700 px-1.5 py-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              Editar
            </button>
            <button onClick={() => eliminarRegistro(reg.id)} className="text-slate-300 hover:text-red-400 p-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Panel de anotaciones (bitácora de la tarea) */}
        {abierto && (
          <div className="ml-4 mr-2 mb-1.5 pl-3 border-l-2 border-blue-100 space-y-1.5">
            {anotaciones.length === 0 && <p className="text-[11px] text-slate-300">Sin anotaciones. Deja constancia del avance día a día.</p>}
            {anotaciones.map((a) => (
              <div key={a.id} className="flex items-start gap-2 group/anot">
                <span className="text-[10px] text-slate-400 font-mono shrink-0 mt-0.5">{(a.fecha || '').slice(5)}</span>
                <span className="text-[11px] text-slate-600 flex-1">{a.texto}</span>
                <button onClick={() => eliminarAnotacion(reg, a.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover/anot:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-0.5">
              <input
                autoFocus value={anotInput} onChange={(e) => setAnotInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { agregarAnotacion(reg, anotInput); setAnotInput('') } }}
                placeholder="Nueva anotación (ej: hoy se avanzó el 60%)..."
                className="flex-1 text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <button onClick={() => { agregarAnotacion(reg, anotInput); setAnotInput('') }} className="text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-colors">Anotar</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">

      {/* Input oculto para subir documentos requeridos */}
      <input ref={fileInputRef} type="file" className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={onArchivoElegido} />

      {/* ── Header azul noche (igual que el Cronograma) ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 md:py-5">
        <div className="flex items-center gap-3 md:gap-4 mb-4">
          <div className="relative w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-slate-500" />
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${config.accent}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate text-slate-900 font-display">{config.nombre}</h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{config.descripcion}</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider whitespace-nowrap">Avance<span className="hidden sm:inline"> de fase</span></p>
              <p className="text-sm font-bold text-slate-900">{avanceGlobal}%</p>
            </div>
            <div className="hidden sm:block w-20 md:w-28 bg-slate-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${avanceGlobal}%` }} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 md:[grid-template-columns:var(--kpi-cols)]"
          style={{ ['--kpi-cols' as any]: `repeat(${kpis.length}, minmax(0, 1fr))` }}>
          {kpis.map((k) => (
            <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 truncate">{k.label}</p>
              <p className="text-sm font-bold truncate text-slate-900" title={k.value}>{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs (barra blanca) ── */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6">
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map(({ key, label, icon: TabIcon, badge }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 whitespace-nowrap shrink-0 transition-colors ${
                tab === key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
              {badge != null && badge > 0 && (
                <span className="text-[9px] font-bold bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 leading-none">{badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-6">

        {/* ════ TAB: ETAPAS DE OBRA (pipeline) ════ */}
        {tab === 'etapas' && (
          <div className="space-y-4">
            {loadingRegs ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando...</span>
              </div>
            ) : (
              <>
                {/* Toolbar de etapas */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Etapas de obra</p>
                    <p className="text-xs text-slate-400 mt-0.5">{etapas.length} etapa{etapas.length !== 1 ? 's' : ''} · pipeline del proyecto</p>
                  </div>
                  {etapas.length > 0 && (
                    <button onClick={() => setModalEtapa({ nombre: '', descripcion: '' })} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3.5 py-2 rounded-xl transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Nueva etapa
                    </button>
                  )}
                </div>

                {etapas.length === 0 ? (
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-10 text-center">
                    <GitBranch className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">Aún no hay etapas en esta fase</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                      Pídele al <b>Asistente C4</b> que entienda tu obra y te proponga las etapas (las crea automáticamente si aceptas),
                      o créalas tú mismo. Cada etapa tendrá su galería, actividades y avance.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button onClick={() => setModalEtapa({ nombre: '', descripcion: '' })} className="flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Crear etapa
                      </button>
                      <button onClick={usarPlantilla} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-white px-4 py-2 rounded-xl transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Usar plantilla sugerida
                      </button>
                    </div>
                  </div>
                ) : (
                <>

                {/* Cronograma horizontal de etapas */}
                <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Cronograma de etapas</p>
                  <div className="flex items-start overflow-x-auto pb-1">
                    {etapas.map((etapa, idx) => {
                      const pct = avanceEtapa(fase!, etapas, etapa.key, registros)
                      const est = estadoEtapaInfo(pct)
                      const esUltima = idx === etapas.length - 1
                      return (
                        <div key={etapa.key} className="flex-1 flex flex-col items-center min-w-[76px] md:min-w-0 c4-reveal" style={{ animationDelay: `${idx * 60}ms` }}>
                          <div className="flex items-center w-full">
                            <div className={`h-1 flex-1 rounded-full ${idx === 0 ? 'opacity-0' : estadoEtapaInfo(avanceEtapa(fase!, etapas, etapas[idx - 1].key, registros)).bar}`} />
                            <button
                              onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}/${etapa.key}`)}
                              title={`${etapa.nombre} — ${est.label} ${pct}%`}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mx-1 transition-transform hover:scale-110 ${est.node}`}
                            >
                              {pct >= 100 ? <CheckCircle2 className="w-4 h-4" /> : String(idx + 1).padStart(2, '0')}
                            </button>
                            <div className={`h-1 flex-1 rounded-full ${esUltima ? 'opacity-0' : est.bar}`} />
                          </div>
                          <button
                            onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}/${etapa.key}`)}
                            className="mt-2 text-center px-1 group"
                          >
                            <p className="text-[10px] font-medium text-slate-600 leading-tight line-clamp-2 group-hover:text-slate-900">{etapa.nombre}</p>
                            <span className={`text-[9px] font-bold ${est.text}`}>{pct}%</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="relative">
                  {etapas.map((etapa, idx) => {
                    const propios = fase === 'acabados' ? [] : (grupos[etapa.key] ?? [])
                    const pct = avanceEtapa(fase!, etapas, etapa.key, registros)
                    const est = estadoEtapaInfo(pct)
                    const esUltima = idx === etapas.length - 1
                    return (
                      <div key={etapa.key} className="relative flex gap-4 c4-reveal" style={{ animationDelay: `${idx * 80}ms` }}>
                        {/* Conector vertical */}
                        <div className="flex flex-col items-center">
                          <button
                            onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}/${etapa.key}`)}
                            title="Abrir etapa"
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10 transition-transform hover:scale-110 ${est.node}`}
                          >
                            {pct >= 100 ? <CheckCircle2 className="w-4 h-4" /> : String(idx + 1).padStart(2, '0')}
                          </button>
                          {!esUltima && <div className={`w-0.5 flex-1 ${est.bar}`} />}
                        </div>

                        {/* Card de etapa */}
                        <div className={`flex-1 bg-white rounded-2xl border ${est.border} overflow-hidden ${esUltima ? '' : 'mb-4'}`}>
                          <div className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-100 ${est.bg}`}>
                            <button
                              onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}/${etapa.key}`)}
                              className="min-w-0 w-full sm:flex-1 text-left group flex items-start gap-2"
                            >
                              <span className={`w-1.5 h-1.5 mt-1.5 rounded-full shrink-0 ${est.dot}`} />
                              <span className="min-w-0">
                                <span className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-950">{etapa.nombre}</span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${est.bg} ${est.text} border ${est.border}`}>{est.label}</span>
                                </span>
                                <span className="block text-[11px] text-slate-400 truncate">{etapa.descripcion}</span>
                              </span>
                            </button>
                            <div className="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
                              <div className="flex items-center gap-2 flex-1 sm:flex-none sm:w-28">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full transition-all ${est.bar}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[11px] font-bold text-slate-600 w-8 text-right">{pct}%</span>
                              </div>
                              {esquema.conEtapaEnForm && (
                                <button
                                  onClick={() => setModalReg({ nombre: '', estado: esquema.estados[0], datos: { etapa: etapa.key } })}
                                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium transition-colors shrink-0"
                                >
                                  <Plus className="w-3 h-3" /> Actividad
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/proyectos/${proyectoId}/panel/${fase}/${etapa.key}`)}
                                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-500 font-medium transition-colors shrink-0"
                              >
                                <ImageIcon className="w-3 h-3" /> Abrir <ChevronRight className="w-3 h-3" />
                              </button>
                              <div className="hidden sm:flex items-center gap-0.5 border-l border-slate-200 pl-2 ml-1">
                                <button onClick={() => moverEtapa(idx, -1)} disabled={idx === 0} title="Subir" className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 p-0.5">
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => moverEtapa(idx, 1)} disabled={idx === etapas.length - 1} title="Bajar" className="text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 p-0.5">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setModalEtapa({ key: etapa.key, nombre: etapa.nombre, descripcion: etapa.descripcion })} title="Editar etapa" className="text-slate-300 hover:text-slate-600 p-0.5">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelEtapa({ key: etapa.key, nombre: etapa.nombre })}
                                  title="Eliminar etapa" className="text-slate-300 hover:text-red-400 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {fase !== 'acabados' && propios.length > 0 && (
                            <div className="divide-y divide-slate-50 py-1">
                              {propios.map((reg) => <FilaRegistro key={reg.id} reg={reg} />)}
                            </div>
                          )}
                          {fase !== 'acabados' && propios.length === 0 && (
                            <p className="text-[11px] text-slate-300 px-4 py-3">Sin actividades en esta etapa.</p>
                          )}
                          {fase === 'acabados' && (
                            <p className="text-[11px] text-slate-400 px-4 py-3">
                              Avance calculado del progreso de {registros.length || 0} unidades (matriz abajo).
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                </>
                )}

                {/* Matriz de unidades (solo acabados) */}
                {fase === 'acabados' && (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                      <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Matriz de unidades</h2>
                      <button
                        onClick={() => setModalReg({ nombre: '', estado: esquema.estados[0], datos: {} })}
                        className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-900 font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" /> {esquema.nuevoLabel}
                      </button>
                    </div>
                    {registros.length === 0 ? (
                      <EmptyTab icon={PaintBucket} titulo="Sin unidades" sub="Agrega cada departamento con «Nueva Unidad», o deja que el Asistente C4 los genere al armar el proyecto." />
                    ) : (
                      <div className="divide-y divide-slate-50 py-1">
                        {registros.map((reg) => <FilaRegistro key={reg.id} reg={reg} />)}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════ TAB: SEGURIDAD (SSOMA / G.050) ════ */}
        {tab === 'seguridad' && <SeguridadFase proyectoId={proyectoId!} fase={fase!} />}

        {tab === 'calidad' && <CalidadFase proyectoId={proyectoId!} fase={fase!} />}

        {/* ════ TAB: COLINDANTES / VECINOS ════ */}
        {tab === 'colindantes' && <ColindantesFase proyectoId={proyectoId!} />}

        {/* ════ TAB: ESTUDIO DE SUELOS (excavación) ════ */}
        {tab === 'suelos' && <SuelosFase proyectoId={proyectoId!} />}

        {/* ════ TAB: CALZADURAS (excavación) ════ */}
        {tab === 'calzaduras' && <CalzadurasFase proyectoId={proyectoId!} />}

        {/* ════ TAB: MOVIMIENTO DE TIERRAS (excavación) ════ */}
        {tab === 'tierras' && <MovimientoTierrasFase proyectoId={proyectoId!} />}

        {/* ════ TAB: METRADO Y COSTO (excavación) ════ */}
        {tab === 'metrado' && <MetradoFase proyectoId={proyectoId!} />}
        {tab === 'partidas' && <PresupuestoFase proyectoId={proyectoId!} fase={fase!} />}

        {/* ════ TAB: MONITOREO DE ASENTAMIENTOS (excavación) ════ */}
        {tab === 'monitoreo' && <MonitoreoFase proyectoId={proyectoId!} />}

        {/* ════ TAB: CONTROL DE CONCRETO (construcción) ════ */}
        {tab === 'concreto' && <ControlConcretoFase proyectoId={proyectoId!} />}

        {/* ════ TAB: CICLO DE PISO (construcción) ════ */}
        {tab === 'ciclo' && <CicloPisoFase proyectoId={proyectoId!} />}

        {/* ════ TAB: PRODUCTIVIDAD DE MANO DE OBRA ════ */}
        {tab === 'productividad' && <ProductividadFase proyectoId={proyectoId!} fase={fase!} />}

        {/* ════ TAB: DOCUMENTOS REQUERIDOS ════ */}
        {tab === 'documentos' && (
          <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Documentos y permisos requeridos</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {docsReq.length > 0
                    ? `${docsSubidos} de ${docsReq.length} listos · súbelos conforme los consigas`
                    : 'La IA arma este checklist según tu caso'}
                </p>
              </div>
              <button onClick={() => setModalDocManual({ nombre: '' })} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Agregar
              </button>
            </div>

            {docsReq.length === 0 ? (
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl px-5 py-8 text-center">
                <ShieldAlert className="w-7 h-7 text-blue-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Aún no hay checklist de documentos</p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Pídele al Asistente C4 «genera el proyecto» y armará la lista de permisos y certificados que
                  necesitas según tu caso (no-patrimonio, licencia de demolición, póliza CAR, EO-RS…).
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {docsReq.map((doc) => {
                  const subido = doc.estado === 'subido'
                  const noAplica = doc.estado === 'no_aplica'
                  return (
                    <div key={doc.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        subido ? 'bg-emerald-50' : noAplica ? 'bg-slate-100' : doc.obligatorio ? 'bg-amber-50' : 'bg-slate-50'
                      }`}>
                        {subido ? <FileCheck2 className="w-4 h-4 text-emerald-600" />
                          : noAplica ? <Circle className="w-4 h-4 text-slate-300" />
                          : <ShieldAlert className={`w-4 h-4 ${doc.obligatorio ? 'text-amber-500' : 'text-slate-400'}`} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-medium ${noAplica ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{doc.nombre}</p>
                          {doc.obligatorio
                            ? <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Obligatorio</span>
                            : <span className="text-[9px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Opcional</span>}
                        </div>
                        {doc.entidad && <p className="text-[11px] text-slate-500 mt-0.5">Emite: {doc.entidad}</p>}
                        {doc.descripcion && <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{doc.descripcion}</p>}
                        {subido && doc.notas && (
                          <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {doc.notas}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {subido ? (
                          <button onClick={() => cambiarEstadoDoc(doc, 'pendiente')} className="text-[11px] text-slate-400 hover:text-slate-700 px-2 py-1.5">
                            Reemplazar
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => pedirArchivo(doc.id)}
                              disabled={subiendoDoc === doc.id}
                              className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {subiendoDoc === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                              Subir
                            </button>
                            {!noAplica && (
                              <button onClick={() => cambiarEstadoDoc(doc, 'no_aplica')} className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1.5" title="Marcar como no aplica">
                                N/A
                              </button>
                            )}
                            {noAplica && (
                              <button onClick={() => cambiarEstadoDoc(doc, 'pendiente')} className="text-[11px] text-slate-400 hover:text-slate-600 px-2 py-1.5">
                                Restaurar
                              </button>
                            )}
                          </>
                        )}
                        <button onClick={() => eliminarDoc(doc.id)} className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════ TAB: RECURSOS (contratas + equipos) ════ */}
        {tab === 'recursos' && (
          <div className="space-y-6">
            {/* Contratas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Contratas</p>
                  <p className="text-xs text-slate-400 mt-0.5">Empresas contratadas para esta fase</p>
                </div>
                <button
                  onClick={() => setModalContrata({ tipo: 'subcontrato_obra', estado: 'activo', cobertura: 'parcial', servicios: [], equipos: [], ruc: '', costoUnitario: 0, unidad: 'm2', presupuestoTotal: 0, presupuestoAsignado: 0, contactoNombre: '', contactoTelefono: '', notas: '' })}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />Nueva Contrata
                </button>
              </div>

              {contratas.length === 0 ? (
                <EmptyTab icon={FileText} titulo="Sin contratas registradas" sub="Agrega las empresas contratadas para esta fase." />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contratas.map((c) => (
                    <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800 text-sm">{c.empresa}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{TIPOS_CONTRATA.find((t) => t.value === c.tipo)?.label ?? c.tipo}</p>
                        </div>
                        {estadoContrataBadge(c.estado)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500">Presupuesto</span>
                          <span className="font-semibold text-slate-800">{fmtSoles(c.presupuestoTotal)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${c.presupuestoTotal > 0 ? Math.min(100, (Number(c.presupuestoAsignado) / Number(c.presupuestoTotal)) * 100) : 0}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Asignado: {fmtSoles(c.presupuestoAsignado)}</span>
                        </div>
                      </div>
                      {c.contactoNombre && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="w-3 h-3" />
                          <span>{c.contactoNombre}{c.contactoTelefono ? ` — ${c.contactoTelefono}` : ''}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => setModalContrata(c)} className="flex-1 text-xs text-slate-600 border border-slate-200 py-2 rounded-xl hover:bg-slate-50 transition-colors">Ver / Editar</button>
                        <button onClick={() => eliminarContrata(c.id)} className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-red-400 border border-slate-200 rounded-xl hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Maquinaria y Equipos</p>
                  <p className="text-xs text-slate-400 mt-0.5">La IA recomienda, tú gestionas</p>
                </div>
                <button
                  onClick={() => setModalEquipo({ tipo: 'otro', estado: 'disponible', mantenimientoEstado: 'al_dia', horasTrabajadas: 0, contrataEmpresa: '', ubicacion: '', operador: '', notas: '' })}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />Agregar Equipo
                </button>
              </div>

              {equipos.length === 0 ? (
                <EmptyTab icon={Truck} titulo="Sin equipos asignados" sub="El Asistente C4 asigna la maquinaria recomendada al generar el proyecto." />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {equipos.map((e) => {
                    const EqIcon = TIPO_EQUIPO_ICON[e.tipo] ?? Wrench
                    return (
                      <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                            <EqIcon className="w-4 h-4 text-white" />
                          </div>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            e.estado === 'operativo' ? 'bg-emerald-100 text-emerald-700'
                            : e.estado === 'mantenimiento' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {e.estado === 'disponible' ? 'Recomendado' : e.estado.charAt(0).toUpperCase() + e.estado.slice(1)}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 text-sm leading-tight">{e.nombre}</p>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">{TIPOS_EQUIPO.find((t) => t.value === e.tipo)?.label ?? e.tipo}</p>
                        </div>
                        {e.notas && <p className="text-[11px] text-slate-500 leading-relaxed">{e.notas}</p>}
                        <div className="flex gap-2">
                          <button onClick={() => setModalEquipo(e)} className="flex-1 text-xs text-slate-600 border border-slate-200 py-1.5 rounded-xl hover:bg-slate-50">Editar</button>
                          <button onClick={() => eliminarEquipo(e.id)} className="w-8 flex items-center justify-center text-slate-300 hover:text-red-400 border border-slate-200 rounded-xl hover:bg-red-50">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB: PRESUPUESTO ════ */}
        {tab === 'presupuesto' && (
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Presupuesto Total', value: fmtSoles(presupuestoTotal), color: 'text-slate-900' },
                { label: 'Asignado',          value: fmtSoles(presupuestoAsignado), color: 'text-emerald-600' },
                { label: 'Pendiente',         value: fmtSoles(presupuestoTotal - presupuestoAsignado), color: 'text-amber-600' },
              ].map((k) => (
                <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">Desglose por Contrata</p>
              </div>
              {contratas.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                  <AlertCircle className="w-6 h-6 opacity-40" />
                  <p className="text-sm">Sin contratas. Agrégalas en la pestaña Recursos.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Contrata', 'Total', 'Asignado', 'Pendiente', 'Estado'].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {contratas.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{c.empresa}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{fmtSoles(c.presupuestoTotal)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">{fmtSoles(c.presupuestoAsignado)}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">{fmtSoles(Number(c.presupuestoTotal) - Number(c.presupuestoAsignado))}</td>
                        <td className="px-4 py-3">{estadoContrataBadge(c.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════ TAB: EXPEDIENTE (IA) ════ */}
        {tab === 'expediente' && (
          <div className="grid lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Expediente técnico de la fase</h2>
                </div>
                {secciones.length > 0 && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    {guardadoExp === 'guardando' ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>
                    ) : guardadoExp === 'ok' ? (
                      <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Guardado</>
                    ) : (
                      <><Sparkles className="w-3 h-3 text-blue-500" /> Generado por Asistente C4 · click en un valor para editarlo</>
                    )}
                  </span>
                )}
              </div>

              {secciones.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {secciones.map((s, i) => (
                    <SeccionBloque
                      key={i}
                      s={s}
                      onChange={(next) => setSecciones((prev) => prev.map((x, xi) => (xi === i ? next : x)))}
                    />
                  ))}
                </div>
              ) : (
                <EmptyTab icon={Sparkles} titulo="Expediente sin generar"
                  sub="Permisos, metrados, materiales y gestión de la fase se generan desde el chat. Pídele al Asistente C4: «genera el proyecto»." />
              )}
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Checklist de fase</h2>
                <span className="text-[10px] text-slate-400">{completadasT}/{tareas.length}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {tareas.map((tarea) => (
                  <div key={tarea.id} className="flex items-center gap-2.5 px-5 py-3 hover:bg-slate-50 transition-colors group">
                    <button onClick={() => avanzarEstado(tarea)} className="shrink-0" title="Cambiar estado">
                      {guardandoTarea === tarea.id
                        ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        : tarea.estado === 'completada'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : tarea.estado === 'en_proceso'
                            ? <Clock className="w-4 h-4 text-blue-500" />
                            : <Circle className="w-4 h-4 text-slate-300" />
                      }
                    </button>
                    <span className={`text-xs flex-1 leading-relaxed ${tarea.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {tarea.texto}
                    </span>
                    <button
                      onClick={() => eliminarTarea(tarea.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-all p-0.5 rounded shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-slate-100">
                {agregando ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={nuevaTarea}
                      onChange={(e) => setNuevaTarea(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') agregarTarea()
                        if (e.key === 'Escape') { setAgregando(false); setNuevaTarea('') }
                      }}
                      placeholder="Nueva tarea..."
                      className="flex-1 text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button onClick={agregarTarea} className="text-[11px] bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                      Agregar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAgregando(true)}
                    className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-700 transition-colors font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar tarea
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: ETAPA ── */}
      <AppDialog open={modalEtapa !== null} onClose={() => setModalEtapa(null)} title={modalEtapa?.key ? 'Editar etapa' : 'Nueva etapa'}>
        {modalEtapa && (
          <div className="space-y-4">
            <Field label="Nombre de la etapa">
              <input className={inputCls} value={modalEtapa.nombre} autoFocus
                onChange={(e) => setModalEtapa((p) => ({ ...p!, nombre: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') guardarEtapa() }}
                placeholder="Ej: Demolición estructural" />
            </Field>
            <Field label="Descripción (opcional)">
              <textarea className={inputCls} rows={2} value={modalEtapa.descripcion}
                onChange={(e) => setModalEtapa((p) => ({ ...p!, descripcion: e.target.value }))}
                placeholder="Qué abarca esta etapa, normativa, alcance..." />
            </Field>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalEtapa(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={guardarEtapa} disabled={!modalEtapa.nombre.trim()} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50">
                {modalEtapa.key ? 'Guardar' : 'Crear etapa'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* ── DIÁLOGO: ELIMINAR ETAPA ── */}
      <AppDialog open={confirmDelEtapa !== null} onClose={() => setConfirmDelEtapa(null)} title="Eliminar etapa">
        <p className="text-sm text-slate-600">
          ¿Seguro que quieres eliminar la etapa <b className="text-slate-900">{confirmDelEtapa?.nombre}</b>?
        </p>
        <p className="text-xs text-slate-400 mt-2">Las actividades no se borran: quedan sin etapa y puedes reasignarlas.</p>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setConfirmDelEtapa(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button
            onClick={() => { if (confirmDelEtapa) eliminarEtapa(confirmDelEtapa.key); setConfirmDelEtapa(null) }}
            className="flex-1 text-sm font-medium text-white bg-red-500 hover:bg-red-600 py-2.5 rounded-xl transition-colors"
          >
            Eliminar etapa
          </button>
        </div>
      </AppDialog>

      {/* ── DIÁLOGO: AGREGAR DOCUMENTO MANUAL ── */}
      <AppDialog open={modalDocManual !== null} onClose={() => setModalDocManual(null)} title="Agregar documento requerido">
        <Field label="Nombre del documento">
          <input
            className={inputCls} autoFocus value={modalDocManual?.nombre ?? ''}
            onChange={(e) => setModalDocManual({ nombre: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') guardarDocManual() }}
            placeholder="Ej: Licencia de demolición (FUE)"
          />
        </Field>
        <div className="flex gap-2 mt-6">
          <button onClick={() => setModalDocManual(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
          <button
            onClick={guardarDocManual} disabled={!modalDocManual?.nombre.trim() || guardandoDocManual}
            className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardandoDocManual ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Agregar
          </button>
        </div>
      </AppDialog>

      {/* ── MODAL: REGISTRO ── */}
      <AppDialog open={modalReg !== null} onClose={() => setModalReg(null)} title={modalReg?.id ? `Editar ${esquema.singular}` : esquema.nuevoLabel} wide>
        {modalReg && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={esquema.nombreLabel}>
                <input className={inputCls} value={modalReg.nombre ?? ''} autoFocus
                  onChange={(e) => setModalReg((p) => ({ ...p!, nombre: e.target.value }))}
                  placeholder={esquema.nombrePlaceholder} />
              </Field>
              <Field label="Estado">
                <select className={inputCls} value={modalReg.estado ?? esquema.estados[0]}
                  onChange={(e) => setModalReg((p) => ({ ...p!, estado: e.target.value }))}>
                  {esquema.estados.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
            </div>

            {esquema.conEtapaEnForm && (
              <Field label="Etapa de obra">
                <select className={inputCls} value={modalReg.datos?.etapa ?? etapas[0]?.key}
                  onChange={(e) => setModalReg((p) => ({ ...p!, datos: { ...p!.datos, etapa: e.target.value } }))}>
                  {etapas.map((et) => <option key={et.key} value={et.key}>{et.nombre}</option>)}
                </select>
              </Field>
            )}

            {esquema.secciones.map((sec) => (
              <div key={sec.label}>
                <div className="flex items-center gap-2 pt-1 pb-2 border-b border-slate-100 mb-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{sec.label}</p>
                </div>
                <div className={sec.campos.some((c) => c.tipo === 'textarea') ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                  {sec.campos.map((c: CampoRegistro) => (
                    <Field key={c.key} label={c.unidad ? `${c.label} (${c.unidad})` : c.label}>
                      {c.tipo === 'select' ? (
                        <select className={inputCls} value={modalReg.datos?.[c.key] ?? ''}
                          onChange={(e) => setModalReg((p) => ({ ...p!, datos: { ...p!.datos, [c.key]: e.target.value } }))}>
                          <option value="">—</option>
                          {(c.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : c.tipo === 'textarea' ? (
                        <textarea className={inputCls} rows={2} value={modalReg.datos?.[c.key] ?? ''}
                          onChange={(e) => setModalReg((p) => ({ ...p!, datos: { ...p!.datos, [c.key]: e.target.value } }))}
                          placeholder={c.placeholder} />
                      ) : (
                        <input
                          type={c.tipo === 'number' ? 'number' : c.tipo === 'date' ? 'date' : 'text'}
                          step={c.tipo === 'number' ? '0.01' : undefined}
                          className={inputCls}
                          value={modalReg.datos?.[c.key] ?? ''}
                          onChange={(e) => setModalReg((p) => ({
                            ...p!,
                            datos: { ...p!.datos, [c.key]: c.tipo === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value },
                          }))}
                          placeholder={c.placeholder}
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalReg(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarRegistro} disabled={guardandoReg || !modalReg.nombre?.trim()}
                className="flex-1 text-sm bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoReg ? 'Guardando...' : (modalReg.id ? 'Guardar Cambios' : 'Crear')}
              </button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* ── MODAL: CONTRATA ── */}
      <AppDialog open={modalContrata !== null} onClose={() => setModalContrata(null)} title={modalContrata?.id ? 'Editar Contrata' : 'Nueva Contrata'}>
        {modalContrata && (
          <div className="space-y-4">
            <Field label="Empresa">
              <input className={inputCls} value={modalContrata.empresa ?? ''} onChange={(e) => setModalContrata((p) => ({ ...p!, empresa: e.target.value }))} placeholder="Ej: Constructora Los Andes SAC" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="RUC">
                <input className={inputCls} value={modalContrata.ruc ?? ''} onChange={(e) => setModalContrata((p) => ({ ...p!, ruc: e.target.value }))} placeholder="20123456789" />
              </Field>
              <Field label="Costo unitario (S/)">
                <input type="number" className={inputCls} value={modalContrata.costoUnitario ?? 0} onChange={(e) => setModalContrata((p) => ({ ...p!, costoUnitario: Number(e.target.value) }))} placeholder="0" />
              </Field>
              <Field label="Unidad del costo">
                <select className={inputCls} value={modalContrata.unidad ?? 'm2'} onChange={(e) => setModalContrata((p) => ({ ...p!, unidad: e.target.value }))}>
                  <option value="m2">por m² (encofrado, muro…)</option>
                  <option value="ml">por ml (metro lineal)</option>
                  <option value="kg">por kg (acero)</option>
                  <option value="m3">por m³ (cubo, concreto)</option>
                  <option value="glb">global (glb)</option>
                  <option value="und">por unidad (und)</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo de servicio">
                <select className={inputCls} value={modalContrata.tipo ?? 'otro'} onChange={(e) => setModalContrata((p) => ({ ...p!, tipo: e.target.value }))}>
                  {TIPOS_CONTRATA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select className={inputCls} value={modalContrata.estado ?? 'activo'} onChange={(e) => setModalContrata((p) => ({ ...p!, estado: e.target.value }))}>
                  <option value="activo">Activo</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </Field>
            </div>
            <Field label="Servicios (separados por coma)">
              <input className={inputCls} value={(modalContrata.servicios ?? []).join(', ')} onChange={(e) => setModalContrata((p) => ({ ...p!, servicios: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))} placeholder="Encofrado, Vaciado de concreto" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Presupuesto total (S/)">
                <input type="number" className={inputCls} value={modalContrata.presupuestoTotal ?? 0} onChange={(e) => setModalContrata((p) => ({ ...p!, presupuestoTotal: Number(e.target.value) }))} />
              </Field>
              <Field label="Monto asignado (S/)">
                <input type="number" className={inputCls} value={modalContrata.presupuestoAsignado ?? 0} onChange={(e) => setModalContrata((p) => ({ ...p!, presupuestoAsignado: Number(e.target.value) }))} />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Contacto">
                <input className={inputCls} value={modalContrata.contactoNombre ?? ''} onChange={(e) => setModalContrata((p) => ({ ...p!, contactoNombre: e.target.value }))} placeholder="Nombre del responsable" />
              </Field>
              <Field label="Teléfono">
                <input className={inputCls} value={modalContrata.contactoTelefono ?? ''} onChange={(e) => setModalContrata((p) => ({ ...p!, contactoTelefono: e.target.value }))} placeholder="999 888 777" />
              </Field>
            </div>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={modalContrata.notas ?? ''} onChange={(e) => setModalContrata((p) => ({ ...p!, notas: e.target.value }))} />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalContrata(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarContrata} disabled={guardandoContrata} className="flex-1 text-sm bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoContrata ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>

      {/* ── MODAL: EQUIPO ── */}
      <AppDialog open={modalEquipo !== null} onClose={() => setModalEquipo(null)} title={modalEquipo?.id ? 'Editar Equipo' : 'Nuevo Equipo'}>
        {modalEquipo && (
          <div className="space-y-4">
            <Field label="Nombre del equipo">
              <input className={inputCls} value={modalEquipo.nombre ?? ''} onChange={(e) => setModalEquipo((p) => ({ ...p!, nombre: e.target.value }))} placeholder="Ej: Grúa torre Potain MC85B" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls} value={modalEquipo.tipo ?? 'otro'} onChange={(e) => setModalEquipo((p) => ({ ...p!, tipo: e.target.value }))}>
                  {TIPOS_EQUIPO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select className={inputCls} value={modalEquipo.estado ?? 'disponible'} onChange={(e) => setModalEquipo((p) => ({ ...p!, estado: e.target.value }))}>
                  <option value="disponible">Recomendado / Disponible</option>
                  <option value="operativo">Operativo en obra</option>
                  <option value="mantenimiento">En mantenimiento</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Empresa contratista">
                <input className={inputCls} value={modalEquipo.contrataEmpresa ?? ''} onChange={(e) => setModalEquipo((p) => ({ ...p!, contrataEmpresa: e.target.value }))} />
              </Field>
              <Field label="Operador">
                <input className={inputCls} value={modalEquipo.operador ?? ''} onChange={(e) => setModalEquipo((p) => ({ ...p!, operador: e.target.value }))} />
              </Field>
            </div>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={modalEquipo.notas ?? ''} onChange={(e) => setModalEquipo((p) => ({ ...p!, notas: e.target.value }))} placeholder="Justificación, costo de alquiler..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalEquipo(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarEquipo} disabled={guardandoEquipo} className="flex-1 text-sm bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoEquipo ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </AppDialog>
    </div>
  )
}
