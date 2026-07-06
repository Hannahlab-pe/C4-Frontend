import { useEffect, useRef, useState } from 'react'
import { Mountain, Loader2, ScanText, Droplets, Gauge, FlaskConical, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

type Suelo = Record<string, string> & { _fuente?: string }

const CAMPOS: { key: string; label: string; placeholder: string }[] = [
  { key: 'tipoSuelo',         label: 'Tipo de suelo (SUCS)',     placeholder: 'Ej: Grava arenosa mal graduada (GP)' },
  { key: 'capacidadPortante', label: 'Capacidad portante adm.',  placeholder: 'Ej: 2.5 kg/cm²' },
  { key: 'nivelFreatico',     label: 'Nivel freático',           placeholder: 'Ej: -8.0 m (o no detectado)' },
  { key: 'profCimentacion',   label: 'Prof. de cimentación',     placeholder: 'Ej: -3.0 m' },
  { key: 'agresividad',       label: 'Agresividad al concreto',  placeholder: 'Ej: Moderada (sulfatos)' },
  { key: 'anguloFriccion',    label: 'Ángulo de fricción (φ)',   placeholder: 'Ej: 32°' },
  { key: 'cohesion',          label: 'Cohesión (c)',             placeholder: 'Ej: 0.10 kg/cm²' },
  { key: 'asentamiento',      label: 'Asentamiento estimado',    placeholder: 'Ej: 2.5 cm' },
]

export default function SuelosFase({ proyectoId }: { proyectoId: string }) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const detalleKey = 'suelos'

  const [datos, setDatos] = useState<Suelo>({})
  const [loading, setLoading] = useState(true)
  const [analizando, setAnalizando] = useState(false)
  const [error, setError] = useState('')
  const lastSaved = useRef('{}')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const v = (d?.datos ?? {}) as Suelo; lastSaved.current = JSON.stringify(v); setDatos(v) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [proyectoId])

  function persistir(next: Suelo) {
    setDatos(next)
    const json = JSON.stringify(next)
    if (json === lastSaved.current) return
    if (timer.current) clearTimeout(timer.current)
    setGuardado('saving')
    timer.current = setTimeout(() => {
      fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, {
        method: 'PUT', headers, body: JSON.stringify({ datos: next }),
      }).then((r) => { if (!r.ok) throw new Error(); lastSaved.current = json; setGuardado('saved') }).catch(() => setGuardado('error'))
    }, 600)
  }
  const set = (key: string, value: string) => persistir({ ...datos, [key]: value })

  async function analizarEms(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.type !== 'application/pdf') { setError('El EMS debe ser un PDF.'); return }
    setError(''); setAnalizando(true)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1] ?? ''); fr.onerror = rej; fr.readAsDataURL(file)
      })
      const r = await fetch(`${API_BASE}/chat/analizar-ems`, { method: 'POST', headers, body: JSON.stringify({ pdfBase64: base64, nombre: file.name }) })
      const data = await r.json()
      if (data.error) { setError(data.error); return }
      persistir({ ...datos, ...data.datos, _fuente: file.name })
    } catch { setError('No se pudo analizar el EMS.') }
    finally { setAnalizando(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando estudio de suelos...</span>
    </div>
  )

  const highlights = [
    { label: 'Capacidad portante', value: datos.capacidadPortante || '—', icon: Gauge },
    { label: 'Nivel freático',     value: datos.nivelFreatico || '—',     icon: Droplets },
    { label: 'Agresividad',        value: datos.agresividad || '—',       icon: FlaskConical },
  ]

  return (
    <div className="space-y-5">
      <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={analizarEms} />

      {/* Header + IA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0"><Mountain className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-sm font-bold text-slate-800">Estudio de Mecánica de Suelos (E.050)</p>
              <p className="text-xs text-slate-400">La base de toda la excavación y cimentación</p>
            </div>
          </div>
          <button onClick={() => fileRef.current?.click()} disabled={analizando} className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
            {analizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
            {analizando ? 'Leyendo EMS...' : 'Analizar EMS (PDF) con IA'}
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}
        {datos._fuente && !error && (
          <p className="text-[11px] text-blue-600 mt-3 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Rellenado por la IA desde «{datos._fuente}». Revisa y ajusta lo que haga falta.</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Laboratorio</label>
            <input className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={datos.laboratorio ?? ''} onChange={(e) => set('laboratorio', e.target.value)} placeholder="Ej: Laboratorio Geotécnico XYZ" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha del EMS</label>
            <input className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={datos.fecha ?? ''} onChange={(e) => set('fecha', e.target.value)} placeholder="Ej: marzo 2026" />
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-3 gap-3">
        {highlights.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-lg font-black text-slate-900 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Parámetros */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Parámetros geotécnicos</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {CAMPOS.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <input className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={datos[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
            </div>
          ))}
        </div>
      </div>

      {/* Recomendaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Conclusiones y recomendaciones</p>
        <textarea
          className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed"
          rows={5} value={datos.recomendaciones ?? ''} onChange={(e) => set('recomendaciones', e.target.value)}
          placeholder="Tipo de cimentación recomendada, profundidad de desplante, consideraciones para calzaduras y excavación, control del nivel freático..."
        />
      </div>
    </div>
  )
}
