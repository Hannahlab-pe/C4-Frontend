import { useEffect, useRef, useState } from 'react'
import { Mountain, Loader2, ScanText, Droplets, Gauge, ShieldCheck, Sparkles, FileText } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { API_BASE } from '../lib/config'
import { setGuardado } from '../store/guardadoStore'

type Suelo = Record<string, string> & { _fuente?: string; _archivoId?: string; _archivoNombre?: string }

type Campo = { key: string; label: string; placeholder: string; area?: boolean }

const SECCIONES: { titulo: string; campos: Campo[] }[] = [
  {
    titulo: 'Identificación del estudio',
    campos: [
      { key: 'laboratorio',           label: 'Laboratorio',              placeholder: 'Ej: Laboratorio Geotécnico XYZ' },
      { key: 'fecha',                 label: 'Fecha del EMS',            placeholder: 'Ej: noviembre 2025' },
      { key: 'numeroInforme',         label: 'N° de informe',            placeholder: 'Ej: 5673' },
      { key: 'ubicacion',             label: 'Ubicación del terreno',    placeholder: 'Ej: Av. Larco 123, Miraflores' },
      { key: 'numeroCalicatas',       label: 'N° de calicatas/sondajes', placeholder: 'Ej: 3 calicatas' },
      { key: 'profundidadInvestigada',label: 'Prof. investigada',        placeholder: 'Ej: 24.0 m' },
    ],
  },
  {
    titulo: 'Suelo y estratigrafía',
    campos: [
      { key: 'tipoSuelo',      label: 'Tipo de suelo (SUCS)', placeholder: 'Ej: Grava arenosa mal graduada (GP)' },
      { key: 'nivelFreatico',  label: 'Nivel freático',       placeholder: 'Ej: No detectado / -8.0 m' },
      { key: 'pesoEspecifico', label: 'Peso específico (γ)',  placeholder: 'Ej: 2.10 Ton/m³' },
      { key: 'perfilEstratigrafico', label: 'Perfil estratigráfico (capas)', placeholder: 'Ej: 0–3.5m: arena limosa; 3.5–11m: grava densa…', area: true },
    ],
  },
  {
    titulo: 'Cimentación',
    campos: [
      { key: 'tipoCimentacion',   label: 'Tipo de cimentación',    placeholder: 'Ej: Zapatas aisladas / Platea' },
      { key: 'capacidadPortante', label: 'Capacidad portante adm.', placeholder: 'Ej: 6.50 kg/cm²' },
      { key: 'profCimentacion',   label: 'Prof. de cimentación',   placeholder: 'Ej: -17.50 m' },
      { key: 'factorSeguridad',   label: 'Factor de seguridad',    placeholder: 'Ej: 3.0' },
      { key: 'asentamiento',      label: 'Asentamiento estimado',  placeholder: 'Ej: 2.50 cm' },
    ],
  },
  {
    titulo: 'Parámetros de resistencia',
    campos: [
      { key: 'anguloFriccion', label: 'Ángulo de fricción (φ)', placeholder: 'Ej: 37°' },
      { key: 'cohesion',       label: 'Cohesión (c)',           placeholder: 'Ej: 0.30 kg/cm²' },
      { key: 'empujeActivo',   label: 'Empuje activo (Ka)',     placeholder: 'Ej: 0.25' },
    ],
  },
  {
    titulo: 'Sismicidad (E.030)',
    campos: [
      { key: 'zonaSismica', label: 'Zona sísmica', placeholder: 'Ej: 4' },
      { key: 'factorZ',     label: 'Factor de zona (Z)', placeholder: 'Ej: 0.45' },
      { key: 'tipoPerfil',  label: 'Tipo de perfil', placeholder: 'Ej: S1' },
      { key: 'factorSuelo', label: 'Factor de suelo (S)', placeholder: 'Ej: 1.00' },
      { key: 'periodoTp',   label: 'Período Tp', placeholder: 'Ej: 0.4 s' },
      { key: 'periodoTl',   label: 'Período Tl', placeholder: 'Ej: 2.5 s' },
    ],
  },
  {
    titulo: 'Riesgos y agresividad',
    campos: [
      { key: 'licuacion',   label: 'Potencial de licuación', placeholder: 'Ej: No hay' },
      { key: 'colapso',     label: 'Potencial de colapso',   placeholder: 'Ej: No hay' },
      { key: 'expansion',   label: 'Potencial de expansión', placeholder: 'Ej: No hay' },
      { key: 'agresividad', label: 'Agresividad al concreto', placeholder: 'Ej: Moderada (sulfatos)' },
      { key: 'tipoCemento', label: 'Cemento recomendado',    placeholder: 'Ej: Tipo I / Tipo V' },
    ],
  },
]

const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

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

  function cargar(showLoader = true) {
    if (showLoader) setLoading(true)
    fetch(`${API_BASE}/fases-detalle/${proyectoId}/${detalleKey}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { const v = (d?.datos ?? {}) as Suelo; lastSaved.current = JSON.stringify(v); setDatos(v) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargar()
    // La IA puede plasmar el EMS desde el chat → refrescar la ficha en vivo
    const onUpd = () => cargar(false)
    window.addEventListener('c4:suelos-updated', onUpd)
    return () => window.removeEventListener('c4:suelos-updated', onUpd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      const r = await fetch(`${API_BASE}/chat/analizar-ems`, { method: 'POST', headers, body: JSON.stringify({ pdfBase64: base64, nombre: file.name, proyectoId }) })
      const data = await r.json()
      if (data.error) { setError(data.error); return }
      persistir({ ...datos, ...data.datos, _fuente: file.name, _archivoId: data.archivoId, _archivoNombre: data.archivoNombre })
    } catch { setError('No se pudo analizar el EMS.') }
    finally { setAnalizando(false) }
  }

  async function verEms() {
    if (!datos._archivoId) return
    try {
      const r = await fetch(`${API_BASE}/documentos/archivo/${datos._archivoId}`, { headers })
      const d = await r.json()
      if (!d?.base64) { setError('El PDF ya no está disponible.'); return }
      const bin = atob(d.base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const url = URL.createObjectURL(new Blob([bytes], { type: d.mimeType || 'application/pdf' }))
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setError('No se pudo abrir el PDF.') }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /><span className="text-sm">Cargando estudio de suelos...</span>
    </div>
  )

  const highlights = [
    { label: 'Capacidad portante',   value: datos.capacidadPortante || '—',    icon: Gauge },
    { label: 'Nivel freático',       value: datos.nivelFreatico || '—',        icon: Droplets },
    { label: 'Sostenimiento',        value: datos.sistemaSostenimiento || '—', icon: ShieldCheck },
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
          <div className="flex items-center gap-2">
            {datos._archivoId && (
              <button onClick={verEms} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl transition-colors" title={datos._archivoNombre}>
                <FileText className="w-4 h-4" /> Ver EMS
              </button>
            )}
            <button onClick={() => fileRef.current?.click()} disabled={analizando} className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl transition-colors disabled:opacity-50">
              {analizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanText className="w-4 h-4" />}
              {analizando ? 'Leyendo EMS...' : 'Analizar EMS (PDF) con IA'}
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-3">{error}</p>}
        {datos._fuente && !error && (
          <p className="text-[11px] text-blue-600 mt-3 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Rellenado por la IA desde «{datos._fuente}». Revisa y ajusta lo que haga falta.</p>
        )}
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-3 gap-3">
        {highlights.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-base font-black text-slate-900 leading-tight">{value}</p>
          </div>
        ))}
      </div>

      {/* Secciones de parámetros */}
      {SECCIONES.map((sec) => (
        <div key={sec.titulo} className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">{sec.titulo}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {sec.campos.map(({ key, label, placeholder, area }) => (
              <div key={key} className={area ? 'sm:col-span-2' : ''}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                {area ? (
                  <textarea className={`${inputCls} resize-none leading-relaxed`} rows={2} value={datos[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
                ) : (
                  <input className={inputCls} value={datos[key] ?? ''} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sostenimiento y recomendaciones */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Sostenimiento y recomendaciones</p>
        <div className="mb-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Sistema de sostenimiento recomendado</label>
          <input className={inputCls} value={datos.sistemaSostenimiento ?? ''} onChange={(e) => set('sistemaSostenimiento', e.target.value)} placeholder="Ej: Calzaduras + muros anclados" />
        </div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Conclusiones y recomendaciones</label>
        <textarea
          className={`${inputCls} resize-none leading-relaxed`}
          rows={5} value={datos.recomendaciones ?? ''} onChange={(e) => set('recomendaciones', e.target.value)}
          placeholder="Tipo de cimentación recomendada, profundidad de desplante, consideraciones para calzaduras y excavación, control del nivel freático..."
        />
      </div>
    </div>
  )
}
