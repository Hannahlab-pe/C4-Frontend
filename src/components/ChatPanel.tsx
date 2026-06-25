import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  Send, Mic, Paperclip, Sparkles, Loader2,
  CheckCircle2, Download, FileText, X, Plus, Trash2, Map,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { API_BASE, API_HOST } from '../lib/config'

interface Props {
  proyectoId: string
}

export default function ChatPanel({ proyectoId }: Props) {
  const token = useAuthStore((s) => s.token)
  const headers = { Authorization: `Bearer ${token}` }
  const { pathname } = useLocation()

  // Estado del chat y streaming viven en el store global → persisten al navegar
  const mensajes = useChatStore((s) => s.mensajes)
  const sending = useChatStore((s) => s.sending)
  const steps = useChatStore((s) => s.steps)
  const cargarSesion = useChatStore((s) => s.cargarSesion)
  const enviar = useChatStore((s) => s.enviar)
  const setOpen = useChatStore((s) => s.setOpen)

  const [input, setInput] = useState('')
  const [archivo, setArchivo] = useState<{ nombre: string; tipo: string; base64: string } | null>(null)
  const [docs, setDocs] = useState<{ id: string; nombre: string; tipo: string }[]>([])
  const [subiendoDoc, setSubiendoDoc] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Carga la sesión del proyecto (el store no reinicia si ya es el mismo)
  useEffect(() => { cargarSesion(proyectoId) }, [proyectoId, cargarSesion])

  // Cargar documentos del proyecto
  useEffect(() => {
    fetch(`${API_BASE}/documentos/${proyectoId}`, { headers })
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setDocs(data))
      .catch(() => {})
  }, [proyectoId])

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

  async function subirDocumento(file: File) {
    setSubiendoDoc(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1]
      try {
        const res = await fetch(`${API_BASE}/documentos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proyectoId, nombre: file.name, mimeType: file.type, base64 }),
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
    await fetch(`${API_BASE}/documentos/${docId}`, { method: 'DELETE', headers })
    setDocs((prev) => prev.filter((d) => d.id !== docId))
  }

  function handleSend() {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    const adjunto = archivo ?? undefined
    setArchivo(null)
    // Fase que el usuario está viendo (contexto para la IA)
    const m = pathname.match(/\/panel\/(demolicion|excavacion|construccion|acabados|administracion)/)
    const faseActual = m?.[1]
    // El streaming corre en el store: continúa aunque navegues o desmontes el panel
    enviar(userMsg, adjunto, faseActual)
  }

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Asistente C4</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              {sending ? (
                <>
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-blue-600">{steps.find((s) => !s.done)?.text ?? 'Procesando...'}</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Listo · GPT-4o
                </>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50">

        {/* Pasos animados del agente */}
        {steps.length > 0 && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm px-3 py-2.5 space-y-1.5">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  {step.done
                    ? <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    : <Loader2 className="w-3 h-3 text-blue-500 shrink-0 animate-spin" />
                  }
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
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <FileText className="w-3 h-3 text-white" />
            </div>
            <button
              onClick={() => {
                if (!token) return
                fetch(`${API_HOST}${msg.contenido}`, { headers })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'informe-c4.pdf'
                    document.body.appendChild(a); a.click()
                    document.body.removeChild(a); URL.revokeObjectURL(url)
                  })
              }}
              className="flex items-center gap-2 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-2xl rounded-bl-sm shadow-sm px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar informe PDF
            </button>
          </div>
        ) : msg.rol === 'plano' ? (
          <div key={msg.id} className="flex justify-start">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
              <Map className="w-3 h-3 text-white" />
            </div>
            <button
              onClick={() => {
                if (!token) return
                fetch(`${API_HOST}${msg.contenido}`, { headers })
                  .then((r) => r.blob())
                  .then((blob) => {
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url; a.download = 'plano-c4.dxf'
                    document.body.appendChild(a); a.click()
                    document.body.removeChild(a); URL.revokeObjectURL(url)
                  })
              }}
              className="flex items-center gap-2 bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-2xl rounded-bl-sm shadow-sm px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar plano DXF · ZwCAD / AutoCAD
            </button>
          </div>
        ) : (
          <div key={msg.id} className={`flex ${msg.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.rol === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                {msg.streaming
                  ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                  : <Sparkles className="w-3 h-3 text-white" />
                }
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              msg.rol === 'user'
                ? 'bg-blue-600 text-white rounded-br-sm'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
            }`}>
              {msg.rol === 'user' ? (
                <div className="space-y-2">
                  {msg.adjunto && (
                    msg.adjunto.tipo.startsWith('image/') ? (
                      <img
                        src={`data:${msg.adjunto.tipo};base64,${msg.adjunto.base64}`}
                        alt={msg.adjunto.nombre}
                        className="max-w-50 rounded-xl block"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 bg-blue-500/30 rounded-lg px-2 py-1">
                        <FileText className="w-3 h-3 shrink-0" />
                        <span className="text-xs truncate max-w-40">{msg.adjunto.nombre}</span>
                      </div>
                    )
                  )}
                  {msg.contenido && <span className="whitespace-pre-wrap">{msg.contenido}</span>}
                </div>
              ) : msg.contenido ? (
                <ReactMarkdown
                  components={{
                    h2: ({ children }) => <p className="font-bold text-slate-800 text-sm mb-1.5 mt-1">{children}</p>,
                    h3: ({ children }) => <p className="font-semibold text-slate-700 text-xs uppercase tracking-wide mb-1 mt-2.5 first:mt-0">{children}</p>,
                    p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                    ul: ({ children }) => <ul className="space-y-0.5 mb-1.5">{children}</ul>,
                    li: ({ children }) => <li className="flex gap-1.5"><span className="text-slate-400 shrink-0">·</span><span>{children}</span></li>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-slate-200 pl-3 text-slate-400 italic text-xs mt-2">{children}</blockquote>,
                    hr: () => <hr className="border-slate-100 my-2" />,
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
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Documentos del proyecto */}
      <div className="border-t border-slate-100 bg-white px-4 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-slate-500">Documentos del proyecto</p>
          <button
            onClick={() => docInputRef.current?.click()}
            disabled={subiendoDoc}
            className="w-5 h-5 rounded-md bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            {subiendoDoc ? <Loader2 className="w-3 h-3 text-blue-500 animate-spin" /> : <Plus className="w-3 h-3 text-blue-600" />}
          </button>
        </div>
        <input
          ref={docInputRef}
          type="file"
          accept=".pdf,.dxf,image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subirDocumento(f); e.target.value = '' }}
        />
        {docs.length === 0 ? (
          <p className="text-[10px] text-slate-400">Sube PDFs o imágenes como contexto del proyecto.</p>
        ) : (
          <div className="space-y-0.5 max-h-20 overflow-y-auto">
            {docs.map((doc) => (
              <div key={doc.id} className="flex items-center gap-1.5 group">
                <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-600 flex-1 truncate">{doc.nombre}</span>
                <button onClick={() => eliminarDoc(doc.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        {archivo && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-lg">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="max-w-50 truncate">{archivo.nombre}</span>
              <button onClick={() => setArchivo(null)} className="text-blue-400 hover:text-blue-600 ml-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.dxf,image/*" className="hidden" onChange={handleFileChange} />
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-slate-400 hover:text-blue-500 transition-colors shrink-0 pb-0.5"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escribe tu mensaje, sube un documento o pregunta algo técnico..."
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none resize-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-7 h-7 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">Enter para enviar · Shift+Enter para nueva línea</p>
      </div>
    </div>
  )
}
