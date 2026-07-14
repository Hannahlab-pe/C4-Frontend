import { create } from 'zustand'
import { API_BASE } from '../lib/config'
import { useAuthStore } from './authStore'

export interface ChatMensaje {
  id: number
  rol: 'user' | 'assistant' | 'pdf' | 'plano'
  contenido: string
  streaming?: boolean
  adjunto?: { nombre: string; tipo: string; base64: string }
}
export interface ChatStep { text: string; icon: string; done: boolean }

const SALUDO: ChatMensaje = {
  id: 0, rol: 'assistant',
  contenido: 'Hola, soy el **Asistente C4**. ¿Qué hacemos hoy?\n\nPuedo ayudarte a:\n\n🏗️ **Evaluar un terreno** — dime la ubicación y te digo cuánto puedes construir, costos y rentabilidad.\n📋 **Auditar tu proyecto** — si ya tienes planos, contratos o expediente, súbelos y reviso incidencias, normativa y mejoras.\n📐 **Generar el plan de obra** — cuando validemos los números, armo las fases (demolición, excavación, construcción, acabados, administración).\n📚 **Resolver dudas técnicas** — normativa (RNE), costos de mercado, grúas, trámites municipales.\n\nCuéntame en qué estás.',
}

// Eventos para que los módulos se refresquen en vivo cuando la IA genera cosas
function emit(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }))
}

interface ChatStore {
  open: boolean
  width: number
  expanded: boolean
  proyectoId: string | null
  mensajes: ChatMensaje[]
  sending: boolean
  steps: ChatStep[]
  setOpen: (v: boolean) => void
  toggle: () => void
  setWidth: (n: number) => void
  toggleExpanded: () => void
  cargarSesion: (proyectoId: string) => Promise<void>
  enviar: (texto: string, archivo?: { nombre: string; tipo: string; base64: string }, faseActual?: string) => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  open: false,
  width: 400,
  expanded: false,
  proyectoId: null,
  mensajes: [SALUDO],
  sending: false,
  steps: [],

  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
  setWidth: (n) => set({ width: n }),
  toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

  // Carga el historial solo al cambiar de proyecto. Si es el mismo proyecto,
  // NO reinicia (preserva un stream en curso al navegar entre módulos).
  cargarSesion: async (proyectoId) => {
    if (get().proyectoId === proyectoId) return
    set({ proyectoId, mensajes: [SALUDO], steps: [], sending: false })
    const token = useAuthStore.getState().token
    try {
      const r = await fetch(`${API_BASE}/chat/${proyectoId}/sesion`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const { mensajes: hist } = await r.json()
      // Solo aplica si seguimos en el mismo proyecto y no arrancó un stream entretanto
      if (hist?.length && get().proyectoId === proyectoId && !get().sending) {
        set({ mensajes: hist.map((m: any, i: number) => ({ id: i, rol: m.rol, contenido: m.contenido })) })
      }
    } catch { /* noop */ }
  },

  enviar: async (texto, archivo, faseActual) => {
    const { sending, proyectoId } = get()
    if (!texto.trim() || sending || !proyectoId) return
    const token = useAuthStore.getState().token

    const userId = Date.now()
    const assistantId = userId + 1
    set((s) => ({
      sending: true,
      steps: [{ text: 'Analizando tu mensaje...', icon: 'think', done: false }],
      mensajes: [
        ...s.mensajes,
        { id: userId, rol: 'user', contenido: texto.trim(), adjunto: archivo },
        { id: assistantId, rol: 'assistant', contenido: '', streaming: true },
      ],
    }))

    const patchAsistente = (patch: Partial<ChatMensaje>) =>
      set((s) => ({ mensajes: s.mensajes.map((m) => m.id === assistantId ? { ...m, ...patch } : m) }))

    try {
      const res = await fetch(`${API_BASE}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          proyectoId,
          mensaje: texto.trim(),
          ...(faseActual && { faseActual }),
          ...(archivo && { archivoBase64: archivo.base64, archivoNombre: archivo.nombre, archivoTipo: archivo.tipo }),
        }),
      })
      if (!res.ok || !res.body) throw new Error('stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

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
            patchAsistente({ contenido: accumulated })
          } else if (eventType === 'status') {
            set((s) => ({
              steps: [...s.steps.map((st) => ({ ...st, done: true })), { text: data.step ?? '', icon: data.icon ?? 'think', done: false }],
            }))
          } else if (eventType === 'pdf_ready') {
            set((s) => ({ mensajes: [...s.mensajes, { id: Date.now(), rol: 'pdf', contenido: data.url }] }))
          } else if (eventType === 'plano_ready') {
            set((s) => {
              const idx = s.mensajes.findIndex((m) => m.id === assistantId)
              const planoMsg: ChatMensaje = { id: Date.now(), rol: 'plano', contenido: data.url }
              if (idx === -1) return { mensajes: [...s.mensajes, planoMsg] }
              return { mensajes: [...s.mensajes.slice(0, idx), planoMsg, ...s.mensajes.slice(idx)] }
            })
          } else if (eventType === 'analisis_update') {
            emit('c4:analisis-updated', data)
          } else if (eventType === 'etapas_creadas') {
            emit('c4:etapas-updated', { fase: data.fase })
          } else if (eventType === 'documentos_actualizados') {
            emit('c4:documentos-updated', { fase: data.fase })
          } else if (eventType === 'seguridad_actualizada') {
            emit('c4:seguridad-updated', { fase: data.fase })
          } else if (eventType === 'colindantes_actualizados') {
            emit('c4:colindantes-updated', {})
          } else if (eventType === 'calzaduras_actualizadas') {
            emit('c4:calzaduras-updated', {})
          } else if (eventType === 'tierras_actualizadas') {
            emit('c4:tierras-updated', {})
          } else if (eventType === 'suelos_actualizados') {
            emit('c4:suelos-updated', {})
          } else if (eventType === 'metrado_actualizado') {
            emit('c4:metrado-updated', {})
          } else if (eventType === 'cronograma_actualizado') {
            emit('c4:cronograma-updated', {})
          } else if (eventType === 'personal_actualizado') {
            emit('c4:personal-updated', {})
          } else if (eventType === 'concreto_actualizado') {
            emit('c4:concreto-updated', {})
          } else if (eventType === 'productividad_actualizada') {
            emit('c4:productividad-updated', { fase: data.fase })
          } else if (eventType === 'proyecto_generado') {
            emit('c4:proyecto-updated', { fases: data.fases })
          } else if (eventType === 'done') {
            set((s) => ({ steps: s.steps.map((st) => ({ ...st, done: true })) }))
            patchAsistente({ streaming: false })
            setTimeout(() => set({ steps: [] }), 1800)
          } else if (eventType === 'error') {
            set({ steps: [] })
            patchAsistente({ contenido: '⚠️ Error al procesar. Intenta de nuevo.', streaming: false })
          }
        }
      }
    } catch {
      patchAsistente({ contenido: '⚠️ No se pudo conectar con el asistente.', streaming: false })
    } finally {
      set({ sending: false })
    }
  },
}))
