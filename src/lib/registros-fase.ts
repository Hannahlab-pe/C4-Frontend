// Esquemas de los módulos de fase — una sola fuente de verdad para etapas,
// formularios, cards y KPIs. La IA rellena estos mismos campos vía generar_proyecto.

export interface RegistroFase {
  id: string
  nombre: string
  estado: string
  datos: Record<string, any>
  createdAt?: string
}

export interface CampoRegistro {
  key: string
  label: string
  tipo: 'text' | 'number' | 'select' | 'date' | 'textarea'
  opciones?: string[]
  unidad?: string
  destacado?: boolean    // aparece en la métrica de la card
  placeholder?: string
}

export interface SeccionForm {
  label: string
  campos: CampoRegistro[]
}

export interface EtapaFase {
  key: string
  nombre: string
  descripcion: string
  match?: string[]   // palabras clave para inferir la etapa si la IA no la etiqueta bien
}

export interface EsquemaRegistro {
  singular: string
  plural: string
  descripcion: string
  nuevoLabel: string
  nombreLabel: string
  nombrePlaceholder: string
  estados: string[]            // el primero es el default
  estadosFinales: string[]     // cuentan como "completado" para el avance
  etapas: EtapaFase[]          // pipeline real de la fase (vacío = sin agrupación)
  conEtapaEnForm: boolean      // si el formulario pide etapa (acabados no la usa)
  secciones: SeccionForm[]
}

/** Nombre legible de cada fase (para headers/breadcrumbs fuera del módulo). */
export const FASES_CONFIG_MIN: Record<string, { nombre: string }> = {
  demolicion:     { nombre: 'Demolición' },
  excavacion:     { nombre: 'Excavación' },
  construccion:   { nombre: 'Construcción' },
  acabados:       { nombre: 'Acabados' },
  administracion: { nombre: 'Administración' },
}

export const ESQUEMAS_REGISTRO: Record<string, EsquemaRegistro> = {
  demolicion: {
    singular: 'Actividad',
    plural: 'Actividades de demolición',
    descripcion: 'Pipeline real de demolición en Lima — de los permisos a la entrega del terreno',
    nuevoLabel: 'Nueva Actividad',
    nombreLabel: 'Actividad',
    nombrePlaceholder: 'Ej: Demolición estructural 2do piso',
    estados: ['Planificada', 'En Progreso', 'Completada'],
    estadosFinales: ['Completada'],
    conEtapaEnForm: true,
    etapas: [
      { key: 'gestion',      nombre: 'Gestión y permisos',     descripcion: 'No-patrimonio, licencia de demolición, informe de ingeniero, póliza CAR, EO-RS',
        match: ['patrimonio', 'licencia', 'fue', 'informe de ingenier', 'póliza', 'poliza', ' car', 'eo-rs', 'permiso', 'certificado', 'trámite', 'tramite'] },
      { key: 'preliminares', nombre: 'Trabajos preliminares',  descripcion: 'Desconexión de servicios, cerco, protección de medianeros, retiro de asbesto',
        match: ['desconex', 'servicio', 'cerco', 'malla', 'medianero', 'apuntal', 'asbesto', 'preliminar', 'protección', 'proteccion'] },
      { key: 'desmontaje',   nombre: 'Desmontaje selectivo',   descripcion: 'Carpintería, instalaciones y materiales reaprovechables',
        match: ['desmontaje', 'carpinter', 'reaprovech', 'retiro de instalac', 'cobertura', 'sanitarios'] },
      { key: 'demolicion',   nombre: 'Demolición estructural', descripcion: 'De arriba hacia abajo: losas, muros, columnas, cimientos (RNE G.050)',
        match: ['estructural', 'cimiento', 'muro', 'columna', 'losa', 'casco', 'casona'] },
      { key: 'eliminacion',  nombre: 'Eliminación de desmonte', descripcion: 'Carguío, volquetes y disposición en escombrera autorizada (EO-RS)',
        match: ['carguío', 'carguio', 'eliminación', 'eliminacion', 'desmonte', 'volquete', 'escombrera', 'acarreo', 'botadero'] },
      { key: 'limpieza',     nombre: 'Limpieza y entrega',     descripcion: 'Nivelación final — terreno listo para excavación',
        match: ['limpieza', 'nivelación', 'nivelacion', 'entrega'] },
    ],
    secciones: [
      {
        label: 'Alcance',
        campos: [
          { key: 'tipoEstructura', label: 'Tipo de estructura', tipo: 'select', opciones: ['Albañilería', 'Concreto armado', 'Adobe', 'Madera', 'Mixta'] },
          { key: 'areaM2', label: 'Área', tipo: 'number', unidad: 'm²', destacado: true, placeholder: '350' },
          { key: 'volumenDesmonteM3', label: 'Volumen desmonte', tipo: 'number', unidad: 'm³', destacado: true, placeholder: '280' },
          { key: 'viajesVolquete', label: 'Viajes volquete 15 m³', tipo: 'number', destacado: true, placeholder: '19' },
          { key: 'metodo', label: 'Método', tipo: 'select', opciones: ['Manual', 'Mecánica', 'Mixta', 'Desmontaje manual'] },
        ],
      },
      {
        label: 'Permisos / residuos (según etapa)',
        campos: [
          { key: 'entidad', label: 'Entidad / proveedor', tipo: 'text', placeholder: 'Municipalidad / Min. Cultura / EO-RS' },
          { key: 'botadero', label: 'Escombrera autorizada', tipo: 'text', placeholder: 'EO-RS autorizada por MINAM' },
          { key: 'costoEstimadoSoles', label: 'Costo', tipo: 'number', unidad: 'S/' },
        ],
      },
      {
        label: 'Plazos y responsables',
        campos: [
          { key: 'fechaInicio', label: 'Fecha de inicio', tipo: 'date' },
          { key: 'duracionDias', label: 'Duración', tipo: 'number', unidad: 'días', destacado: true, placeholder: '10' },
          { key: 'responsable', label: 'Responsable / empresa', tipo: 'text' },
          { key: 'supervisorSsoma', label: 'Supervisor SSOMA', tipo: 'text' },
        ],
      },
      {
        label: 'Observaciones',
        campos: [
          { key: 'observaciones', label: 'Observaciones técnicas', tipo: 'textarea', placeholder: 'Medianeros, asbesto, instalaciones a retirar, referencia normativa (G.050)...' },
        ],
      },
    ],
  },

  excavacion: {
    singular: 'Actividad',
    plural: 'Actividades de excavación',
    descripcion: 'Pipeline de excavación: trazo → calzaduras → excavación masiva → perfilado',
    nuevoLabel: 'Nueva Actividad',
    nombreLabel: 'Actividad / Sector',
    nombrePlaceholder: 'Ej: Anillo de calzaduras 1 (0 a -2.5m)',
    estados: ['Planificada', 'En Progreso', 'Completada'],
    estadosFinales: ['Completada'],
    conEtapaEnForm: true,
    etapas: [
      { key: 'trazo',             nombre: 'Trazo y replanteo',    descripcion: 'Topografía, niveles y ejes' },
      { key: 'calzaduras',        nombre: 'Calzaduras',           descripcion: 'Sostenimiento por anillos según profundidad' },
      { key: 'excavacion_masiva', nombre: 'Excavación masiva',    descripcion: 'Movimiento de tierras por sótano' },
      { key: 'perfilado',         nombre: 'Perfilado y fondo',    descripcion: 'Nivelación para cimentación' },
    ],
    secciones: [
      {
        label: 'Dimensiones',
        campos: [
          { key: 'areaM2', label: 'Área', tipo: 'number', unidad: 'm²', placeholder: '300' },
          { key: 'profundidadM', label: 'Profundidad', tipo: 'number', unidad: 'm', destacado: true, placeholder: '3.5' },
          { key: 'volumenM3', label: 'Volumen', tipo: 'number', unidad: 'm³', destacado: true, placeholder: '1050' },
          { key: 'viajesVolquete', label: 'Viajes volquete 15 m³', tipo: 'number', destacado: true },
        ],
      },
      {
        label: 'Terreno y método',
        campos: [
          { key: 'clasificacionTerreno', label: 'Clasificación del terreno', tipo: 'select', opciones: ['Roca Dura', 'Roca Blanda', 'Suelo Cohesivo Duro', 'Suelo Cohesivo Blando', 'Suelo Granular Grueso', 'Suelo Granular Fino', 'Material Orgánico'] },
          { key: 'metodo', label: 'Método', tipo: 'select', opciones: ['Excavadora Hidráulica', 'Retroexcavadora', 'Manual', 'Mixto'] },
          { key: 'nivelFreatico', label: 'Nivel freático', tipo: 'number', unidad: 'm' },
        ],
      },
      {
        label: 'Plazos y responsables',
        campos: [
          { key: 'fechaInicio', label: 'Fecha de inicio', tipo: 'date' },
          { key: 'duracionDias', label: 'Duración', tipo: 'number', unidad: 'días', destacado: true },
          { key: 'responsable', label: 'Ingeniero responsable', tipo: 'text' },
        ],
      },
      {
        label: 'Observaciones',
        campos: [
          { key: 'observaciones', label: 'Observaciones técnicas', tipo: 'textarea', placeholder: 'Vecinos, servicios subterráneos, condiciones del suelo...' },
        ],
      },
    ],
  },

  construccion: {
    singular: 'Actividad',
    plural: 'Actividades del casco',
    descripcion: 'Pipeline del casco: cimentación → estructura por piso → albañilería → azotea',
    nuevoLabel: 'Nueva Actividad',
    nombreLabel: 'Elemento / Actividad',
    nombrePlaceholder: 'Ej: Losa piso 3',
    estados: ['Programado', 'En ejecución', 'Completado'],
    estadosFinales: ['Completado'],
    conEtapaEnForm: true,
    etapas: [
      { key: 'cimentacion', nombre: 'Cimentación',        descripcion: 'Platea, zapatas y muros de sótano' },
      { key: 'estructura',  nombre: 'Estructura por piso', descripcion: 'Ciclo: verticales → encofrado → instalaciones → vaciado de losa' },
      { key: 'albanileria', nombre: 'Albañilería',         descripcion: 'Tabiquería y muros no portantes' },
      { key: 'azotea',      nombre: 'Azotea y tanque',     descripcion: 'Cierre del casco' },
    ],
    secciones: [
      {
        label: 'Elemento',
        campos: [
          { key: 'elemento', label: 'Tipo', tipo: 'select', opciones: ['Platea', 'Zapatas', 'Muro sótano', 'Columnas y placas', 'Vigas', 'Losa', 'Escalera', 'Cisterna', 'Tabiquería', 'Tanque elevado'] },
          { key: 'piso', label: 'Piso / nivel', tipo: 'number', destacado: true, placeholder: '3' },
          { key: 'volumenM3', label: 'Concreto', tipo: 'number', unidad: 'm³', destacado: true, placeholder: '28' },
        ],
      },
      {
        label: 'Calidad',
        campos: [
          { key: 'fc', label: "f'c (kg/cm²)", tipo: 'select', opciones: ['210', '280', '350'] },
          { key: 'probetas', label: 'Probetas', tipo: 'number', destacado: true, placeholder: '4' },
          { key: 'proveedor', label: 'Proveedor de concreto', tipo: 'text', placeholder: 'UNICON / Mixercon...' },
        ],
      },
      {
        label: 'Ejecución',
        campos: [
          { key: 'fechaProgramada', label: 'Fecha programada', tipo: 'date' },
          { key: 'cuadrilla', label: 'Cuadrilla / frente', tipo: 'text', placeholder: 'Frente 1' },
        ],
      },
      {
        label: 'Observaciones',
        campos: [
          { key: 'observaciones', label: 'Observaciones', tipo: 'textarea' },
        ],
      },
    ],
  },

  acabados: {
    singular: 'Unidad',
    plural: 'Unidades en acabados',
    descripcion: 'Pipeline de acabados alimentado por el avance de cada departamento',
    nuevoLabel: 'Nueva Unidad',
    nombreLabel: 'Unidad / Departamento',
    nombrePlaceholder: 'Ej: Depto 501',
    estados: ['En acabados', 'Terminado', 'Entregado'],
    estadosFinales: ['Terminado', 'Entregado'],
    conEtapaEnForm: false,
    etapas: [
      { key: 'humedos',       nombre: 'Acabados húmedos',     descripcion: 'Tarrajeo, contrapisos y enchapes' },
      { key: 'instalaciones', nombre: 'Instalaciones finales', descripcion: 'Aparatos, tableros y griferías' },
      { key: 'secos',         nombre: 'Acabados secos',        descripcion: 'Carpintería, vidrios y pintura' },
      { key: 'entrega',       nombre: 'Entrega de unidades',   descripcion: 'Terminadas y entregadas a propietarios' },
    ],
    secciones: [
      {
        label: 'Unidad',
        campos: [
          { key: 'piso', label: 'Piso', tipo: 'number', placeholder: '5' },
          { key: 'tipologia', label: 'Tipología', tipo: 'select', opciones: ['studio', '1 dorm', '2 dorm', '3 dorm'] },
          { key: 'areaM2', label: 'Área', tipo: 'number', unidad: 'm²', destacado: true, placeholder: '72' },
        ],
      },
      {
        label: 'Avance por partida (%)',
        campos: [
          { key: 'avanceTabiqueria', label: 'Tarrajeo y enchapes', tipo: 'number', unidad: '%', destacado: true },
          { key: 'avanceInstalaciones', label: 'Instalaciones', tipo: 'number', unidad: '%', destacado: true },
          { key: 'avanceCarpinteria', label: 'Carpintería y vidrios', tipo: 'number', unidad: '%' },
          { key: 'avancePintura', label: 'Pintura', tipo: 'number', unidad: '%', destacado: true },
        ],
      },
      {
        label: 'Comercial',
        campos: [
          { key: 'estadoVenta', label: 'Estado de venta', tipo: 'select', opciones: ['Disponible', 'Separado', 'Vendido', 'Entregado'] },
          { key: 'fechaEntregaEstimada', label: 'Entrega estimada', tipo: 'date' },
        ],
      },
      {
        label: 'Observaciones',
        campos: [
          { key: 'observaciones', label: 'Observaciones', tipo: 'textarea' },
        ],
      },
    ],
  },

  administracion: {
    singular: 'Trámite',
    plural: 'Trámites y gestiones',
    descripcion: 'Pipeline administrativo: pre-obra → ejecución → cierre y entrega',
    nuevoLabel: 'Nuevo Trámite',
    nombreLabel: 'Trámite / Gestión',
    nombrePlaceholder: 'Ej: Licencia de edificación',
    estados: ['Por iniciar', 'En trámite', 'Observado', 'Aprobado'],
    estadosFinales: ['Aprobado'],
    conEtapaEnForm: true,
    etapas: [
      { key: 'preobra',   nombre: 'Pre-obra',          descripcion: 'Licencias, pólizas y contratos iniciales' },
      { key: 'ejecucion', nombre: 'Durante la obra',   descripcion: 'Valorizaciones, ventas y supervisión' },
      { key: 'cierre',    nombre: 'Cierre y entrega',  descripcion: 'Conformidad, declaratoria, independización' },
    ],
    secciones: [
      {
        label: 'Trámite',
        campos: [
          { key: 'entidad', label: 'Entidad', tipo: 'text', destacado: true, placeholder: 'Municipalidad / SUNARP...' },
          { key: 'numeroExpediente', label: 'Nº expediente', tipo: 'text', placeholder: '—' },
        ],
      },
      {
        label: 'Plazos y costos',
        campos: [
          { key: 'fechaIngreso', label: 'Fecha de ingreso', tipo: 'date' },
          { key: 'plazoDias', label: 'Plazo', tipo: 'number', unidad: 'días', destacado: true, placeholder: '30' },
          { key: 'costoEstimadoSoles', label: 'Costo', tipo: 'number', unidad: 'S/', destacado: true },
          { key: 'responsable', label: 'Responsable', tipo: 'text' },
        ],
      },
      {
        label: 'Observaciones',
        campos: [
          { key: 'observaciones', label: 'Observaciones / requisitos', tipo: 'textarea' },
        ],
      },
    ],
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fnum = (n: any, d = 0) => {
  const v = Number(n)
  return Number.isFinite(v) ? v.toLocaleString('es-PE', { maximumFractionDigits: d }) : '—'
}

const suma = (regs: RegistroFase[], key: string) =>
  regs.reduce((s, r) => s + (Number(r.datos?.[key]) || 0), 0)

const clamp = (n: number) => Math.max(0, Math.min(100, n))

/** Promedio de los campos de avance de una unidad de acabados. */
export function avanceUnidad(r: RegistroFase): number {
  const keys = ['avanceTabiqueria', 'avanceInstalaciones', 'avanceCarpinteria', 'avancePintura']
  const vals = keys.map((k) => clamp(Number(r.datos?.[k]) || 0))
  return Math.round(vals.reduce((a, b) => a + b, 0) / keys.length)
}

// ─── Etapas dinámicas por proyecto ──────────────────────────────────────────
// Las etapas YA NO son fijas: cada proyecto guarda las suyas (creadas por la IA
// o por el usuario). ESQUEMAS_REGISTRO[fase].etapas queda solo como PLANTILLA
// sugerida. Las funciones de avance reciben las etapas reales del proyecto.

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 24) || 'etapa'

/** Genera una key única para una etapa nueva. */
export function nuevaEtapaKey(nombre: string, existentes: string[] = []): string {
  const base = slugify(nombre)
  let key = base
  let i = 2
  while (existentes.includes(key)) key = `${base}-${i++}`
  return key
}

/** Plantilla sugerida de etapas para una fase (copia profunda, lista para guardar). */
export function plantillaEtapas(fase: string): EtapaFase[] {
  const esquema = ESQUEMAS_REGISTRO[fase]
  if (!esquema) return []
  return esquema.etapas.map((e) => ({ key: e.key, nombre: e.nombre, descripcion: e.descripcion, match: e.match }))
}

/** Infiere la etapa de un registro por palabras clave de su nombre/observaciones. */
function inferirEtapa(etapas: EtapaFase[], r: RegistroFase): string | null {
  const txt = `${r.nombre ?? ''} ${r.datos?.observaciones ?? ''}`.toLowerCase()
  for (const et of etapas) {
    if (et.match?.some((m) => txt.includes(m))) return et.key
  }
  return null
}

/** Agrupa registros por etapa (key). Usa datos.etapa; si falta o es inválida, la infiere. */
export function agruparPorEtapa(etapas: EtapaFase[], regs: RegistroFase[]): Record<string, RegistroFase[]> {
  if (!etapas.length) return {}
  const keys = etapas.map((e) => e.key)
  const grupos: Record<string, RegistroFase[]> = Object.fromEntries(keys.map((k) => [k, []]))
  for (const r of regs) {
    const k = keys.includes(r.datos?.etapa)
      ? r.datos.etapa
      : (inferirEtapa(etapas, r) ?? keys[0])
    grupos[k].push(r)
  }
  return grupos
}

/** % de avance de una etapa. Acabados se calcula de las partidas de las unidades. */
export function avanceEtapa(fase: string, etapas: EtapaFase[], etapaKey: string, regs: RegistroFase[]): number {
  const esquema = ESQUEMAS_REGISTRO[fase]
  if (!esquema) return 0

  if (fase === 'acabados') {
    const map: Record<string, (r: RegistroFase) => number> = {
      humedos:       (r) => clamp(Number(r.datos?.avanceTabiqueria) || 0),
      instalaciones: (r) => clamp(Number(r.datos?.avanceInstalaciones) || 0),
      secos:         (r) => Math.round((clamp(Number(r.datos?.avanceCarpinteria) || 0) + clamp(Number(r.datos?.avancePintura) || 0)) / 2),
      entrega:       (r) => (r.estado === 'Entregado' ? 100 : r.estado === 'Terminado' ? 50 : 0),
    }
    const fn = map[etapaKey]
    if (fn) return regs.length ? Math.round(regs.reduce((s, r) => s + fn(r), 0) / regs.length) : 0
  }

  const grupos = agruparPorEtapa(etapas, regs)
  const propios = grupos[etapaKey] ?? []
  if (propios.length === 0) return 0
  const completos = propios.filter((r) => esquema.estadosFinales.includes(r.estado)).length
  const enCurso = propios.filter((r) => !esquema.estadosFinales.includes(r.estado) && r.estado !== esquema.estados[0]).length
  return Math.round(((completos + enCurso * 0.5) / propios.length) * 100)
}

/** Avance global de la fase = promedio de sus etapas (o de los registros si no hay etapas). */
export function avanceFase(fase: string, etapas: EtapaFase[], regs: RegistroFase[]): number {
  if (!etapas.length) return avanceRegistros(fase, regs)
  const pcts = etapas.map((e) => avanceEtapa(fase, etapas, e.key, regs))
  return Math.round(pcts.reduce((a, b) => a + b, 0) / Math.max(1, pcts.length))
}

/** Avance de la fase calculado SOLO de los registros (sin depender de etapas). */
export function avanceRegistros(fase: string, regs: RegistroFase[]): number {
  const esquema = ESQUEMAS_REGISTRO[fase]
  if (!esquema || regs.length === 0) return 0
  if (fase === 'acabados') return Math.round(regs.reduce((s, r) => s + avanceUnidad(r), 0) / regs.length)
  const completos = regs.filter((r) => esquema.estadosFinales.includes(r.estado)).length
  const enCurso = regs.filter((r) => !esquema.estadosFinales.includes(r.estado) && r.estado !== esquema.estados[0]).length
  return Math.round(((completos + enCurso * 0.5) / regs.length) * 100)
}

/** KPIs de cabecera específicos por fase. */
export function kpisDeRegistros(fase: string, regs: RegistroFase[]): { label: string; value: string }[] {
  const esquema = ESQUEMAS_REGISTRO[fase]
  if (!esquema) return []
  const global = `${avanceRegistros(fase, regs)}%`

  switch (fase) {
    case 'demolicion':
      return [
        { label: 'Actividades', value: String(regs.length) },
        { label: 'Desmonte', value: `${fnum(suma(regs, 'volumenDesmonteM3'))} m³` },
        { label: 'Viajes volquete', value: fnum(suma(regs, 'viajesVolquete')) },
        { label: 'Avance fase', value: global },
      ]
    case 'excavacion':
      return [
        { label: 'Actividades', value: String(regs.length) },
        { label: 'Vol. excavación', value: `${fnum(suma(regs, 'volumenM3'))} m³` },
        { label: 'Viajes volquete', value: fnum(suma(regs, 'viajesVolquete')) },
        { label: 'Avance fase', value: global },
      ]
    case 'construccion':
      return [
        { label: 'Actividades', value: String(regs.length) },
        { label: 'Concreto', value: `${fnum(suma(regs, 'volumenM3'), 1)} m³` },
        { label: 'Probetas', value: fnum(suma(regs, 'probetas')) },
        { label: 'Avance casco', value: global },
      ]
    case 'acabados': {
      const vendidos = regs.filter((r) => ['Vendido', 'Entregado'].includes(r.datos?.estadoVenta)).length
      return [
        { label: 'Unidades', value: String(regs.length) },
        { label: 'Vendidas', value: `${vendidos}/${regs.length}` },
        { label: 'Entregadas', value: String(regs.filter((r) => r.estado === 'Entregado').length) },
        { label: 'Avance fase', value: global },
      ]
    }
    case 'administracion':
      return [
        { label: 'Trámites', value: String(regs.length) },
        { label: 'Aprobados', value: `${regs.filter((r) => r.estado === 'Aprobado').length}/${regs.length}` },
        { label: 'Costo trámites', value: `S/ ${fnum(suma(regs, 'costoEstimadoSoles'))}` },
        { label: 'Avance fase', value: global },
      ]
    default:
      return []
  }
}

/** Estado visual de una etapa según su % de avance — colores "pintados" consistentes. */
export function estadoEtapaInfo(pct: number) {
  if (pct >= 100) return {
    label: 'Completada', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',
    dot: 'bg-emerald-500', bar: 'bg-emerald-500', node: 'bg-emerald-500 text-white', accent: '#10b981',
  }
  if (pct > 0) return {
    label: 'En progreso', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
    dot: 'bg-blue-500', bar: 'bg-blue-500', node: 'bg-blue-600 text-white', accent: '#3b82f6',
  }
  return {
    label: 'Pendiente', text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200',
    dot: 'bg-slate-300', bar: 'bg-slate-300', node: 'bg-slate-200 text-slate-500', accent: '#cbd5e1',
  }
}

/** Color del badge de estado de un registro. */
export function estadoRegistroClase(estado: string): string {
  const map: Record<string, string> = {
    'Planificada': 'bg-slate-100 text-slate-600',
    'En Progreso': 'bg-blue-100 text-blue-700',
    'Completada': 'bg-emerald-100 text-emerald-700',
    'Programado': 'bg-slate-100 text-slate-600',
    'En ejecución': 'bg-blue-100 text-blue-700',
    'Completado': 'bg-emerald-100 text-emerald-700',
    'En acabados': 'bg-blue-100 text-blue-700',
    'Terminado': 'bg-emerald-100 text-emerald-700',
    'Entregado': 'bg-violet-100 text-violet-700',
    'Por iniciar': 'bg-slate-100 text-slate-600',
    'En trámite': 'bg-blue-100 text-blue-700',
    'Observado': 'bg-amber-100 text-amber-700',
    'Aprobado': 'bg-emerald-100 text-emerald-700',
  }
  return map[estado] ?? 'bg-slate-100 text-slate-500'
}
