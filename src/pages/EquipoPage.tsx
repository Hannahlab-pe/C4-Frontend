import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Users, Plus, Trash2, Loader2, Pencil, ShieldCheck, HardHat, Crown, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'

interface Miembro { id: string; usuarioId: string; nombre: string; email: string; rolObra: string; fase: string | null }

const FASES = [
  { slug: 'demolicion', label: 'Demolición' },
  { slug: 'excavacion', label: 'Excavación' },
  { slug: 'construccion', label: 'Construcción' },
  { slug: 'acabados', label: 'Acabados' },
  { slug: 'administracion', label: 'Administración' },
]
const faseLabel = (f: string | null) => FASES.find((x) => x.slug === f)?.label ?? '—'

function rolInfo(rolObra: string, fase: string | null) {
  if (rolObra === 'jefe_proyecto') return { txt: 'Jefe de proyecto', cls: 'bg-violet-50 text-violet-700 border-violet-200', Icon: Crown }
  if (rolObra === 'jefe_fase') return { txt: `Jefe de ${faseLabel(fase)}`, cls: 'bg-blue-50 text-blue-700 border-blue-200', Icon: ShieldCheck }
  return { txt: `Trabajador de ${faseLabel(fase)}`, cls: 'bg-slate-100 text-slate-600 border-slate-200', Icon: HardHat }
}
const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export default function EquipoPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [soyJefe, setSoyJefe] = useState(false)
  const [miembros, setMiembros] = useState<Miembro[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rolObra: 'trabajador', fase: 'demolicion' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [editar, setEditar] = useState<Miembro | null>(null)
  const [personal, setPersonal] = useState<any[]>([])
  const [nuevo, setNuevo] = useState({ nombre: '', dni: '', cargo: '', cuadrilla: '', equipo: '', jornal: '', telefono: '', fase: '' })

  const cargar = () => {
    Promise.all([
      fetch(`${API_BASE}/proyectos/${id}/mi-rol`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE}/proyectos/${id}/equipo`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([rol, eq]) => {
      setSoyJefe(rol?.rolObra === 'jefe_proyecto')
      setMiembros(Array.isArray(eq) ? eq : [])
    }).finally(() => setLoading(false))
  }
  const cargarPersonal = () => {
    fetch(`${API_BASE}/fases-detalle/${id}/personal_obra`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPersonal(Array.isArray(d?.datos?.lista) ? d.datos.lista : []))
      .catch(() => {})
  }
  useEffect(() => { setLoading(true); cargar(); cargarPersonal() }, [id])
  useEffect(() => {
    const h = () => cargarPersonal()
    window.addEventListener('c4:personal-updated', h)
    return () => window.removeEventListener('c4:personal-updated', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function guardarPersonal(lista: any[]) {
    setPersonal(lista)
    await fetch(`${API_BASE}/fases-detalle/${id}/personal_obra`, { method: 'PUT', headers, body: JSON.stringify({ datos: { lista } }) }).catch(() => {})
  }
  function quitarTrabajador(tid: string) { guardarPersonal(personal.filter((t) => t.id !== tid)) }
  function agregarTrabajadorManual() {
    if (!nuevo.nombre.trim()) return
    const t = {
      id: Math.random().toString(36).slice(2, 10), nombre: nuevo.nombre.trim(),
      dni: nuevo.dni.trim() || undefined, cargo: nuevo.cargo.trim() || undefined,
      cuadrilla: nuevo.cuadrilla.trim() || undefined, equipo: nuevo.equipo.trim() || undefined,
      jornal: nuevo.jornal ? Number(nuevo.jornal) : undefined, telefono: nuevo.telefono.trim() || undefined,
      fase: nuevo.fase || undefined,
    }
    guardarPersonal([...personal, t])
    setNuevo({ nombre: '', dni: '', cargo: '', cuadrilla: '', equipo: '', jornal: '', telefono: '', fase: '' })
  }

  async function registrar() {
    setError('')
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 4) {
      setError('Completa nombre, email y una contraseña de al menos 4 caracteres.'); return
    }
    setGuardando(true)
    try {
      const r = await fetch(`${API_BASE}/proyectos/${id}/equipo`, { method: 'POST', headers, body: JSON.stringify(form) })
      const d = await r.json()
      if (!r.ok) { setError(d?.message ?? 'No se pudo registrar.'); return }
      setMiembros((prev) => [...prev.filter((m) => m.id !== d.id), d])
      setForm({ nombre: '', email: '', password: '', rolObra: 'trabajador', fase: 'demolicion' })
    } finally { setGuardando(false) }
  }
  async function guardarEdicion() {
    if (!editar) return
    const r = await fetch(`${API_BASE}/proyectos/${id}/equipo/${editar.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ rolObra: editar.rolObra, fase: editar.fase }),
    })
    const d = await r.json()
    if (r.ok) setMiembros((prev) => prev.map((m) => m.id === d.id ? d : m))
    setEditar(null)
  }
  async function quitar(m: Miembro) {
    if (!window.confirm(`¿Quitar a ${m.nombre} del proyecto?`)) return
    setMiembros((prev) => prev.filter((x) => x.id !== m.id))
    await fetch(`${API_BASE}/proyectos/${id}/equipo/${m.id}`, { method: 'DELETE', headers }).catch(() => {})
  }

  if (loading) return (
    <div className="h-full flex items-center justify-center gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando equipo...</span>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto">
      {/* Header azul noche (igual que el Cronograma) */}
      <div className="bg-linear-to-r from-slate-800 to-slate-700 px-4 md:px-6 py-4 md:py-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
          <div className="min-w-0">
            <h2 className="text-base font-bold">Equipo del proyecto</h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {soyJefe ? 'Registra a tu equipo y asígnales su rol y fase. Cada uno entra con su correo y verá lo suyo.' : 'Equipo asignado a este proyecto.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">

      {/* Registrar trabajador (solo jefe de proyecto) */}
      {soyJefe && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Registrar miembro</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input className={inputCls} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo (con el que entrará)</label>
              <input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@obra.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña</label>
              <input className={inputCls} type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="mín. 4 caracteres" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <select className={inputCls} value={form.rolObra} onChange={(e) => setForm({ ...form, rolObra: e.target.value })}>
                  <option value="trabajador">Trabajador</option>
                  <option value="jefe_fase">Jefe de fase</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fase</label>
                <select className={inputCls} value={form.fase} onChange={(e) => setForm({ ...form, fase: e.target.value })}>
                  {FASES.map((f) => <option key={f.slug} value={f.slug}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <button onClick={registrar} disabled={guardando} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Registrar miembro
            </button>
          </div>
        </div>
      )}

      {/* Lista del equipo */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Miembros</h3>
          <span className="text-[10px] text-slate-400">{miembros.length}</span>
        </div>
        {miembros.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-8 text-center">Sin miembros aún.</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {miembros.map((m) => {
              const r = rolInfo(m.rolObra, m.fase)
              const esJefeProy = m.rolObra === 'jefe_proyecto'
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{m.nombre.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{m.nombre}</p>
                    <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${r.cls}`}>
                    <r.Icon className="w-3 h-3" /> {r.txt}
                  </span>
                  {soyJefe && !esJefeProy && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setEditar(m)} className="text-slate-300 hover:text-slate-600 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => quitar(m)} className="text-slate-300 hover:text-red-400 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Personal de obra (planilla) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <HardHat className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Personal de obra (planilla)</h3>
          <span className="text-[10px] text-slate-400">{personal.length}</span>
        </div>
        <p className="px-5 pt-2.5 text-[11px] text-slate-400 leading-relaxed">
          Cuadrilla y staff de la obra. La IA los carga desde tu Excel de nómina (o agrégalos abajo). No entran al sistema (no tienen login): sirven para la planilla y para asignarlos como responsables.
        </p>
        {personal.length === 0 ? (
          <p className="text-sm text-slate-400 px-5 py-6 text-center">Sin personal aún. Sube tu nómina al chat y dile <span className="font-medium text-slate-600">"agrega los trabajadores"</span>.</p>
        ) : (
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-[11px] text-slate-500 uppercase tracking-wider">
                  <th className="text-left font-medium px-4 py-2">Nombre</th>
                  <th className="text-left font-medium px-2 py-2">DNI</th>
                  <th className="text-left font-medium px-2 py-2">Cargo</th>
                  <th className="text-left font-medium px-2 py-2">Cuadrilla</th>
                  <th className="text-left font-medium px-2 py-2">Equipo que opera</th>
                  <th className="text-right font-medium px-2 py-2">Jornal (S/)</th>
                  <th className="text-left font-medium px-2 py-2">Teléfono</th>
                  {soyJefe && <th className="w-8"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {personal.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2 font-medium text-slate-700 whitespace-nowrap">{t.nombre}</td>
                    <td className="px-2 py-2 text-slate-500 tabular-nums">{t.dni ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{t.cargo ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{t.cuadrilla ?? '—'}</td>
                    <td className="px-2 py-2 text-slate-500 whitespace-nowrap">{t.equipo ?? '—'}</td>
                    <td className="px-2 py-2 text-right text-slate-500 tabular-nums">{t.jornal ? Number(t.jornal).toLocaleString('es-PE') : '—'}</td>
                    <td className="px-2 py-2 text-slate-500 tabular-nums">{t.telefono ?? '—'}</td>
                    {soyJefe && <td className="px-1 py-2 text-center"><button onClick={() => quitarTrabajador(t.id)} className="text-slate-300 hover:text-red-400 p-1"><Trash2 className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {soyJefe && (
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <input className={`${inputCls} flex-1 min-w-40`} value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Nombre completo" />
            <input className={`${inputCls} w-24`} value={nuevo.dni} onChange={(e) => setNuevo({ ...nuevo, dni: e.target.value })} placeholder="DNI" />
            <input className={`${inputCls} w-32`} value={nuevo.cargo} onChange={(e) => setNuevo({ ...nuevo, cargo: e.target.value })} placeholder="Cargo" />
            <input className={`${inputCls} w-40`} value={nuevo.cuadrilla} onChange={(e) => setNuevo({ ...nuevo, cuadrilla: e.target.value })} placeholder="Cuadrilla" />
            <input className={`${inputCls} w-24`} value={nuevo.jornal} onChange={(e) => setNuevo({ ...nuevo, jornal: e.target.value })} placeholder="Jornal" />
            <button onClick={agregarTrabajadorManual} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white text-xs font-medium px-3 py-2 rounded-xl shrink-0"><Plus className="w-3.5 h-3.5" /> Agregar</button>
          </div>
        )}
      </div>
      </div>

      {/* Editar miembro */}
      {editar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditar(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-800">Editar {editar.nombre}</p>
              <button onClick={() => setEditar(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
                <select className={inputCls} value={editar.rolObra} onChange={(e) => setEditar({ ...editar, rolObra: e.target.value })}>
                  <option value="trabajador">Trabajador</option>
                  <option value="jefe_fase">Jefe de fase</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fase</label>
                <select className={inputCls} value={editar.fase ?? 'demolicion'} onChange={(e) => setEditar({ ...editar, fase: e.target.value })}>
                  {FASES.map((f) => <option key={f.slug} value={f.slug}>{f.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditar(null)} className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50">Cancelar</button>
              <button onClick={guardarEdicion} className="flex-1 text-sm font-medium text-white bg-slate-900 hover:bg-slate-700 py-2.5 rounded-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
