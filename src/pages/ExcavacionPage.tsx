import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  HardHat, FileText, Truck, DollarSign, BarChart2,
  Plus, Trash2, Pencil, CheckCircle2, Clock, Circle,
  Loader2, X, Phone, Wrench, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Tarea {
  id: string; texto: string; estado: 'pendiente' | 'en_proceso' | 'completada'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fmtSoles(n: number) {
  return `S/ ${Number(n).toLocaleString('es-PE', { maximumFractionDigits: 0 })}`
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
    operativo:    'bg-green-100 text-green-700',
    mantenimiento:'bg-red-100 text-red-600',
    disponible:   'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    operativo: 'Operativo', mantenimiento: 'Mantenimiento', disponible: 'Disponible',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[estado] ?? 'bg-slate-100 text-slate-500'}`}>
      {labels[estado] ?? estado}
    </span>
  )
}

// ─── Modal genérico ───────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <p className="font-semibold text-slate-800">{title}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
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

const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExcavacionPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [tab, setTab] = useState('excavaciones')

  // Tareas (excavaciones)
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loadingTareas, setLoadingTareas] = useState(true)
  const [nuevaTarea, setNuevaTarea] = useState('')
  const [agregandoTarea, setAgregandoTarea] = useState(false)

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
    // Cargar tareas
    fetch(`${API_BASE}/tareas-fase/${proyectoId}/excavacion`, { headers })
      .then(r => r.json()).then(setTareas).catch(() => {}).finally(() => setLoadingTareas(false))
    // Cargar contratas
    fetch(`${API_BASE}/contratas-fase/${proyectoId}/excavacion`, { headers })
      .then(r => r.json()).then(setContratas).catch(() => {}).finally(() => setLoadingContratas(false))
    // Cargar equipos
    fetch(`${API_BASE}/equipos-fase/${proyectoId}/excavacion`, { headers })
      .then(r => r.json()).then(setEquipos).catch(() => {}).finally(() => setLoadingEquipos(false))
  }, [proyectoId])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const completadas = tareas.filter(t => t.estado === 'completada').length
  const avance = tareas.length ? Math.round((completadas / tareas.length) * 100) : 0
  const contratosActivos = contratas.filter(c => c.estado === 'activo').length
  const equiposOperativos = equipos.filter(e => e.estado === 'operativo').length
  const presupuestoTotal = contratas.reduce((s, c) => s + Number(c.presupuestoTotal), 0)
  const presupuestoAsignado = contratas.reduce((s, c) => s + Number(c.presupuestoAsignado), 0)
  const avancePresupuestal = presupuestoTotal > 0 ? Math.round((presupuestoAsignado / presupuestoTotal) * 100) : 0

  // ── Tareas ────────────────────────────────────────────────────────────────
  const ESTADO_SIGUIENTE: Record<string, string> = { pendiente: 'en_proceso', en_proceso: 'completada', completada: 'pendiente' }

  async function avanzarTarea(t: Tarea) {
    const nuevo = ESTADO_SIGUIENTE[t.estado]
    setTareas(prev => prev.map(x => x.id === t.id ? { ...x, estado: nuevo as Tarea['estado'] } : x))
    await fetch(`${API_BASE}/tareas-fase/${t.id}/estado`, { method: 'PATCH', headers, body: JSON.stringify({ estado: nuevo }) })
  }

  async function agregarTarea() {
    if (!nuevaTarea.trim()) return
    const r = await fetch(`${API_BASE}/tareas-fase/${proyectoId}/excavacion`, {
      method: 'POST', headers, body: JSON.stringify({ texto: nuevaTarea.trim() }),
    })
    setTareas(prev => [...prev, await r.json()])
    setNuevaTarea(''); setAgregandoTarea(false)
  }

  async function eliminarTarea(id: string) {
    setTareas(prev => prev.filter(t => t.id !== id))
    await fetch(`${API_BASE}/tareas-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Contratas ─────────────────────────────────────────────────────────────
  async function guardarContrata() {
    if (!modalContrata?.empresa?.trim()) return
    setGuardandoContrata(true)
    try {
      const isNew = !modalContrata.id
      const url = isNew ? `${API_BASE}/contratas-fase/${proyectoId}/excavacion` : `${API_BASE}/contratas-fase/${modalContrata.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const r = await fetch(url, { method, headers, body: JSON.stringify(modalContrata) })
      const saved = await r.json()
      setContratas(prev => isNew ? [...prev, saved] : prev.map(c => c.id === saved.id ? saved : c))
      setModalContrata(null)
    } finally { setGuardandoContrata(false) }
  }

  async function eliminarContrata(id: string) {
    setContratas(prev => prev.filter(c => c.id !== id))
    await fetch(`${API_BASE}/contratas-fase/${id}`, { method: 'DELETE', headers })
  }

  // ── Equipos ───────────────────────────────────────────────────────────────
  async function guardarEquipo() {
    if (!modalEquipo?.nombre?.trim()) return
    setGuardandoEquipo(true)
    try {
      const isNew = !modalEquipo.id
      const url = isNew ? `${API_BASE}/equipos-fase/${proyectoId}/excavacion` : `${API_BASE}/equipos-fase/${modalEquipo.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const r = await fetch(url, { method, headers, body: JSON.stringify(modalEquipo) })
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

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Avance obra', value: `${avance}%` },
            { label: 'Contratas activas', value: String(contratosActivos) },
            { label: 'Equipos operativos', value: `${equiposOperativos}/${equipos.length}` },
            { label: 'Presupuesto total', value: presupuestoTotal > 0 ? fmtSoles(presupuestoTotal) : '—' },
            { label: 'Avance presup.', value: `${avancePresupuestal}%` },
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

      {/* Contenido de tabs */}
      <div className="p-6">

        {/* ── TAB: EXCAVACIONES (checklist) ── */}
        {tab === 'excavaciones' && (
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Lista de trabajos de excavación</p>
              <span className="text-xs text-slate-400">{completadas}/{tareas.length} completados</span>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {loadingTareas ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando...</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {tareas.map(t => (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 group">
                      <button onClick={() => avanzarTarea(t)} className="shrink-0">
                        {t.estado === 'completada' ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                          : t.estado === 'en_proceso' ? <Clock className="w-4 h-4 text-orange-500" />
                          : <Circle className="w-4 h-4 text-slate-300" />}
                      </button>
                      <span className={`text-sm flex-1 ${t.estado === 'completada' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {t.texto}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium hidden group-hover:inline-block ${
                        t.estado === 'completada' ? 'bg-slate-100 text-slate-500' :
                        t.estado === 'en_proceso' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        {t.estado === 'pendiente' ? 'Iniciar' : t.estado === 'en_proceso' ? 'Completar' : 'Reabrir'}
                      </span>
                      <button onClick={() => eliminarTarea(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 p-1 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="px-5 py-3 border-t border-slate-100">
                {agregandoTarea ? (
                  <div className="flex items-center gap-2">
                    <input autoFocus value={nuevaTarea} onChange={e => setNuevaTarea(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') agregarTarea(); if (e.key === 'Escape') { setAgregandoTarea(false); setNuevaTarea('') } }}
                      placeholder="Descripción del trabajo..." className={inputCls} />
                    <button onClick={agregarTarea} className="text-xs bg-orange-500 text-white px-3 py-2 rounded-xl hover:bg-orange-400">Agregar</button>
                    <button onClick={() => { setAgregandoTarea(false); setNuevaTarea('') }} className="text-xs text-slate-400 px-2 py-2">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setAgregandoTarea(true)} className="flex items-center gap-2 text-slate-400 hover:text-orange-500 text-sm">
                    <Plus className="w-4 h-4" />Agregar trabajo
                  </button>
                )}
              </div>
            </div>
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

                    {c.equipos?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-slate-400 font-medium mb-1">Equipos incluidos</p>
                        <div className="flex flex-wrap gap-1">
                          {c.equipos.map(e => <span key={e} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{e}</span>)}
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
                      <button onClick={() => setModalContrata(c)} className="flex-1 text-xs text-slate-600 border border-slate-200 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                        Ver / Editar
                      </button>
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
                <p className="text-xs">Registra las excavadoras y maquinaria del proyecto</p>
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
                        Mantenimiento: {e.mantenimientoEstado === 'al_dia' ? 'Al día' : e.mantenimientoEstado === 'en_proceso' ? 'En proceso' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Cambio rápido de estado */}
                    <div className="flex gap-1">
                      {(['operativo', 'mantenimiento', 'disponible'] as const).map(st => (
                        <button
                          key={st}
                          onClick={() => cambiarEstadoEquipo(e, st)}
                          className={`flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-colors ${e.estado === st ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          {st === 'operativo' ? 'Op.' : st === 'mantenimiento' ? 'Mant.' : 'Disp.'}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => setModalEquipo(e)} className="flex-1 text-xs text-slate-600 border border-slate-200 py-1.5 rounded-xl hover:bg-slate-50">
                        Editar
                      </button>
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
            {/* KPIs presupuestales */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Presupuesto Total', value: fmtSoles(presupuestoTotal), color: 'text-slate-800' },
                { label: 'Asignado', value: fmtSoles(presupuestoAsignado), color: 'text-green-600' },
                { label: 'Pendiente', value: fmtSoles(presupuestoTotal - presupuestoAsignado), color: 'text-amber-600' },
              ].map(k => (
                <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                  <p className="text-xs text-slate-500 mb-1">{k.label}</p>
                  <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Barra general */}
            <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
              <div className="flex justify-between text-xs text-slate-500 mb-2">
                <span>Avance presupuestal</span>
                <span className="font-semibold text-slate-700">{avancePresupuestal}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${avancePresupuestal}%` }} />
              </div>
            </div>

            {/* Desglose por contrata */}
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
                      {['Contrata', 'Tipo', 'Cobertura', 'Total', 'Asignado', 'Pendiente', 'Estado'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {contratas.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-700">{c.empresa}</td>
                        <td className="px-4 py-3 text-slate-500">{TIPOS_CONTRATA.find(t => t.value === c.tipo)?.label ?? c.tipo}</td>
                        <td className="px-4 py-3">{c.cobertura === 'completa' ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-medium">Completa</span> : <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-medium">Parcial</span>}</td>
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

      {/* ── MODAL CONTRATA ── */}
      {modalContrata !== null && (
        <Modal title={modalContrata.id ? 'Editar Contrata' : 'Nueva Contrata'} onClose={() => setModalContrata(null)}>
          <div className="space-y-4">
            <Field label="Empresa *">
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
              <input className={inputCls} value={(modalContrata.servicios ?? []).join(', ')} onChange={e => setModalContrata(p => ({ ...p!, servicios: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Ej: Excavación, Eliminación de material" />
            </Field>
            <Field label="Equipos incluidos (separados por coma)">
              <input className={inputCls} value={(modalContrata.equipos ?? []).join(', ')} onChange={e => setModalContrata(p => ({ ...p!, equipos: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} placeholder="Ej: Excavadora CAT 320, Camiones 15m³" />
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
          </div>
        </Modal>
      )}

      {/* ── MODAL EQUIPO ── */}
      {modalEquipo !== null && (
        <Modal title={modalEquipo.id ? 'Editar Equipo' : 'Nuevo Equipo'} onClose={() => setModalEquipo(null)}>
          <div className="space-y-4">
            <Field label="Nombre del equipo *">
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
          </div>
        </Modal>
      )}
    </div>
  )
}
