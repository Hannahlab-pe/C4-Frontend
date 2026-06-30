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

  const cargar = () => {
    Promise.all([
      fetch(`${API_BASE}/proyectos/${id}/mi-rol`, { headers }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(`${API_BASE}/proyectos/${id}/equipo`, { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([rol, eq]) => {
      setSoyJefe(rol?.rolObra === 'jefe_proyecto')
      setMiembros(Array.isArray(eq) ? eq : [])
    }).finally(() => setLoading(false))
  }
  useEffect(() => { setLoading(true); cargar() }, [id])

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
    <div className="h-full overflow-y-auto p-6 max-w-4xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Equipo del proyecto</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {soyJefe ? 'Registra a tu equipo y asígnales su rol y fase. Cada uno entra con su correo y verá lo suyo.' : 'Equipo asignado a este proyecto.'}
        </p>
      </div>

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
            <div className="grid grid-cols-2 gap-3">
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
                      <button onClick={() => setEditar(m)} className="text-slate-300 hover:text-slate-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => quitar(m)} className="text-slate-300 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Editar miembro */}
      {editar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditar(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold text-slate-800">Editar {editar.nombre}</p>
              <button onClick={() => setEditar(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
