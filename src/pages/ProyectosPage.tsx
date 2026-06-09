import { useEffect, useState } from 'react'
import {
  Plus, Search, MapPin, Sparkles, ChevronRight, Loader2, HardHat, CalendarDays,
  Building2, Layers, TrendingUp,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import AppDialog from '../components/AppDialog'

interface Proyecto {
  id: string
  nombre: string
  distrito?: string
  ubicacion?: string
  estado?: string
  createdAt: string
}

interface Stats { pisos?: number; deptos?: number; tir?: number; areaVend?: number }

// Acentos de color por card (en vez de fotos que se repiten)
const ACCENTS = [
  'from-blue-500 to-blue-700',
  'from-indigo-500 to-indigo-700',
  'from-sky-500 to-cyan-600',
  'from-violet-500 to-purple-700',
  'from-cyan-500 to-blue-600',
  'from-slate-600 to-slate-800',
]

function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean)
  if (palabras.length === 0) return '?'
  if (palabras.length === 1) return palabras[0].slice(0, 2).toUpperCase()
  return (palabras[0][0] + palabras[1][0]).toUpperCase()
}

function fmtFecha(iso?: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

export default function ProyectosPage() {
  const navigate = useNavigate()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [stats, setStats] = useState<Record<string, Stats>>({})
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [distrito, setDistrito] = useState('')
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    api.get('/proyectos')
      .then(async (r) => {
        const lista: Proyecto[] = r.data
        setProyectos(lista)
        setLoading(false)
        // Enriquecer cada card con stats del análisis (en paralelo, sin bloquear)
        const entradas = await Promise.all(
          lista.map(async (p) => {
            try {
              const { data } = await api.get(`/chat/${p.id}/analisis`)
              if (!data) return [p.id, {}] as const
              return [p.id, {
                pisos: data.cabida?.pisos_vivienda,
                deptos: data.cabida?.num_departamentos,
                areaVend: data.cabida?.area_vendible_total,
                tir: data.financiero?.tir_anual_pct,
              }] as const
            } catch { return [p.id, {}] as const }
          }),
        )
        setStats(Object.fromEntries(entradas))
      })
      .catch(() => setLoading(false))
  }, [])

  async function crearProyecto() {
    if (!nombre.trim()) return
    setCreando(true)
    try {
      const { data } = await api.post('/proyectos', {
        nombre: nombre.trim(),
        distrito: distrito.trim() || undefined,
      })
      setShowModal(false)
      setNombre('')
      setDistrito('')
      navigate(`/proyectos/${data.id}/panel`)
    } catch {
      setCreando(false)
    }
  }

  const filtrados = proyectos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.distrito ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 w-72">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o distrito..."
            className="text-sm text-slate-600 placeholder:text-slate-400 outline-none w-full bg-transparent"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo proyecto
        </button>
      </div>

      {/* Grid de proyectos */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
        </div>
      ) : filtrados.length === 0 && busqueda ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <HardHat className="w-8 h-8 text-slate-300" />
          <p className="text-sm text-slate-400">Sin resultados para “{busqueda}”.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((p, i) => {
            const s = stats[p.id] ?? {}
            const tieneAnalisis = s.pisos != null || s.tir != null
            const estado = (p.estado ?? 'activo').toLowerCase()
            const estadoCfg = estado === 'completado'
              ? { txt: 'Completado', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' }
              : estado === 'borrador'
              ? { txt: 'Borrador', cls: 'bg-slate-100 text-slate-500 border-slate-200' }
              : { txt: 'Activo', cls: 'bg-blue-50 text-blue-600 border-blue-200' }
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/proyectos/${p.id}/panel`)}
                className="relative flex flex-col text-left bg-white rounded-2xl border border-slate-200 p-5
                  hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 hover:border-blue-200
                  transition-all duration-300 group"
              >
                {/* Top: avatar + estado */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${ACCENTS[i % ACCENTS.length]}
                    flex items-center justify-center shadow-lg shadow-slate-200`}>
                    <span className="text-white font-bold text-sm tracking-tight">{iniciales(p.nombre)}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${estadoCfg.cls}`}>
                    {estadoCfg.txt}
                  </span>
                </div>

                {/* Nombre + meta */}
                <p className="text-base font-bold text-slate-800 leading-tight truncate">{p.nombre}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {p.distrito || 'Sin distrito'}
                  </span>
                  {p.createdAt && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> {fmtFecha(p.createdAt)}
                    </span>
                  )}
                </div>

                {/* Divisor */}
                <div className="border-t border-slate-100 my-3.5" />

                {/* Stats del análisis */}
                {tieneAnalisis ? (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Building2 className="w-3 h-3" /> Pisos
                      </div>
                      <p className="text-sm font-bold text-slate-700">{s.pisos ?? '-'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <Layers className="w-3 h-3" /> Deptos
                      </div>
                      <p className="text-sm font-bold text-slate-700">{s.deptos ?? '-'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-0.5">
                        <TrendingUp className="w-3 h-3" /> TIR
                      </div>
                      <p className={`text-sm font-bold ${(s.tir ?? 0) >= 18 ? 'text-emerald-600' : (s.tir ?? 0) >= 12 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {s.tir != null ? `${s.tir.toFixed(0)}%` : '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    Análisis pendiente — genéralo con el Asistente C4
                  </div>
                )}

                {/* Flecha hover */}
                <ChevronRight className="absolute bottom-5 right-5 w-4 h-4 text-slate-300
                  opacity-0 group-hover:opacity-100 group-hover:text-blue-500 translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            )
          })}

          {/* Card fantasma: nuevo proyecto */}
          <button
            onClick={() => setShowModal(true)}
            className="rounded-2xl min-h-52 border-2 border-dashed border-slate-300 hover:border-blue-400
              hover:bg-blue-50/40 transition-all duration-200 flex flex-col items-center justify-center gap-2.5 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600 group-hover:scale-110 transition-transform duration-200 flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Nuevo proyecto</p>
            <p className="text-xs text-slate-400">Crea un análisis de pre-inversión</p>
          </button>
        </div>
      )}

      {/* Modal */}
      <AppDialog open={showModal} onClose={() => setShowModal(false)} title="Nuevo proyecto">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Nombre del proyecto <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crearProyecto()}
              placeholder="Ej: Edificio Multifamiliar — San Isidro"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Distrito <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              value={distrito}
              onChange={(e) => setDistrito(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && crearProyecto()}
              placeholder="Ej: Miraflores"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowModal(false)}
            className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={crearProyecto}
            disabled={!nombre.trim() || creando}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {creando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Crear y abrir
          </button>
        </div>
      </AppDialog>
    </div>
  )
}
