import api from './api'

// ── Tipos (calzan con las entidades/motor del backend) ──────────────────────
export type TipoRecurso = 'MO' | 'MAT' | 'EQP' | 'SUB'
export type ClaseApu = TipoRecurso | 'PARTIDA'
export type TipoItem = 'titulo' | 'partida'
export type TipoPresupuesto = 'meta' | 'venta' | 'linea_base' | 'estimado_ia'

export interface Recurso {
  id: string
  codigo: string
  nombre: string
  tipo: TipoRecurso
  familia: string
  unidad: string
  precioUnitario: string // decimal viene como string
  moneda: string
  proyectoId?: string | null
}

export interface Partida {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  especialidad: string
  esSubpartida: boolean
  proyectoId?: string | null
}

export interface ApuLinea {
  id?: string
  partidaId?: string
  clase: ClaseApu
  refId: string
  cuadrilla?: number | string | null
  rendimiento?: number | string | null
  cantidad?: number | string | null
  precioSnapshot?: string | null
  parcial?: string | null
  orden?: number
}

export interface ApuLineaCalc {
  clase: ClaseApu
  refId: string
  cantidad: string
  precioUnitario: string
  parcial: string
}

export interface ApuResultado {
  costoUnitario: string
  lineas: ApuLineaCalc[]
  porGenerico: Record<TipoRecurso, string>
}

export interface ApuResponse {
  lineas: ApuLinea[]
  calculo: ApuResultado
}

export interface Presupuesto {
  id: string
  proyectoId: string
  nombre: string
  tipo: TipoPresupuesto
  moneda: string
  ggFijo: string
  ggPorcentaje: string
  utilidadPorcentaje: string
  igvPorcentaje: string
  congelado: boolean
  origenId?: string | null
  createdAt?: string
}

export interface PresupuestoItem {
  id: string
  presupuestoId: string
  parentId?: string | null
  tipo: TipoItem
  codigo: string
  descripcion: string
  partidaId?: string | null
  metrado?: string | null
  costoUnitarioSnapshot?: string | null
  porGenericoSnapshot?: Record<TipoRecurso, number> | null
  parcial?: string | null
  orden: number
}

/** Dto de entrada para crear/editar items del árbol (metrado va como número). */
export interface ItemInput {
  parentId?: string | null
  tipo?: TipoItem
  partidaId?: string | null
  codigo?: string
  descripcion?: string
  metrado?: number
}

export interface ArbolResponse {
  presupuesto: Presupuesto
  items: PresupuestoItem[]
  parciales: Record<string, number>
  subtotales: Record<string, number>
  costoDirecto: number
  gastosGenerales: number
  utilidad: number
  subtotal: number
  igv: number
  total: number
  porGenerico: Record<TipoRecurso, number>
}

// ── Etiquetas / colores por tipo de recurso ─────────────────────────────────
export const TIPO_RECURSO_META: Record<TipoRecurso, { label: string; badge: string }> = {
  MO:  { label: 'Mano de obra', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  MAT: { label: 'Material',     badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  EQP: { label: 'Equipo',       badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  SUB: { label: 'Subcontrato',  badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

export const TIPO_PRESUP_META: Record<TipoPresupuesto, { label: string; badge: string }> = {
  meta:        { label: 'Meta',        badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  venta:       { label: 'Venta',       badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  linea_base:  { label: 'Línea Base',  badge: 'bg-slate-200 text-slate-700 border-slate-300' },
  estimado_ia: { label: 'Estimado IA', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
}

// ── Formateo ────────────────────────────────────────────────────────────────
export const num = (n: number | string | null | undefined, dec = 2): string =>
  Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: dec, maximumFractionDigits: dec })

export const soles = (n: number | string | null | undefined, dec = 2): string => `S/ ${num(n, dec)}`

export const pct = (fraccion: number | string | null | undefined): string =>
  `${num(Number(fraccion ?? 0) * 100, 2)}%`

/** Cantidad efectiva de una línea de APU (MO/EQP rinden por jornada; el resto es cantidad fija). */
export function cantidadEfectiva(l: Pick<ApuLinea, 'clase' | 'cuadrilla' | 'rendimiento' | 'cantidad'>): number {
  if (l.clase === 'MO' || l.clase === 'EQP') {
    const rend = Number(l.rendimiento ?? 0)
    if (!rend) return 0
    return Number(l.cuadrilla ?? 0) / rend
  }
  return Number(l.cantidad ?? 0)
}

// ── API tipada ──────────────────────────────────────────────────────────────
export const presupuestosApi = {
  // Recursos
  listarRecursos: (proyectoId?: string) =>
    api.get<Recurso[]>('/presupuestos/recursos', { params: { proyectoId } }).then((r) => r.data),
  crearRecurso: (dto: Partial<Recurso>) =>
    api.post<Recurso>('/presupuestos/recursos', dto).then((r) => r.data),
  actualizarPrecio: (id: string, precio: number) =>
    api.patch(`/presupuestos/recursos/${id}/precio`, { precio }).then((r) => r.data),

  // Partidas + APU
  listarPartidas: (proyectoId?: string) =>
    api.get<Partida[]>('/presupuestos/partidas', { params: { proyectoId } }).then((r) => r.data),
  crearPartida: (dto: Partial<Partida>) =>
    api.post<Partida>('/presupuestos/partidas', dto).then((r) => r.data),
  getApu: (partidaId: string) =>
    api.get<ApuResponse>(`/presupuestos/partidas/${partidaId}/apu`).then((r) => r.data),
  setApu: (partidaId: string, lineas: ApuLinea[]) =>
    api.put<ApuResponse>(`/presupuestos/partidas/${partidaId}/apu`, { lineas }).then((r) => r.data),

  // Presupuestos
  listar: (proyectoId: string) =>
    api.get<Presupuesto[]>('/presupuestos', { params: { proyectoId } }).then((r) => r.data),
  crear: (dto: Partial<Presupuesto>) =>
    api.post<Presupuesto>('/presupuestos', dto).then((r) => r.data),
  arbol: (id: string) =>
    api.get<ArbolResponse>(`/presupuestos/${id}`).then((r) => r.data),
  exportarExcel: (id: string) =>
    api.get(`/presupuestos/${id}/export`, { responseType: 'blob' }).then((r) => r.data as Blob),
  recalcular: (id: string) =>
    api.post<ArbolResponse>(`/presupuestos/${id}/recalcular`).then((r) => r.data),
  duplicar: (id: string, tipo: 'venta' | 'linea_base', nombre?: string) =>
    api.post<ArbolResponse>(`/presupuestos/${id}/duplicar`, { tipo, nombre }).then((r) => r.data),
  crearItem: (id: string, dto: ItemInput) =>
    api.post<PresupuestoItem>(`/presupuestos/${id}/items`, dto).then((r) => r.data),
  actualizarItem: (itemId: string, dto: ItemInput) =>
    api.patch<PresupuestoItem>(`/presupuestos/items/${itemId}`, dto).then((r) => r.data),
  eliminarItem: (itemId: string) =>
    api.delete(`/presupuestos/items/${itemId}`).then((r) => r.data),
}
