import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send, Mic, Paperclip, Layers, Building,
  BarChart2, Sparkles, Loader2, TrendingUp,
  CheckCircle2, Download, FileText, X, Plus, Trash2,
  ChevronsRight, ChevronsLeft, Map,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import FinancieroPanel from '../components/FinancieroPanel'
import { API_BASE, API_HOST } from '../lib/config'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChatMensaje {
  id: number
  rol: 'user' | 'assistant' | 'status' | 'pdf' | 'plano'
  contenido: string
  streaming?: boolean
  fuentes?: string[]   // badges de herramientas usadas
}

interface AnalisisCabida {
  area_terreno: number
  planta_libre: number
  pisos_vivienda: number
  sotanos: number
  area_construida_bruta: number
  area_vendible_total: number
  num_departamentos: number
  estacionamientos_requeridos: number
  estacionamientos_en_sotano: number
  cus_utilizado: number
  limitante: string
}

interface AnalisisEstructural {
  peralte_viga_cm: number
  base_viga_cm: number
  espesor_losa_cm: number
  lado_columna_cm: number
  concreto_total_m3: number
  acero_total_ton: number
}

interface AnalisisFinanciero {
  ingreso_total_usd: number
  costo_total_usd: number
  costo_construccion_usd: number
  costo_terreno_usd: number
  costo_licencias_diseno_usd: number
  costo_marketing_usd: number
  costo_corretaje_usd: number
  costo_supervision_usd: number
  costo_gerencia_usd: number
  costo_imprevistos_usd: number
  costo_titulacion_usd: number
  costo_financiamiento_usd: number
  utilidad_neta_usd: number
  margen_neto_pct: number
  tir_anual_pct: number
  van_usd: number
  payback_meses: number
  punto_equilibrio_deptos: number
  precio_venta_usd_m2: number
  meses_proyecto: number
  flujo_caja: {
    mes: number
    fase: string
    ingresos: number
    egresos: number
    flujo_neto: number
    flujo_equity: number
    flujo_equity_acum: number
  }[]
}

interface AnalisisState {
  cabida?: AnalisisCabida
  estructura?: AnalisisEstructural
  financiero?: AnalisisFinanciero
}

interface PlanoItem {
  nombre: string
  fecha: string
  url: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('es-PE', { maximumFractionDigits: decimals })
}

// ─── Paneles de análisis ──────────────────────────────────────────────────────

function PanelCabida({ d }: { d: AnalisisCabida }) {
  return (
    <div className="space-y-2 text-xs">
      <Row label="Área terreno" value={`${fmt(d.area_terreno)} m²`} />
      <Row label="Planta libre" value={`${fmt(d.planta_libre)} m²`} />
      <Row label="Pisos vivienda" value={String(d.pisos_vivienda)} highlight />
      <Row label="Sótanos" value={String(d.sotanos)} />
      <Row label="Área construida" value={`${fmt(d.area_construida_bruta)} m²`} />
      <Row label="Área vendible" value={`${fmt(d.area_vendible_total)} m²`} highlight />
      <Row label="Departamentos" value={String(d.num_departamentos)} highlight />
      <Row label="Estacionamientos" value={`${d.estacionamientos_requeridos} (${d.estacionamientos_en_sotano} sótano)`} />
      <Row label="CUS utilizado" value={`${d.cus_utilizado}`} />
      <Row label="Factor limitante" value={d.limitante === 'pisos_normativa' ? 'Normativa' : 'CUS'} />
    </div>
  )
}

function PanelEstructura({ d }: { d: AnalisisEstructural }) {
  return (
    <div className="space-y-2 text-xs">
      <Row label="Vigas" value={`${d.base_viga_cm}×${d.peralte_viga_cm} cm`} highlight />
      <Row label="Losa aligerada" value={`h = ${d.espesor_losa_cm} cm`} highlight />
      <Row label="Columnas" value={`${d.lado_columna_cm}×${d.lado_columna_cm} cm`} highlight />
      <div className="border-t border-slate-100 pt-2 mt-2">
        <Row label="Concreto f'c=210" value={`${fmt(d.concreto_total_m3, 1)} m³`} />
        <Row label="Acero fy=4200" value={`${fmt(d.acero_total_ton, 2)} ton`} />
      </div>
    </div>
  )
}


function gruaRecomendada(pisos: number): { tipo: string; costo: string; nota: string } {
  if (pisos <= 6) return { tipo: 'Montacargas industrial', costo: 'S/ 120–144/hora', nota: 'Suficiente para ≤6 pisos' }
  if (pisos <= 10) return { tipo: 'Grúa torre auto-ereccionable', costo: 'USD 3,000–4,500/mes', nota: 'Potain Igo 15/21 — para 6-10 pisos' }
  if (pisos <= 15) return { tipo: 'Grúa torre estándar', costo: 'USD 5,500–8,000/mes', nota: 'Potain MC 85B — 5T / 45m — 8-15 pisos' }
  return { tipo: 'Grúa torre grande', costo: 'USD 10,000–15,000/mes', nota: 'Liebherr 280 EC-H — 8T / 50m — 16+ pisos' }
}

function PanelCostos({ cabida, financiero }: { cabida: AnalisisCabida; financiero?: AnalisisFinanciero }) {
  const grua = gruaRecomendada(cabida.pisos_vivienda)
  const costConstr = financiero && cabida.area_construida_bruta > 0
    ? Math.round(financiero.costo_construccion_usd / cabida.area_construida_bruta)
    : null

  return (
    <div className="space-y-4 text-xs">
      {/* Costo de construcción */}
      <div>
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Costo Construcción</p>
        <div className="space-y-1.5">
          {costConstr && <Row label="Costo/m² construido" value={`USD ${costConstr.toLocaleString()}/m²`} highlight />}
          <Row label="Fuente" value="Revista Costos Ene 2026" />
          <Row label="Tipología base" value="Multifamiliar Lima" />
        </div>
      </div>

      {/* Grúa recomendada */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Grúa Recomendada</p>
        <div className="bg-blue-50 rounded-lg p-2.5 space-y-1">
          <p className="font-semibold text-blue-800 text-xs">{grua.tipo}</p>
          <p className="text-blue-700 font-medium">{grua.costo}</p>
          <p className="text-blue-600 text-[10px]">{grua.nota}</p>
        </div>
      </div>

      {/* Materiales clave */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Materiales Lima — Ene 2026</p>
        <div className="space-y-1.5">
          <Row label="Acero G-60 (promedio)" value="S/ 974.58/ton" highlight />
          <Row label="Varilla 3/8″ × 9m" value="S/ 18.27/var" />
          <Row label="Varilla 1/2″ × 9m" value="S/ 32.08/var" />
          <Row label="Varilla 5/8″ × 9m" value="S/ 49.99/var" />
          <Row label="Cemento Tipo I (prom.)" value="~S/ 24.00/bolsa" highlight />
          <Row label="Rango cemento" value="S/ 20.76–30.93" />
          <Row label="Arena gruesa" value="S/ 49.15/m³" />
          <Row label="Piedra chancada" value="S/ 46.61/m³" />
        </div>
      </div>

      {/* Tipo de cambio */}
      <div className="border-t border-slate-100 pt-2">
        <Row label="Tipo de cambio" value="S/ 3.368 = USD 1.00" />
        <Row label="Fuente" value="Revista Costos Enero 2026" />
      </div>
    </div>
  )
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`font-medium text-right leading-tight ${highlight ? 'text-blue-700' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  )
}

// ─── Módulos del panel ────────────────────────────────────────────────────────

const MODULE_META = [
  { key: 'cabida',    label: 'Cabida',    icon: Layers },
  { key: 'estructura',label: 'Estructura',icon: Building },
  { key: 'financiero',label: 'Financiero',icon: TrendingUp },
  { key: 'costos',    label: 'Costos',    icon: BarChart2 },
  { key: 'planos',    label: 'Planos',    icon: Map },
]

function PanelPlanos({
  planos,
  token,
}: {
  planos: PlanoItem[]
  token: string
}) {
  async function descargar(item: PlanoItem) {
    const res = await fetch(`${API_HOST}${item.url}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.nombre
    a.click()
    URL.revokeObjectURL(url)
  }

  if (planos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Map className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-xs">No hay planos generados aún.</p>
        <p className="text-[10px] mt-1">Pide al asistente: "Genera el plano DXF"</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {planos.map((p) => (
        <div
          key={p.nombre}
          className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2.5"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">Plano C4</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {new Date(p.fecha).toLocaleDateString('es-PE', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
          </div>
          <button
            onClick={() => descargar(p)}
            className="ml-2 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3 h-3" />
            DXF
          </button>
        </div>
      ))}
      <p className="text-[10px] text-slate-400 text-center pt-1">
        Compatible con ZwCAD / AutoCAD / BricsCAD
      </p>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProyectoPage() {
  const { id } = useParams()
  const token = useAuthStore((s) => s.token)

  const [mensajes, setMensajes] = useState<ChatMensaje[]>([
    { id: 0, rol: 'assistant', contenido: 'Hola, soy el **Asistente C4** — motor de pre-inversión para Lima.\n\nVoy a hacerte una serie de preguntas para construir el análisis más preciso posible. Cuantos más datos me des, más exactos serán la cabida, el modelo financiero y el plano DXF.\n\n¿Cuéntame sobre el terreno que tienes? Empieza por la **ubicación o distrito** y si hay algo construido actualmente.' },
  ])
  const [analisis, setAnalisis] = useState<AnalisisState>({})
  const [activeModule, setActiveModule] = useState('cabida')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [steps, setSteps] = useState<{ text: string; icon: string; done: boolean }[]>([])
  const [archivo, setArchivo] = useState<{ nombre: string; tipo: string; base64: string } | null>(null)
  const [docs, setDocs] = useState<{ id: string; nombre: string; tipo: string; createdAt: string }[]>([])
  const [subiendoDoc, setSubiendoDoc] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(false)
  const [planos, setPlanos] = useState<PlanoItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Cargar documentos del proyecto
  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/documentos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDocs(data))
      .catch(() => {})
  }, [id, token])

  async function subirDocumento(file: File) {
    setSubiendoDoc(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch(`${API_BASE}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proyectoId: id, nombre: file.name, mimeType: file.type, base64 }),
        })
        const doc = await res.json()
        setDocs((prev) => [doc, ...prev])
      } finally {
        setSubiendoDoc(false)
      }
    }
    reader.readAsDataURL(file)
  }

  async function eliminarDoc(docId: string) {
    await fetch(`${API_BASE}/documentos/${docId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/${id}/sesion`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(({ mensajes: hist }) => {
        if (hist?.length) {
          setMensajes(
            hist.map((m: any, i: number) => ({
              id: i,
              rol: m.rol,
              contenido: m.contenido,
            })),
          )
        }
      })
      .catch(() => {})
  }, [id, token])

  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/${id}/analisis`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.cabida || data?.estructura || data?.financiero) {
          setAnalisis({
            cabida: data.cabida ?? undefined,
            estructura: data.estructura ?? undefined,
            financiero: data.financiero ?? undefined,
          })
        }
      })
      .catch(() => {})
  }, [id, token])

  // Cargar planos guardados del proyecto
  useEffect(() => {
    if (!id) return
    fetch(`${API_BASE}/chat/planos/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setPlanos(data))
      .catch(() => {})
  }, [id, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setArchivo({ nombre: file.name, tipo: file.type, base64 })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  async function handleSend() {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    setSending(true)
    setArchivo(null)
    setSteps([{ text: 'Analizando tu mensaje...', icon: 'think', done: false }])

    const userId = Date.now()
    const assistantId = userId + 1

    setMensajes((prev) => [
      ...prev,
      { id: userId, rol: 'user', contenido: userMsg },
      { id: assistantId, rol: 'assistant', contenido: '', streaming: true },
    ])

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          proyectoId: id,
          mensaje: userMsg,
          ...(archivo && {
            archivoBase64: archivo.base64,
            archivoNombre: archivo.nombre,
            archivoTipo: archivo.tipo,
          }),
        }),
      })

      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      const fuentesUsadas: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (!part.trim()) continue
          const lines = part.split('\n')
          const eventLine = lines.find((l) => l.startsWith('event:'))
          const dataLine = lines.find((l) => l.startsWith('data:'))
          if (!dataLine) continue

          const eventType = eventLine?.slice(6).trim() ?? 'token'
          let data: any
          try { data = JSON.parse(dataLine.slice(5)) } catch { continue }

          if (eventType === 'token') {
            accumulated += data.text
            setMensajes((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, contenido: accumulated } : m),
            )
          } else if (eventType === 'status') {
            setSteps((prev) => [
              ...prev.map((s) => ({ ...s, done: true })),
              { text: data.step ?? '', icon: data.icon ?? 'think', done: false },
            ])
            // Mapear step → badge de fuente
            const step = data.step ?? ''
            if (step.includes('normativa')) fuentesUsadas.push('Normativa BD')
            else if (step.includes('cabida')) fuentesUsadas.push('Motor Cabida')
            else if (step.includes('structura')) fuentesUsadas.push('Motor Estructura')
            else if (step.includes('caja') || step.includes('TIR')) fuentesUsadas.push('Motor Financiero')
            else if (step.includes('conocimiento')) fuentesUsadas.push('Base de Conocimiento')
            else if (step.includes('normativas') || step.includes('referencias')) fuentesUsadas.push('RAG Normativo')
          } else if (eventType === 'analisis_update') {
            setAnalisis(data)
            if (data.cabida) setActiveModule('cabida')
          } else if (eventType === 'pdf_ready') {
            setMensajes((prev) => [
              ...prev,
              { id: Date.now(), rol: 'pdf', contenido: data.url },
            ])
          } else if (eventType === 'plano_ready') {
            // Insertar el botón ANTES del placeholder del asistente, para que quede visible
            setMensajes((prev) => {
              const idx = prev.findIndex((m) => m.id === assistantId)
              const planoMsg = { id: Date.now(), rol: 'plano' as const, contenido: data.url }
              if (idx === -1) return [...prev, planoMsg]
              return [...prev.slice(0, idx), planoMsg, ...prev.slice(idx)]
            })
            // Refrescar lista de planos guardados
            fetch(`${API_BASE}/chat/planos/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then((r) => r.json())
              .then((data) => Array.isArray(data) && setPlanos(data))
              .catch(() => {})
          } else if (eventType === 'done') {
            setSteps((prev) => prev.map((s) => ({ ...s, done: true })))
            setTimeout(() => setSteps([]), 1800)
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, streaming: false, fuentes: fuentesUsadas.length > 0 ? [...new Set(fuentesUsadas)] : undefined }
                  : m,
              ),
            )
          } else if (eventType === 'error') {
            setSteps([])
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, contenido: '⚠️ Error al procesar. Intenta de nuevo.', streaming: false }
                  : m,
              ),
            )
          }
        }
      }
    } catch {
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, contenido: '⚠️ No se pudo conectar con el asistente.', streaming: false }
            : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const tieneAnalisis = Object.keys(analisis).length > 0

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Panel izquierdo — Resultados ── */}
      <div className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 ${panelExpanded ? 'w-1/2' : 'w-64'}`}>

        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">Análisis C4</p>
            <p className="text-xs text-slate-400 mt-0.5">Pre-inversión · Lima, Perú</p>
          </div>
          <button
            onClick={() => {
              setPanelExpanded((v) => {
                const next = !v
                if (next && analisis.financiero) setActiveModule('financiero')
                return next
              })
            }}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
            title={panelExpanded ? 'Contraer panel' : 'Expandir panel'}
          >
            {panelExpanded ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
          {MODULE_META.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveModule(key)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-2 px-2 text-[10px] transition-all ${
                activeModule === key
                  ? 'text-blue-600 border-b-2 border-blue-600 font-medium'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={{ minWidth: '20%' }}
            >
              <Icon className="w-3 h-3" />
              <span className="leading-tight">{label}</span>
            </button>
          ))}
        </div>

        {/* Contenido del panel */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!tieneAnalisis ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <BarChart2 className="w-8 h-8 text-slate-200" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingresa un terreno en el chat para ver el análisis de pre-inversión.
              </p>
            </div>
          ) : (
            <>
              {activeModule === 'cabida' && analisis.cabida && (
                <PanelCabida d={analisis.cabida} />
              )}
              {activeModule === 'estructura' && analisis.estructura && (
                <PanelEstructura d={analisis.estructura} />
              )}
              {activeModule === 'financiero' && analisis.financiero && (
                <FinancieroPanel financiero={analisis.financiero as any} />
              )}
              {activeModule === 'costos' && analisis.cabida && (
                <PanelCostos cabida={analisis.cabida} financiero={analisis.financiero} />
              )}
              {activeModule === 'planos' && (
                <PanelPlanos planos={planos} token={token!} />
              )}
              {activeModule === 'cabida' && !analisis.cabida && (
                <p className="text-xs text-slate-400">Datos de cabida no disponibles.</p>
              )}
              {activeModule === 'estructura' && !analisis.estructura && (
                <p className="text-xs text-slate-400">Datos estructurales no disponibles.</p>
              )}
              {activeModule === 'financiero' && !analisis.financiero && (
                <p className="text-xs text-slate-400">Datos financieros no disponibles.</p>
              )}
              {activeModule === 'costos' && !analisis.cabida && (
                <p className="text-xs text-slate-400">Ejecuta un análisis primero para ver costos.</p>
              )}
            </>
          )}
        </div>

        {/* Footer note */}
        {tieneAnalisis && (
          <div className="px-4 py-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-300 leading-relaxed">
              Valores referenciales. Estructura empírica pre-ETABS.
            </p>
          </div>
        )}

        {/* Panel documentos del proyecto */}
        {!panelExpanded && <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-600">Documentos del proyecto</p>
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={subiendoDoc}
              className="w-6 h-6 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors disabled:opacity-40"
              title="Subir documento"
            >
              {subiendoDoc ? <Loader2 className="w-3 h-3 text-blue-500 animate-spin" /> : <Plus className="w-3 h-3 text-blue-600" />}
            </button>
          </div>
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) subirDocumento(f); e.target.value = '' }}
          />
          {docs.length === 0 ? (
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Sube PDFs o imágenes y el agente los usará como contexto permanente.
            </p>
          ) : (
            <div className="space-y-1">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 group">
                  <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-[11px] text-slate-600 flex-1 truncate">{doc.nombre}</span>
                  <button
                    onClick={() => eliminarDoc(doc.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>

      {/* ── Panel derecho — Chat ── */}
      <div className="flex-1 flex flex-col bg-slate-50 min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Asistente C4</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {sending ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block animate-pulse" />
                    <span className="text-blue-600">
                      {steps.find((s) => !s.done)?.text ?? 'Procesando...'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                    Listo · GPT-4o
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Panel de pasos animados */}
          {steps.length > 0 && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 space-y-1.5">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {step.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 shrink-0 animate-spin" />
                    )}
                    <span className={`text-xs ${step.done ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
                      {step.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mensajes.map((msg) => msg.rol === 'pdf' ? (
            <div key={msg.id} className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <button
                onClick={() => {
                  if (!token) return
                  fetch(`${API_HOST}${msg.contenido}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }).then((r) => r.blob()).then((blob) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'informe-c4.pdf'
                    document.body.appendChild(a); a.click()
                    document.body.removeChild(a); URL.revokeObjectURL(url)
                  })
                }}
                className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar informe PDF
              </button>
            </div>
          ) : msg.rol === 'plano' ? (
            <div key={msg.id} className="flex justify-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Map className="w-3.5 h-3.5 text-white" />
              </div>
              <button
                onClick={() => {
                  if (!token) return
                  fetch(`${API_HOST}${msg.contenido}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  }).then((r) => r.blob()).then((blob) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'plano-c4.dxf'
                    document.body.appendChild(a); a.click()
                    document.body.removeChild(a); URL.revokeObjectURL(url)
                  })
                }}
                className="flex items-center gap-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-2xl rounded-bl-sm shadow-sm px-4 py-3 text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar plano DXF · ZwCAD / AutoCAD
              </button>
            </div>
          ) : (
            <div key={msg.id} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.rol === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  {msg.streaming
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5 text-white" />}
                </div>
              )}
              <div className="flex flex-col items-start max-w-lg">
                <div
                  className={`w-full rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.rol === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.rol === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.contenido}</span>
                  ) : msg.contenido ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children }) => <p className="font-bold text-slate-800 text-sm mb-2 mt-1">{children}</p>,
                        h3: ({ children }) => <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-1.5 mt-3 first:mt-0">{children}</p>,
                        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                        ul: ({ children }) => <ul className="space-y-0.5 mb-1.5">{children}</ul>,
                        li: ({ children }) => <li className="flex gap-1.5"><span className="text-slate-400 shrink-0">·</span><span>{children}</span></li>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-200 pl-3 text-slate-400 italic text-xs mt-2">{children}</blockquote>,
                        hr: () => <hr className="border-slate-100 my-2" />,
                        table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                        thead: ({ children }) => <thead>{children}</thead>,
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => <tr className="border-b border-slate-100 last:border-0">{children}</tr>,
                        th: ({ children }) => <th className="text-left font-semibold text-slate-600 py-1 pr-3 first:pl-0">{children}</th>,
                        td: ({ children }) => <td className="py-0.5 pr-3 first:pl-0 text-slate-700">{children}</td>,
                      }}
                    >
                      {msg.contenido}
                    </ReactMarkdown>
                  ) : msg.streaming ? (
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : null}
                </div>

                {/* Badges de fuentes — debajo del bubble, solo en mensajes finalizados */}
                {msg.rol === 'assistant' && !msg.streaming && msg.fuentes && msg.fuentes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {msg.fuentes.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-md px-2 py-0.5"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />

        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-5 py-4 shrink-0">
          {/* Chip archivo adjunto */}
          {archivo && (
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-xl">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-xs truncate">{archivo.nombre}</span>
                <button onClick={() => setArchivo(null)} className="text-blue-400 hover:text-blue-600 transition-colors ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-blue-500 transition-colors shrink-0 pb-0.5"
              title="Adjuntar PDF o imagen"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder="Ej: Tengo un terreno de 300m² en Miraflores, frente 15 metros..."
              className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none resize-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-8 h-8 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">
            Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  )
}
