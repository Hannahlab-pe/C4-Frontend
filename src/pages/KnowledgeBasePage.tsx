import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import clsx from 'clsx'
import { API_BASE } from '../lib/config'

interface DocKb {
  nombre: string
  chunks: number
  created_at: string
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function KnowledgeBasePage() {
  const token = useAuthStore((s) => s.token)
  const [docs, setDocs] = useState<DocKb[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadMsg, setUploadMsg] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchDocs() {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/knowledge-base/documentos`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDocs(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDocs() }, [])

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadState('error')
      setUploadMsg('Solo se aceptan archivos PDF')
      return
    }

    setUploadState('uploading')
    setUploadMsg(`Procesando "${file.name}"...`)

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1]
      try {
        const res = await fetch(`${API_BASE}/knowledge-base/ingest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nombre: file.name, base64 }),
        })
        const data = await res.json()
        if (res.ok) {
          setUploadState('success')
          setUploadMsg(`"${file.name}" procesado — ${data.chunks} fragmentos indexados`)
          fetchDocs()
        } else {
          setUploadState('error')
          setUploadMsg(data.message ?? 'Error al procesar el PDF')
        }
      } catch (err: any) {
        setUploadState('error')
        setUploadMsg(err?.message ?? 'Error de red')
      }
    }
    reader.readAsDataURL(file)
  }

  async function eliminar(nombre: string) {
    setDeleting(nombre)
    try {
      await fetch(`${API_BASE}/knowledge-base/documentos/${encodeURIComponent(nombre)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setDocs((prev) => prev.filter((d) => d.nombre !== nombre))
    } finally {
      setDeleting(null)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Base de Conocimiento</h1>
        <p className="text-sm text-slate-500 mt-1">
          Documentos técnicos y procedimientos que el Agente C4 consultará en cada conversación
        </p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors',
          uploadState === 'uploading'
            ? 'border-blue-300 bg-blue-50 pointer-events-none'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50',
        )}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
        {uploadState === 'uploading' ? (
          <div className="flex flex-col items-center gap-3 text-blue-600">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">{uploadMsg}</p>
            <p className="text-xs text-blue-400">Extrayendo texto y generando embeddings...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Upload className="w-8 h-8" />
            <div>
              <p className="text-sm font-medium text-slate-600">Arrastra un PDF o haz clic para seleccionar</p>
              <p className="text-xs mt-1">Procedimientos AT-PR, fichas técnicas, planos, normativas internas</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload feedback */}
      {(uploadState === 'success' || uploadState === 'error') && (
        <div className={clsx(
          'flex items-start gap-3 rounded-xl px-4 py-3 text-sm',
          uploadState === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {uploadState === 'success'
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          }
          <span>{uploadMsg}</span>
          <button
            className="ml-auto text-xs underline opacity-60 hover:opacity-100"
            onClick={() => setUploadState('idle')}
          >
            cerrar
          </button>
        </div>
      )}

      {/* Documents list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">Documentos indexados</h2>
          <span className="text-xs text-slate-400">{docs.length} documento{docs.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Cargando...</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-slate-400 gap-2">
            <FileText className="w-8 h-8 opacity-40" />
            <p className="text-sm">Ningún documento indexado aún</p>
            <p className="text-xs">Sube los PDFs de Betondecken para empezar</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <li key={doc.nombre} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {doc.chunks} fragmentos · {new Date(doc.created_at).toLocaleDateString('es-PE')}
                  </p>
                </div>
                <button
                  onClick={() => eliminar(doc.nombre)}
                  disabled={deleting === doc.nombre}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                  title="Eliminar documento"
                >
                  {deleting === doc.nombre
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
