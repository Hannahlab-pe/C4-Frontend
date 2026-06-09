// Generador de cronograma (Gantt) determinístico para C4 — base SEMANAS.
// Punto de partida paramétrico desde el análisis; el editor permite ajustar
// fecha de inicio, frentes de trabajo y duraciones por tarea.

export interface CabidaMin {
  pisos_vivienda: number
  sotanos: number
  area_construida_bruta: number
  num_departamentos: number
}
export interface FinancieroMin {
  meses_preobra: number
  meses_construccion: number
  meses_postentrega: number
  meses_proyecto: number
  velocidad_ventas_mensual: number
  // Cifras financieras (usadas por el seguimiento de obra / cierre)
  costo_total_usd?: number
  utilidad_neta_usd?: number
  tir_anual_pct?: number
}

export type Fase = 'Pre-obra' | 'Cimentación' | 'Estructura' | 'Acabados' | 'Ventas' | 'Cierre'

export const FASE_COLOR: Record<Fase, string> = {
  'Pre-obra':    '#6366f1',
  'Cimentación': '#0ea5e9',
  'Estructura':  '#3b82f6',
  'Acabados':    '#8b5cf6',
  'Ventas':      '#10b981',
  'Cierre':      '#f59e0b',
}

export interface TareaGantt {
  id: string
  nombre: string
  fase: Fase
  inicio: number    // semana 1-based
  duracion: number  // semanas
}

export interface CronoOverrides {
  pre?: number      // semanas
  obra?: number     // semanas
  post?: number     // semanas
  duraciones?: Record<string, number>  // id de tarea -> duración (semanas)
}

export interface Cronograma {
  tareas: TareaGantt[]
  pre: number
  obra: number
  post: number
  total: number     // semanas totales
  finObra: number   // semana en que termina la obra (hito de entrega de casco)
}

const SEMANAS_MES = 4.345

/** Frentes de trabajo → factor de compresión de la obra (cuadrillas en paralelo). */
export function obraPorFrentes(obraBaseSemanas: number, frentes: number): number {
  const factor = frentes <= 1 ? 1 : frentes === 2 ? 0.8 : 0.68
  return Math.max(4, Math.round(obraBaseSemanas * factor))
}

/** Semanas base de obra derivadas del análisis (meses → semanas). */
export function obraSemanasBase(fin: FinancieroMin): number {
  return Math.max(4, Math.round((fin.meses_construccion || 12) * SEMANAS_MES))
}

export function generarCronograma(cab: CabidaMin, fin: FinancieroMin, ov: CronoOverrides = {}): Cronograma {
  const pre  = Math.max(1, ov.pre  ?? Math.round((fin.meses_preobra     ?? 3)  * SEMANAS_MES))
  const obra = Math.max(4, ov.obra ?? Math.round((fin.meses_construccion ?? 12) * SEMANAS_MES))
  const post = Math.max(1, ov.post ?? Math.round((fin.meses_postentrega  ?? 4)  * SEMANAS_MES))
  const total = pre + obra + post
  const dur = ov.duraciones ?? {}

  // Convierte una fracción [a,b] del periodo de obra en (inicio, duracion) en semanas absolutas
  const seg = (a: number, b: number) => ({
    inicio: pre + Math.floor(a * obra) + 1,
    duracion: Math.max(1, Math.round((b - a) * obra)),
  })

  const mk = (id: string, nombre: string, fase: Fase, inicio: number, duracion: number): TareaGantt => ({
    id, nombre, fase, inicio, duracion: Math.max(1, dur[id] ?? duracion),
  })

  const t: TareaGantt[] = []

  // ── Pre-obra ──
  t.push(mk('compra', 'Compra de terreno y trámites', 'Pre-obra', 1, Math.max(2, Math.round(pre * 0.4))))
  t.push(mk('proyecto', 'Anteproyecto y proyecto (Arq./Est./IISS-IIEE)', 'Pre-obra', 1, pre))
  t.push(mk('licencia', 'Licencia de edificación', 'Pre-obra', Math.max(1, pre - 1), 2))

  // ── Construcción ──
  const exc = seg(0, cab.sotanos > 0 ? 0.20 : 0.10)
  t.push(mk('excavacion',
    cab.sotanos > 0 ? `Excavación, calzaduras y ${cab.sotanos} sótano(s)` : 'Movimiento de tierras',
    'Cimentación', exc.inicio, exc.duracion))
  const cim = seg(0.10, 0.30)
  t.push(mk('cimentacion', 'Cimentación y muros de contención', 'Cimentación', cim.inicio, cim.duracion))
  const casco = seg(0.20, 0.68)
  t.push(mk('casco', `Casco estructural (${cab.pisos_vivienda} pisos)`, 'Estructura', casco.inicio, casco.duracion))
  const alba = seg(0.45, 0.80)
  t.push(mk('albanileria', 'Albañilería y tabiquería', 'Estructura', alba.inicio, alba.duracion))
  const inst = seg(0.52, 0.88)
  t.push(mk('instalaciones', 'Instalaciones (sanitarias, eléctricas, gas)', 'Acabados', inst.inicio, inst.duracion))
  const acab = seg(0.68, 1.0)
  t.push(mk('acabados', 'Acabados (pisos, pintura, carpintería)', 'Acabados', acab.inicio, acab.duracion))
  const fach = seg(0.80, 1.0)
  t.push(mk('fachada', 'Ascensores y fachada', 'Acabados', fach.inicio, fach.duracion))

  // ── Ventas (transversal) ──
  t.push(mk('ventas', `Preventa y ventas (~${(fin.velocidad_ventas_mensual || 0).toFixed(1)} dptos/mes)`,
    'Ventas', 3, Math.max(1, total - 3)))

  // ── Cierre ──
  const pStart = pre + obra + 1
  t.push(mk('conformidad', 'Conformidad de obra y declaratoria de fábrica', 'Cierre', pStart, Math.max(1, Math.ceil(post / 2))))
  t.push(mk('titulacion', 'Independización y titulación (SUNARP)', 'Cierre', pStart, post))
  t.push(mk('entrega', 'Entrega de unidades', 'Cierre', pStart, post))

  return { tareas: t, pre, obra, post, total, finObra: pre + obra }
}

const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']

/** Etiqueta de una semana (1-based): "S{n}" o, con fecha de inicio, "dd Mmm". */
export function etiquetaSemana(inicio: Date | null, idxSemana: number): string {
  if (!inicio) return `S${idxSemana}`
  const d = new Date(inicio.getTime() + (idxSemana - 1) * 7 * 86_400_000)
  return `${d.getDate()} ${MESES_ES[d.getMonth()]}`
}

/** Índices de semana para rotular el eje (máx ~14 etiquetas, equiespaciadas). */
export function ticksEje(total: number): number[] {
  const step = Math.max(1, Math.ceil(total / 14))
  const arr: number[] = []
  for (let s = 1; s <= total; s += step) arr.push(s)
  if (arr[arr.length - 1] !== total) arr.push(total)
  return arr
}

/** Posición fraccional (0..1) de "hoy" dentro del cronograma; null si está fuera de rango. */
export function posicionHoy(inicio: Date | null, totalSemanas: number): number | null {
  if (!inicio) return null
  const semanas = (Date.now() - inicio.getTime()) / (7 * 86_400_000)
  if (semanas < 0 || semanas > totalSemanas) return null
  return semanas / totalSemanas
}
