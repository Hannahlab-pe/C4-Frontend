import { create } from 'zustand'

export type EstadoGuardado = 'idle' | 'saving' | 'saved' | 'error'

interface GuardadoState {
  estado: EstadoGuardado
  setEstado: (e: EstadoGuardado) => void
}

export const useGuardadoStore = create<GuardadoState>((set) => ({
  estado: 'idle',
  setEstado: (estado) => set({ estado }),
}))

/** Helper para avisar el estado de guardado desde cualquier módulo, sin suscribirse. */
export const setGuardado = (e: EstadoGuardado) => useGuardadoStore.getState().setEstado(e)
