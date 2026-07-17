import { create } from 'zustand'
import { API_BASE } from '../lib/config'
import { useAuthStore } from './authStore'

export interface ChatMensaje {
  id: number
  rol: 'user' | 'assistant' | 'pdf' | 'plano' | 'excel' | 'confirmacion'
  contenido: string
  streaming?: boolean
  adjuntos?: { nombre: string; tipo: string; base64: string }[]
}
export interface ChatStep { text: string; icon: string; done: boolean }

// Acción de escritura propuesta por la IA, esperando confirmación explícita del usuario (gate).
export interface AccionResumen { tool: string; esEscritura: boolean; modulo: string; descripcion: string; datos: any }
export interface AccionPendiente { resumen: string; acciones: AccionResumen[] }

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
  pendiente: AccionPendiente | null
  setOpen: (v: boolean) => void
  toggle: () => void
  setWidth: (n: number) => void
  toggleExpanded: () => void
  cargarSesion: (proyectoId: string) => Promise<void>
  enviar: (texto: string, archivos?: { nombre: string; tipo: string; base64: string }[], faseActual?: string) => Promise<void>
  confirmar: () => Promise<void>
  cancelar: () => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => {
  const patchMsg = (assistantId: number, patch: Partial<ChatMensaje>) =>
    set((s) => ({ mensajes: s.mensajes.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)) }))

  // Lector SSE compartido por enviar/confirmar/cancelar (mismo protocolo de eventos).
  const procesarSSE = async (res: Response, assistantId: number) => {
    const reader = res.body!.getReader()
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
          patchMsg(assistantId, { contenido: accumulated })
        } else if (eventType === 'status') {
          set((s) => ({
            steps: [...s.steps.map((st) => ({ ...st, done: true })), { text: data.step ?? '', icon: data.icon ?? 'think', done: false }],
          }))
        } else if (eventType === 'confirmacion_requerida') {
          // El gate propone una escritura: mostramos la tarjeta Confirmar/Cancelar.
          set({ pendiente: { resumen: data.resumen ?? '', acciones: data.acciones ?? [] } })
        } else if (eventType === 'pdf_ready') {
          set((s) => ({ mensajes: [...s.mensajes, { id: Date.now(), rol: 'pdf', contenido: data.url }] }))
        } else if (eventType === 'excel_ready') {
          set((s) => ({ mensajes: [...s.mensajes, { id: Date.now(), rol: 'excel', contenido: data.url }] }))
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
          patchMsg(assistantId, { streaming: false })
          setTimeout(() => set({ steps: [] }), 1800)
        } else if (eventType === 'error') {
          set({ steps: [] })
          patchMsg(assistantId, { contenido: '⚠️ ' + (data?.message || 'Error al procesar. Intenta de nuevo.'), streaming: false })
        }
      }
    }
  }

  return {
    open: false,
    width: 400,
    expanded: false,
    proyectoId: null,
    mensajes: [SALUDO],
    sending: false,
    steps: [],
    pendiente: null,

    setOpen: (v) => set({ open: v }),
    toggle: () => set((s) => ({ open: !s.open })),
    setWidth: (n) => set({ width: n }),
    toggleExpanded: () => set((s) => ({ expanded: !s.expanded })),

    // Carga el historial solo al cambiar de proyecto. Si es el mismo proyecto,
    // NO reinicia (preserva un stream en curso al navegar entre módulos).
    cargarSesion: async (proyectoId) => {
      if (get().proyectoId === proyectoId) return
      set({ proyectoId, mensajes: [SALUDO], steps: [], sending: false, pendiente: null })
      const token = useAuthStore.getState().token
      try {
        const r = await fetch(`${API_BASE}/chat/${proyectoId}/sesion`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const { mensajes: hist } = await r.json()
        if (hist?.length && get().proyectoId === proyectoId && !get().sending) {
          set({ mensajes: hist.map((m: any, i: number) => ({ id: i, rol: m.rol, contenido: m.contenido })) })
        }
      } catch { /* noop */ }
    },

    enviar: async (texto, archivos, faseActual) => {
      const { sending, proyectoId } = get()
      if (!texto.trim() || sending || !proyectoId) return
      const token = useAuthStore.getState().token

      const userId = Date.now()
      const assistantId = userId + 1
      set((s) => ({
        sending: true,
        pendiente: null,
        steps: [{ text: 'Analizando tu mensaje...', icon: 'think', done: false }],
        mensajes: [
          ...s.mensajes,
          { id: userId, rol: 'user', contenido: texto.trim(), adjuntos: archivos },
          { id: assistantId, rol: 'assistant', contenido: '', streaming: true },
        ],
      }))

      try {
        const res = await fetch(`${API_BASE}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            proyectoId,
            mensaje: texto.trim(),
            ...(faseActual && { faseActual }),
            ...(archivos?.length === 1 && { archivoBase64: archivos[0].base64, archivoNombre: archivos[0].nombre, archivoTipo: archivos[0].tipo }),
            ...(archivos && archivos.length > 1 && { archivos }),
          }),
        })
        if (!res.ok || !res.body) throw new Error('stream failed')
        await procesarSSE(res, assistantId)
      } catch {
        patchMsg(assistantId, { contenido: '⚠️ No se pudo conectar con el asistente.', streaming: false })
      } finally {
        set({ sending: false })
      }
    },

    // Gate: el usuario CONFIRMA la acción de escritura pendiente → el backend la ejecuta y audita.
    confirmar: async () => {
      const { sending, proyectoId, pendiente } = get()
      if (sending || !proyectoId || !pendiente) return
      const token = useAuthStore.getState().token
      const label = pendiente.resumen || pendiente.acciones.map((a) => a.descripcion).filter(Boolean).join('; ') || 'la acción'
      const confirmId = Date.now()
      const assistantId = confirmId + 1
      set((s) => ({
        sending: true,
        pendiente: null,
        steps: [{ text: 'Ejecutando lo confirmado...', icon: 'think', done: false }],
        mensajes: [
          ...s.mensajes,
          { id: confirmId, rol: 'confirmacion', contenido: `✅ Confirmaste: ${label}` },
          { id: assistantId, rol: 'assistant', contenido: '', streaming: true },
        ],
      }))
      try {
        const res = await fetch(`${API_BASE}/chat/confirmar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proyectoId }),
        })
        if (!res.ok || !res.body) throw new Error('confirm failed')
        await procesarSSE(res, assistantId)
      } catch {
        patchMsg(assistantId, { contenido: '⚠️ No se pudo ejecutar la acción confirmada.', streaming: false })
      } finally {
        set({ sending: false })
      }
    },

    // Gate: el usuario CANCELA → no se ejecuta nada; el asistente lo acusa.
    cancelar: async () => {
      const { sending, proyectoId, pendiente } = get()
      if (sending || !proyectoId || !pendiente) return
      const token = useAuthStore.getState().token
      const label = pendiente.resumen || pendiente.acciones.map((a) => a.descripcion).filter(Boolean).join('; ') || 'la acción'
      const confirmId = Date.now()
      const assistantId = confirmId + 1
      set((s) => ({
        sending: true,
        pendiente: null,
        steps: [],
        mensajes: [
          ...s.mensajes,
          { id: confirmId, rol: 'confirmacion', contenido: `🚫 Cancelaste: ${label}` },
          { id: assistantId, rol: 'assistant', contenido: '', streaming: true },
        ],
      }))
      try {
        const res = await fetch(`${API_BASE}/chat/cancelar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ proyectoId }),
        })
        if (!res.ok || !res.body) throw new Error('cancel failed')
        await procesarSSE(res, assistantId)
      } catch {
        patchMsg(assistantId, { contenido: 'Acción cancelada.', streaming: false })
      } finally {
        set({ sending: false })
      }
    },
  }
})
