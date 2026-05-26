import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  HardHat, FileText, Truck, DollarSign, BarChart2,
  Plus, Trash2, Phone, Wrench, AlertCircle, Loader2,
  MapPin, Calendar, User, Layers, ChevronRight,
  ClipboardList, Settings2, Globe, CalendarDays, Activity,
  type LucideIcon,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import AppDialog from '../components/AppDialog'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ExcavacionReg {
  id: string
  nombre: string
  areaTotalM2: number; profundidadTotalM: number; volumenTotalM3: number
  longitudTotalM: number; anchoPromedioM: number; cotaReferenciaMsnm: number
  tipoExcavacion: string; clasificacionTerreno: string
  metodoExcavacion: string; turnoTrabajo: string
  nivelFreatico: number; coordUtmNorte: number; coordUtmEste: number; pendienteNatural: number
  fechaInicio: string; fechaFinEstimada: string; duracionEstimadaDias: number
  ingenieroResponsable: string; residenteObra: string; supervisorSeguridad: string
  estado: string; observaciones: string
}

interface Contrata {
  id: string; empresa: string; tipo: string; servicios: string[]; equipos: string[]
  presupuestoTotal: number; presupuestoAsignado: number
  contactoNombre: string; contactoTelefono: string
  estado: string; cobertura: string; notas: string
}
interface Equipo {
  id: string; nombre: string; tipo: string; estado: string
  contrataEmpresa: string; ubicacion: string; operador: string
  horasTrabajadas: number; mantenimientoEstado: string; notas: string
}

// ─── Opciones de selects ──────────────────────────────────────────────────────

const TIPOS_EXCAVACION = [
  'Zanja', 'Masiva a Cielo Abierto', 'Puntual / Apique', 'Talud', 'Subterránea / Túnel',
]
const CLASIFICACIONES_TERRENO = [
  'Roca Dura', 'Roca Blanda', 'Suelo Cohesivo Duro', 'Suelo Cohesivo Blando',
  'Suelo Granular Grueso', 'Suelo Granular Fino', 'Material Orgánico',
]
const METODOS_EXCAVACION = [
  'Excavadora Hidráulica', 'Retroexcavadora', 'Perfiladora / Zanjadora',
  'Manual', 'Mixto (Mecánico + Manual)', 'Explosivos',
]
const TURNOS_TRABAJO = [
  'Diurno (6am-6pm)', 'Nocturno (6pm-6am)', 'Continuo (24h)', 'Doble Turno',
]
const ESTADOS_EXCAVACION = [
  'Planificada', 'En Progreso', 'Pausada', 'Completada', 'Cancelada',
]

const TABS = [
  { key: 'excavaciones', label: 'Excavaciones', icon: HardHat },
  { key: 'contratas',    label: 'Contratas',    icon: FileText },
  { key: 'equipos',      label: 'Equipos',      icon: Truck },
  { key: 'presupuesto',  label: 'Presupuesto',  icon: DollarSign },
  { key: 'analisis',     label: 'Análisis',     icon: BarChart2 },
]

const TIPOS_CONTRATA = [
  { value: 'excavacion_eliminacion', label: 'Excavación y Eliminación' },
  { value: 'alquiler_maquinaria',    label: 'Alquiler de Maquinaria' },
  { value: 'transporte',             label: 'Transporte' },
  { value: 'otro',                   label: 'Otro' },
]
const TIPOS_EQUIPO = [
  { value: 'excavadora',      label: 'Excavadora' },
  { value: 'mini_excavadora', label: 'Mini Excavadora' },
  { value: 'camion',          label: 'Camión' },
  { value: 'compactadora',    label: 'Compactadora' },
  { value: 'otro',            label: 'Otro' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSoles(n: number) {
  return `S/ ${Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
}

function fmtNum(n: number | undefined, dec = 2) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('es-PE', { maximumFractionDigits: dec })
}

function estadoExcBadge(estado: string) {
  const map: Record<string, string> = {
    'Planificada':  'bg-slate-100 text-slate-600',
    'En Progreso':  'bg-orange-100 text-orange-700',
    'Pausada':      'bg-amber-100 text-amber-700',
    'Completada':   'bg-green-100 text-green-700',
    'Cancelada':    'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {estado}
    </span>
  )
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    activo:     'bg-green-100 text-green-700',
    pendiente:  'bg-amber-100 text-amber-700',
    completado: 'bg-blue-100 text-blue-700',
    cancelado:  'bg-red-100 text-red-600',
  }
  const labels: Record<string, string> = {
    activo: 'Activo', pendiente: 'Pendiente', completado: 'Completado', cancelado: 'Cancelado',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {labels[estado] ?? estado}
    </span>
  )
}

function equipoEstadoBadge(estado: string) {
  const map: Record<string, string> = {
    operativo:     'bg-green-100 text-green-700',
    mantenimiento: 'bg-red-100 text-red-600',
    disponible:    'bg-blue-100 text-blue-700',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {estado === 'operativo' ? 'Operativo' : estado === 'mantenimiento' ? 'Mantenimiento' : 'Disponible'}
    </span>
  )
}

// ─── Componentes UI ───────────────────────────────────────────────────────────


function SectionHeader({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 border-b border-slate-100">
      <Icon className="w-3.5 h-3.5 text-slate-400" />
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</p>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
const EMPTY_EXC: Partial<ExcavacionReg> = {
  nombre: '', estado: 'Planificada',
  tipoExcavacion: '', clasificacionTerreno: '', metodoExcavacion: '', turnoTrabajo: '',
  fechaInicio: '', fechaFinEstimada: '', ingenieroResponsable: '', residenteObra: '', supervisorSeguridad: '',
  observaciones: '',
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExcavacionPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [tab, setTab] = useState('excavaciones')

  // Excavaciones registro
  const [excavaciones, setExcavaciones] = useState<ExcavacionReg[]>([])
  const [loadingExc, setLoadingExc] = useState(true)
  const [modalExc, setModalExc] = useState<Partial<ExcavacionReg> | null>(null)
  const [guardandoExc, setGuardandoExc] = useState(false)

  // Contratas
  const [contratas, setContratas] = useState<Contrata[]>([])
  const [loadingContratas, setLoadingContratas] = useState(true)
  const [modalContrata, setModalContrata] = useState<Partial<Contrata> | null>(null)
  const [guardandoContrata, setGuardandoContrata] = useState(false)

  // Equipos
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loadingEquipos, setLoadingEquipos] = useState(true)
  const [modalEquipo, setModalEquipo] = useState<Partial<Equipo> | null>(null)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  useEffect(() => {
    if (!proyectoId) return
    fetch(`${API_BASE}/excavacion-registros/${proyectoId}`, { headers })
      .then(r => r.json()).then(setExcavaciones).catch(() => {}).finally(() => setLoadingExc(false))
    fetch(`${API_BASE}/contratas-fase/${proyectoId}/excavacion`, { headers })
      .then(r => r.json()).then(setContratas).catch(() => {}).finally(() => setLoadingContratas(false))
    fetch(`${API_BASE}/equipos-fase/${proyectoId}/excavacion`, { headers })
      .then(r => r.json()).then(setEquipos).catch(() => {}).finally(() => setLoadingEquipos(false))
  }, [proyectoId])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const completadas = excavaciones.filter(e => e.estado === 'Completada').length
  const avance = excavaciones.length ? Math.round((completadas / excavaciones.length) * 100) : 0
  const totalM3 = excavaciones.reduce((s, e) => s + (Number(e.volumenTotalM3) || 0), 0)
  const contratosActivos = contratas.filter(c => c.estado === 'activo').length
  const equiposOperativos = equipos.filter(e => e.estado === 'operativo').length
  const presupuestoTotal = contratas.reduce((s, c) => s + Number(c.presupuestoTotal), 0)
  const presupuestoAsignado = contratas.reduce((s, c) => s + Number(c.presupuestoAsignado), 0)
  const avancePresupuestal = presupuestoTotal > 0 ? Math.round((presupuestoAsignado / presupuestoTotal) * 100) : 0

  // ── Excavaciones CRUD ─────────────────────────────────────────────────────
  async function guardarExcavacion() {
    if (!modalExc?.nombre?.trim()) return
    setGuardandoExc(true)
    try {
      const isNew = !modalExc.id
      const url = isNew
        ? `${API_BASE}/excavacion-registros/${proyectoId}`
        : `${API_BASE}/excavacion-registros/${modalExc.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalExc) })
      const saved = await r.json()
      setExcavaciones(prev => isNew ? [...prev, saved] : prev.map(e => e.id === saved.id ? saved : e))
      setModalExc(null)
    } finally { setGuardandoExc(false) }
  }

  async function eliminarExcavacion(id: string) {
    setExcavaciones(prev => prev.filter(e => e.id !== id))
    await fetch(`${API_BASE}/excavacion-registros/${id}`, { method: 'DELETE', headers })
  }

  // ── Contratas CRUD ────────────────────────────────────────────────────────
  async function guardarContrata() {
    if (!modalContrata?.empresa?.trim()) return
    setGuardandoContrata(true)
    try {
      const isNew = !modalContrata.id
      const url = isNew ? `${API_BASE}/contratas-fase/${proyectoId}/excavacion` : `${API_BASE}/contratas-fase/${modalContrata.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalContrata) })
      const saved = await r.json()
      setContratas(prev => isNew ? [...prev, saved] : prev.map(c => c.id === saved.id ? saved : c))
      setModalContrata(null)
    } finally { setGuardandoContrata(false) }
  }

  async function eliminarContrata(id: string) {
    setContratas(prev => prev.filter(c => c.id !== id))
    await fetch(`${API_BASE}/contratas-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Equipos CRUD ──────────────────────────────────────────────────────────
  async function guardarEquipo() {
    if (!modalEquipo?.nombre?.trim()) return
    setGuardandoEquipo(true)
    try {
      const isNew = !modalEquipo.id
      const url = isNew ? `${API_BASE}/equipos-fase/${proyectoId}/excavacion` : `${API_BASE}/equipos-fase/${modalEquipo.id}`
      const r = await fetch(url, { method: isNew ? 'POST' : 'PATCH', headers, body: JSON.stringify(modalEquipo) })
      const saved = await r.json()
      setEquipos(prev => isNew ? [...prev, saved] : prev.map(e => e.id === saved.id ? saved : e))
      setModalEquipo(null)
    } finally { setGuardandoEquipo(false) }
  }

  async function cambiarEstadoEquipo(equipo: Equipo, nuevo: string) {
    setEquipos(prev => prev.map(e => e.id === equipo.id ? { ...e, estado: nuevo } : e))
    await fetch(`${API_BASE}/equipos-fase/${equipo.id}`, { method: 'PATCH', headers, body: JSON.stringify({ estado: nuevo }) })
  }

  async function eliminarEquipo(id: string) {
    setEquipos(prev => prev.filter(e => e.id !== id))
    await fetch(`${API_BASE}/equipos-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold">Excavación</h1>
            <p className="text-xs text-orange-100">Movimiento de tierras, sótanos y calzaduras</p>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Avance obra',        value: `${avance}%` },
            { label: 'Vol. total m³',      value: totalM3 > 0 ? `${fmtNum(totalM3, 0)} m³` : '—' },
            { label: 'Contratas activas',  value: String(contratosActivos) },
            { label: 'Equipos operativos', value: `${equiposOperativos}/${equipos.length}` },
            { label: 'Avance presup.',     value: `${avancePresupuestal}%` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/15 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-orange-100 mb-0.5">{kpi.label}</p>
              <p className="text-sm font-bold">{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-orange-100">
        <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${avance}%` }} />
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-medium border-b-2 transition-colors ${
                tab === key ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6">

        {/* ── TAB: EXCAVACIONES ── */}
        {tab === 'excavaciones' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Registro de Excavaciones</p>
                <p className="text-xs text-slate-400 mt-0.5">Sectores, zanjas y excavaciones del proyecto</p>
              </div>
              <button
                onClick={() => setModalExc({ ...EMPTY_EXC })}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />Nueva Excavación
              </button>
            </div>

            {loadingExc ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando...</span>
              </div>
            ) : excavaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <HardHat className="w-10 h-10 opacity-30" />
                <p className="text-sm">Sin excavaciones registradas</p>
                <p className="text-xs">Registra los sectores y zonas de excavación del proyecto</p>
              </div>
            ) : (
              <div className="space-y-3">
                {excavaciones.map(exc => (
                  <div key={exc.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 mt-0.5">
                          <Layers className="w-4 h-4 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-slate-800">{exc.nombre}</p>
                            {estadoExcBadge(exc.estado)}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                            {exc.tipoExcavacion && (
                              <span className="text-xs text-slate-500">{exc.tipoExcavacion}</span>
                            )}
                            {exc.clasificacionTerreno && (
                              <span className="text-xs text-slate-400">· {exc.clasificacionTerreno}</span>
                            )}
                            {exc.metodoExcavacion && (
                              <span className="text-xs text-slate-400">· {exc.metodoExcavacion}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setModalExc(exc)} className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 flex items-center gap-1">
                          <span>Editar</span><ChevronRight className="w-3 h-3" />
                        </button>
                        <button onClick={() => eliminarExcavacion(exc.id)} className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 border border-slate-200 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="grid grid-cols-4 gap-3 mt-4">
                      {[
                        { label: 'Área total', value: exc.areaTotalM2 ? `${fmtNum(exc.areaTotalM2)} m²` : '—' },
                        { label: 'Profundidad', value: exc.profundidadTotalM ? `${fmtNum(exc.profundidadTotalM)} m` : '—' },
                        { label: 'Volumen total', value: exc.volumenTotalM3 ? `${fmtNum(exc.volumenTotalM3, 0)} m³` : '—' },
                        { label: 'Nivel freático', value: exc.nivelFreatico ? `${fmtNum(exc.nivelFreatico)} m` : '—' },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2">
                          <p className="text-[10px] text-slate-400 mb-0.5">{m.label}</p>
                          <p className="text-sm font-semibold text-slate-700">{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Pie de tarjeta */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                      {exc.ingenieroResponsable && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <User className="w-3 h-3" /><span>{exc.ingenieroResponsable}</span>
                        </div>
                      )}
                      {exc.fechaInicio && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" /><span>Inicio: {exc.fechaInicio}</span>
                        </div>
                      )}
                      {exc.coordUtmNorte && exc.coordUtmEste && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3 h-3" />
                          <span>N {fmtNum(exc.coordUtmNorte, 2)} / E {fmtNum(exc.coordUtmEste, 2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: CONTRATAS ── */}
        {tab === 'contratas' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Gestión de Contratas</p>
                <p className="text-xs text-slate-400 mt-0.5">Empresas contratadas para excavación, eliminación y maquinaria</p>
              </div>
              <button
                onClick={() => setModalContrata({ tipo: 'excavacion_eliminacion', estado: 'activo', cobertura: 'parcial', servicios: [], equipos: [], presupuestoTotal: 0, presupuestoAsignado: 0, contactoNombre: '', contactoTelefono: '', notas: '' })}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />Nueva Contrata
              </button>
            </div>

            {loadingContratas ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando...</span>
              </div>
            ) : contratas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <FileText className="w-10 h-10 opacity-30" />
                <p className="text-sm">Sin contratas registradas</p>
                <p className="text-xs">Agrega las empresas contratadas para este trabajo</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {contratas.map(c => (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800">{c.empresa}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{TIPOS_CONTRATA.find(t => t.value === c.tipo)?.label ?? c.tipo}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {estadoBadge(c.estado)}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c.cobertura === 'completa' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                          {c.cobertura === 'completa' ? 'Completa' : 'Parcial'}
                        </span>
                      </div>
                    </div>
                    {c.servicios?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium mb-1">Servicios</p>
                        <div className="flex flex-wrap gap-1">
                          {c.servicios.map(s => <span key={s} className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">{s}</span>)}
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Presupuesto</span>
                        <span className="font-semibold text-slate-800">{fmtSoles(c.presupuestoTotal)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${c.presupuestoTotal > 0 ? Math.min(100, (Number(c.presupuestoAsignado) / Number(c.presupuestoTotal)) * 100) : 0}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Asignado: {fmtSoles(c.presupuestoAsignado)}</span>
                        <span>{c.presupuestoTotal > 0 ? Math.round((Number(c.presupuestoAsignado) / Number(c.presupuestoTotal)) * 100) : 0}%</span>
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
        )}

        {/* ── TAB: EQUIPOS ── */}
        {tab === 'equipos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">Control de Equipos</p>
                <p className="text-xs text-slate-400 mt-0.5">Maquinaria asignada al proyecto</p>
              </div>
              <button
                onClick={() => setModalEquipo({ tipo: 'excavadora', estado: 'disponible', mantenimientoEstado: 'al_dia', horasTrabajadas: 0, contrataEmpresa: '', ubicacion: '', operador: '', notas: '' })}
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />Agregar Equipo
              </button>
            </div>

            {loadingEquipos ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando...</span>
              </div>
            ) : equipos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                <Truck className="w-10 h-10 opacity-30" />
                <p className="text-sm">Sin equipos registrados</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {equipos.map(e => (
                  <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-orange-500" />
                      </div>
                      {equipoEstadoBadge(e.estado)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{e.nombre}</p>
                      <p className="text-xs text-slate-400">{TIPOS_EQUIPO.find(t => t.value === e.tipo)?.label ?? e.tipo}</p>
                    </div>
                    <div className="space-y-1 text-xs text-slate-500">
                      {e.contrataEmpresa && <p>Contrata: <span className="text-slate-700">{e.contrataEmpresa}</span></p>}
                      {e.ubicacion && <p>Ubicación: <span className="text-slate-700">{e.ubicacion}</span></p>}
                      {e.operador && <p>Operador: <span className="text-slate-700">{e.operador}</span></p>}
                      <p>Horas: <span className="text-slate-700 font-medium">{e.horasTrabajadas}h</span></p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-slate-400" />
                      <span className={`text-[10px] font-medium ${e.mantenimientoEstado === 'al_dia' ? 'text-green-600' : e.mantenimientoEstado === 'en_proceso' ? 'text-amber-600' : 'text-red-500'}`}>
                        {e.mantenimientoEstado === 'al_dia' ? 'Mantenimiento al día' : e.mantenimientoEstado === 'en_proceso' ? 'Mantenimiento en proceso' : 'Mantenimiento pendiente'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {(['operativo', 'mantenimiento', 'disponible'] as const).map(st => (
                        <button key={st} onClick={() => cambiarEstadoEquipo(e, st)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors ${e.estado === st ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                          {st === 'operativo' ? 'Op.' : st === 'mantenimiento' ? 'Mant.' : 'Disp.'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setModalEquipo(e)} className="flex-1 text-xs text-slate-600 border border-slate-200 py-1.5 rounded-xl hover:bg-slate-50">Editar</button>
                      <button onClick={() => eliminarEquipo(e.id)} className="w-8 flex items-center justify-center text-slate-300 hover:text-red-400 border border-slate-200 rounded-xl hover:bg-red-50">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PRESUPUESTO ── */}
        {tab === 'presupuesto' && (
          <div className="max-w-2xl space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Presupuesto Total', value: fmtSoles(presupuestoTotal), color: 'text-slate-800' },
                { label: 'Asignado',          value: fmtSoles(presupuestoAsignado), color: 'text-green-600' },
                { label: 'Pendiente',         value: fmtSoles(presupuestoTotal - presupuestoAsignado), color: 'text-amber-600' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Avance presupuestal</span>
                <span className="font-semibold text-slate-700">{avancePresupuestal}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${avancePresupuestal}%` }} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-700">Desglose por Contrata</p>
              </div>
              {contratas.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-slate-400 gap-2">
                  <AlertCircle className="w-6 h-6 opacity-40" />
                  <p className="text-sm">Sin contratas. Agrégalas en la pestaña Contratas.</p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Contrata', 'Tipo', 'Total', 'Asignado', 'Pendiente', 'Estado'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {contratas.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{c.empresa}</td>
                        <td className="px-4 py-3 text-slate-500">{TIPOS_CONTRATA.find(t => t.value === c.tipo)?.label ?? c.tipo}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{fmtSoles(c.presupuestoTotal)}</td>
                        <td className="px-4 py-3 text-green-600 font-medium">{fmtSoles(c.presupuestoAsignado)}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">{fmtSoles(Number(c.presupuestoTotal) - Number(c.presupuestoAsignado))}</td>
                        <td className="px-4 py-3">{estadoBadge(c.estado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ANÁLISIS ── */}
        {tab === 'analisis' && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <BarChart2 className="w-12 h-12 opacity-30" />
            <p className="text-sm font-medium text-slate-500">Análisis de excavación</p>
            <p className="text-xs text-center max-w-xs">Próximamente: rendimiento por sector, avance vs. cronograma, consumo de horas máquina.</p>
          </div>
        )}
      </div>

      {/* ── MODAL: REGISTRAR / EDITAR EXCAVACIÓN ── */}
      <AppDialog open={modalExc !== null} onClose={() => setModalExc(null)} title={modalExc?.id ? 'Editar Excavación' : 'Registrar Nueva Excavación'} wide>
        {modalExc && <div className="space-y-5">

            <SectionHeader icon={ClipboardList} label="Información General" />
            <div className="space-y-3">
              <Field label="Nombre / Código de Excavación" required>
                <input className={inputCls} value={modalExc.nombre ?? ''} onChange={e => setModalExc(p => ({ ...p!, nombre: e.target.value }))} placeholder="Ej: EXC-001-SOTANO" />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Área Total (m²)" required>
                  <input type="number" step="0.01" className={inputCls} value={modalExc.areaTotalM2 ?? ''}
                    onChange={e => {
                      const area = Number(e.target.value)
                      const prof = modalExc.profundidadTotalM
                      setModalExc(p => ({ ...p!, areaTotalM2: area, volumenTotalM3: prof ? Number((area * prof).toFixed(2)) : p!.volumenTotalM3 }))
                    }} placeholder="1500.00" />
                </Field>
                <Field label="Profundidad Total (m)" required>
                  <input type="number" step="0.01" className={inputCls} value={modalExc.profundidadTotalM ?? ''}
                    onChange={e => {
                      const prof = Number(e.target.value)
                      const area = modalExc.areaTotalM2
                      setModalExc(p => ({ ...p!, profundidadTotalM: prof, volumenTotalM3: area ? Number((area * prof).toFixed(2)) : p!.volumenTotalM3 }))
                    }} placeholder="12.50" />
                </Field>
                <Field label="Volumen Total (m³)" required>
                  <input type="number" step="0.01" className={inputCls} value={modalExc.volumenTotalM3 ?? ''} onChange={e => setModalExc(p => ({ ...p!, volumenTotalM3: Number(e.target.value) }))} placeholder="18750.00" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Longitud Total (m)">
                  <input type="number" step="0.01" className={inputCls} value={modalExc.longitudTotalM ?? ''} onChange={e => setModalExc(p => ({ ...p!, longitudTotalM: Number(e.target.value) }))} placeholder="75.00" />
                </Field>
                <Field label="Ancho Promedio (m)">
                  <input type="number" step="0.01" className={inputCls} value={modalExc.anchoPromedioM ?? ''} onChange={e => setModalExc(p => ({ ...p!, anchoPromedioM: Number(e.target.value) }))} placeholder="20.00" />
                </Field>
                <Field label="Cota de Referencia (m.s.n.m.)">
                  <input type="number" step="0.01" className={inputCls} value={modalExc.cotaReferenciaMsnm ?? ''} onChange={e => setModalExc(p => ({ ...p!, cotaReferenciaMsnm: Number(e.target.value) }))} placeholder="2245.50" />
                </Field>
              </div>
            </div>

            <SectionHeader icon={Settings2} label="Características Técnicas" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de Excavación" required>
                <select className={inputCls} value={modalExc.tipoExcavacion ?? ''} onChange={e => setModalExc(p => ({ ...p!, tipoExcavacion: e.target.value }))}>
                  <option value="">-- Seleccione el tipo --</option>
                  {TIPOS_EXCAVACION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Clasificación del Terreno" required>
                <select className={inputCls} value={modalExc.clasificacionTerreno ?? ''} onChange={e => setModalExc(p => ({ ...p!, clasificacionTerreno: e.target.value }))}>
                  <option value="">-- Seleccione la clasificación --</option>
                  {CLASIFICACIONES_TERRENO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Método de Excavación" required>
                <select className={inputCls} value={modalExc.metodoExcavacion ?? ''} onChange={e => setModalExc(p => ({ ...p!, metodoExcavacion: e.target.value }))}>
                  <option value="">-- Seleccione el método --</option>
                  {METODOS_EXCAVACION.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Turno de Trabajo">
                <select className={inputCls} value={modalExc.turnoTrabajo ?? ''} onChange={e => setModalExc(p => ({ ...p!, turnoTrabajo: e.target.value }))}>
                  <option value="">-- Seleccione turno --</option>
                  {TURNOS_TRABAJO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            <SectionHeader icon={Globe} label="Condiciones Geológicas y Ambientales" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nivel Freático (m)">
                <input type="number" step="0.01" className={inputCls} value={modalExc.nivelFreatico ?? ''} onChange={e => setModalExc(p => ({ ...p!, nivelFreatico: Number(e.target.value) }))} placeholder="3.50" />
              </Field>
              <Field label="Pendiente Natural del Terreno (%)">
                <input type="number" step="0.1" className={inputCls} value={modalExc.pendienteNatural ?? ''} onChange={e => setModalExc(p => ({ ...p!, pendienteNatural: Number(e.target.value) }))} placeholder="2.5" />
              </Field>
              <Field label="Coordenada UTM Norte">
                <input type="number" step="0.01" className={inputCls} value={modalExc.coordUtmNorte ?? ''} onChange={e => setModalExc(p => ({ ...p!, coordUtmNorte: Number(e.target.value) }))} placeholder="8668542.15" />
              </Field>
              <Field label="Coordenada UTM Este">
                <input type="number" step="0.01" className={inputCls} value={modalExc.coordUtmEste ?? ''} onChange={e => setModalExc(p => ({ ...p!, coordUtmEste: Number(e.target.value) }))} placeholder="287543.89" />
              </Field>
            </div>

            <SectionHeader icon={CalendarDays} label="Planificación y Equipo Responsable" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de Inicio" required>
                <input type="date" className={inputCls} value={modalExc.fechaInicio ?? ''} onChange={e => setModalExc(p => ({ ...p!, fechaInicio: e.target.value }))} />
              </Field>
              <Field label="Fecha Estimada de Finalización">
                <input type="date" className={inputCls} value={modalExc.fechaFinEstimada ?? ''} onChange={e => setModalExc(p => ({ ...p!, fechaFinEstimada: e.target.value }))} />
              </Field>
              <Field label="Duración Estimada (días)">
                <input type="number" className={inputCls} value={modalExc.duracionEstimadaDias ?? ''} onChange={e => setModalExc(p => ({ ...p!, duracionEstimadaDias: Number(e.target.value) }))} placeholder="45" />
              </Field>
              <Field label="Ingeniero Responsable">
                <input className={inputCls} value={modalExc.ingenieroResponsable ?? ''} onChange={e => setModalExc(p => ({ ...p!, ingenieroResponsable: e.target.value }))} placeholder="Nombre del ingeniero" />
              </Field>
              <Field label="Residente de Obra">
                <input className={inputCls} value={modalExc.residenteObra ?? ''} onChange={e => setModalExc(p => ({ ...p!, residenteObra: e.target.value }))} placeholder="Nombre del residente" />
              </Field>
              <Field label="Supervisor de Seguridad">
                <input className={inputCls} value={modalExc.supervisorSeguridad ?? ''} onChange={e => setModalExc(p => ({ ...p!, supervisorSeguridad: e.target.value }))} placeholder="Nombre del supervisor" />
              </Field>
            </div>

            <SectionHeader icon={Activity} label="Estado y Observaciones Técnicas" />
            <div className="space-y-3">
              <Field label="Estado de la Excavación" required>
                <select className={inputCls} value={modalExc.estado ?? 'Planificada'} onChange={e => setModalExc(p => ({ ...p!, estado: e.target.value }))}>
                  {ESTADOS_EXCAVACION.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </Field>
              <Field label="Observaciones Técnicas">
                <textarea className={inputCls} rows={3} value={modalExc.observaciones ?? ''}
                  onChange={e => setModalExc(p => ({ ...p!, observaciones: e.target.value }))}
                  placeholder="Notas sobre el suelo, restricciones ambientales, servicios subterráneos, condiciones especiales de seguridad..." />
              </Field>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalExc(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={guardarExcavacion} disabled={guardandoExc} className="flex-1 text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoExc ? 'Guardando...' : (modalExc.id ? 'Guardar Cambios' : 'Registrar Excavación')}
              </button>
            </div>
          </div>}
        </AppDialog>

      {/* ── MODAL CONTRATA ── */}
      <AppDialog open={modalContrata !== null} onClose={() => setModalContrata(null)} title={modalContrata?.id ? 'Editar Contrata' : 'Nueva Contrata'}>
        {modalContrata && <div className="space-y-4">
            <Field label="Empresa" required>
              <input className={inputCls} value={modalContrata.empresa ?? ''} onChange={e => setModalContrata(p => ({ ...p!, empresa: e.target.value }))} placeholder="Ej: Constructora Los Andes SAC" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo de servicio">
                <select className={inputCls} value={modalContrata.tipo ?? 'otro'} onChange={e => setModalContrata(p => ({ ...p!, tipo: e.target.value }))}>
                  {TIPOS_CONTRATA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Cobertura">
                <select className={inputCls} value={modalContrata.cobertura ?? 'parcial'} onChange={e => setModalContrata(p => ({ ...p!, cobertura: e.target.value }))}>
                  <option value="parcial">Parcial</option>
                  <option value="completa">Completa</option>
                </select>
              </Field>
            </div>
            <Field label="Servicios (separados por coma)">
              <input className={inputCls} value={(modalContrata.servicios ?? []).join(', ')} onChange={e => setModalContrata(p => ({ ...p!, servicios: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Excavación, Eliminación de material" />
            </Field>
            <Field label="Equipos incluidos (separados por coma)">
              <input className={inputCls} value={(modalContrata.equipos ?? []).join(', ')} onChange={e => setModalContrata(p => ({ ...p!, equipos: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Excavadora CAT 320, Camiones 15m³" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Presupuesto total (S/)">
                <input type="number" className={inputCls} value={modalContrata.presupuestoTotal ?? 0} onChange={e => setModalContrata(p => ({ ...p!, presupuestoTotal: Number(e.target.value) }))} />
              </Field>
              <Field label="Monto asignado (S/)">
                <input type="number" className={inputCls} value={modalContrata.presupuestoAsignado ?? 0} onChange={e => setModalContrata(p => ({ ...p!, presupuestoAsignado: Number(e.target.value) }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Contacto">
                <input className={inputCls} value={modalContrata.contactoNombre ?? ''} onChange={e => setModalContrata(p => ({ ...p!, contactoNombre: e.target.value }))} placeholder="Nombre del responsable" />
              </Field>
              <Field label="Teléfono">
                <input className={inputCls} value={modalContrata.contactoTelefono ?? ''} onChange={e => setModalContrata(p => ({ ...p!, contactoTelefono: e.target.value }))} placeholder="999 888 777" />
              </Field>
            </div>
            <Field label="Estado">
              <select className={inputCls} value={modalContrata.estado ?? 'activo'} onChange={e => setModalContrata(p => ({ ...p!, estado: e.target.value }))}>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="completado">Completado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </Field>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={modalContrata.notas ?? ''} onChange={e => setModalContrata(p => ({ ...p!, notas: e.target.value }))} placeholder="Observaciones adicionales..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalContrata(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarContrata} disabled={guardandoContrata} className="flex-1 text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoContrata ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>}
        </AppDialog>

      {/* ── MODAL EQUIPO ── */}
      <AppDialog open={modalEquipo !== null} onClose={() => setModalEquipo(null)} title={modalEquipo?.id ? 'Editar Equipo' : 'Nuevo Equipo'}>
        {modalEquipo && <div className="space-y-4">
            <Field label="Nombre del equipo" required>
              <input className={inputCls} value={modalEquipo.nombre ?? ''} onChange={e => setModalEquipo(p => ({ ...p!, nombre: e.target.value }))} placeholder="Ej: Excavadora CAT 320" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo">
                <select className={inputCls} value={modalEquipo.tipo ?? 'excavadora'} onChange={e => setModalEquipo(p => ({ ...p!, tipo: e.target.value }))}>
                  {TIPOS_EQUIPO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Estado">
                <select className={inputCls} value={modalEquipo.estado ?? 'disponible'} onChange={e => setModalEquipo(p => ({ ...p!, estado: e.target.value }))}>
                  <option value="operativo">Operativo</option>
                  <option value="mantenimiento">Mantenimiento</option>
                  <option value="disponible">Disponible</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa contratista">
                <input className={inputCls} value={modalEquipo.contrataEmpresa ?? ''} onChange={e => setModalEquipo(p => ({ ...p!, contrataEmpresa: e.target.value }))} placeholder="Nombre de la contrata" />
              </Field>
              <Field label="Ubicación">
                <input className={inputCls} value={modalEquipo.ubicacion ?? ''} onChange={e => setModalEquipo(p => ({ ...p!, ubicacion: e.target.value }))} placeholder="Ej: Sector A - Anillo 1" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Operador">
                <input className={inputCls} value={modalEquipo.operador ?? ''} onChange={e => setModalEquipo(p => ({ ...p!, operador: e.target.value }))} placeholder="Nombre del operador" />
              </Field>
              <Field label="Horas trabajadas">
                <input type="number" className={inputCls} value={modalEquipo.horasTrabajadas ?? 0} onChange={e => setModalEquipo(p => ({ ...p!, horasTrabajadas: Number(e.target.value) }))} />
              </Field>
            </div>
            <Field label="Estado de mantenimiento">
              <select className={inputCls} value={modalEquipo.mantenimientoEstado ?? 'al_dia'} onChange={e => setModalEquipo(p => ({ ...p!, mantenimientoEstado: e.target.value }))}>
                <option value="al_dia">Al día</option>
                <option value="en_proceso">En proceso</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </Field>
            <Field label="Notas">
              <textarea className={inputCls} rows={2} value={modalEquipo.notas ?? ''} onChange={e => setModalEquipo(p => ({ ...p!, notas: e.target.value }))} placeholder="Observaciones..." />
            </Field>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalEquipo(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarEquipo} disabled={guardandoEquipo} className="flex-1 text-sm bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white py-2.5 rounded-xl font-medium transition-colors">
                {guardandoEquipo ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>}
        </AppDialog>
    </div>
  )
}
