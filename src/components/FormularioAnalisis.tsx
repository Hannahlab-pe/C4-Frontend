import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import api from '../lib/api'

const DISTRITOS_FALLBACK = [
  'Miraflores', 'San Isidro', 'Santiago de Surco', 'La Molina', 'San Borja',
  'Magdalena del Mar', 'Jesús María', 'Lince', 'San Miguel', 'Barranco',
]

interface Props {
  proyectoId: string
  distritoInicial?: string
  onGenerado: (data: { cabida?: any; estructura?: any; financiero?: any; distrito?: string }) => void
  onCancelar?: () => void
  /** Sin la tarjeta exterior ni el encabezado propio (cuando va dentro de un diálogo). */
  embedded?: boolean
}

const num = (s: string) => {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
        {label}
        {hint && <span className="text-slate-400 font-normal">· {hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'

function Pct({ label, v, set }: { label: string; v: string; set: (s: string) => void }) {
  return (
    <div>
      <input
        type="number" inputMode="numeric" value={v} onChange={(e) => set(e.target.value)} placeholder="—"
        className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 text-center tabular-nums"
      />
      <p className="text-[10px] text-slate-400 text-center mt-1">{label}</p>
    </div>
  )
}

export default function FormularioAnalisis({ proyectoId, distritoInicial, onGenerado, onCancelar, embedded }: Props) {
  const [distritos, setDistritos] = useState<string[]>(DISTRITOS_FALLBACK)
  const [area, setArea] = useState('')
  const [distrito, setDistrito] = useState(distritoInicial ?? '')
  const [precioTerreno, setPrecioTerreno] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [frente, setFrente] = useState('')
  const [fondo, setFondo] = useState('')
  const [costoM2, setCostoM2] = useState('')
  const [capitalPropio, setCapitalPropio] = useState('')
  const [velocidad, setVelocidad] = useState('')
  const [pStudio, setPStudio] = useState('')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [p3, setP3] = useState('')
  const [avanzado, setAvanzado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get('/normativas')
      .then((r) => {
        const lista = (r.data as any[])?.map((n) => n?.distrito).filter(Boolean)
        if (lista?.length) setDistritos(Array.from(new Set(lista)))
      })
      .catch(() => {})
  }, [])

  async function generar() {
    setError(null)
    const area_total = num(area)
    if (!area_total || area_total <= 0) { setError('Ingresa el área del terreno.'); return }
    if (!distrito) { setError('Elige el distrito.'); return }
    setEnviando(true)
    const inicio = Date.now()
    try {
      const mezcla = ([['studio', pStudio], ['1_dorm', p1], ['2_dorm', p2], ['3_dorm', p3]] as const)
        .map(([tipo, v]) => ({ tipo, porcentaje: num(v) ?? 0, precio_usd_m2: 0 }))
        .filter((x) => x.porcentaje > 0)
      const { data } = await api.post(`/analisis/${proyectoId}/generar`, {
        area_total,
        distrito,
        precio_terreno_usd: num(precioTerreno),
        precio_venta_usd_m2: num(precioVenta),
        frente: num(frente),
        fondo: num(fondo),
        costo_construccion_usd_m2: num(costoM2),
        porcentaje_capital_propio: num(capitalPropio),
        velocidad_ventas_mensual: num(velocidad),
        mezcla_tipologias: mezcla.length ? mezcla : undefined,
      })
      // El motor es instantáneo; mantenemos "Calculando…" un mínimo para que se perciba el trabajo.
      const dt = Date.now() - inicio
      if (dt < 650) await new Promise((r) => setTimeout(r, 650 - dt))
      window.dispatchEvent(new Event('c4:analisis-updated'))
      onGenerado(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo generar el análisis. Verifica que el motor de cálculo esté activo.')
      setEnviando(false)
    }
  }

  const cuerpo = (
    <div className="space-y-3.5">
      <Campo label="Área del terreno (m²)">
        <input
          type="number" inputMode="decimal" autoFocus
          value={area} onChange={(e) => setArea(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && generar()}
          placeholder="Ej: 300"
          className={inputCls}
        />
      </Campo>

      <Campo label="Distrito">
        <select value={distrito} onChange={(e) => setDistrito(e.target.value)} className={inputCls}>
          <option value="">Elige un distrito…</option>
          {distritos.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Precio terreno (US$)" hint="opcional">
          <input
            type="number" inputMode="decimal"
            value={precioTerreno} onChange={(e) => setPrecioTerreno(e.target.value)}
            placeholder="lo estima el motor"
            className={inputCls}
          />
        </Campo>
        <Campo label="Venta (US$/m²)" hint="opcional">
          <input
            type="number" inputMode="decimal"
            value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)}
            placeholder="promedio distrito"
            className={inputCls}
          />
        </Campo>
      </div>

      <button
        type="button"
        onClick={() => setAvanzado((v) => !v)}
        className="text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        {avanzado ? '− Ocultar opciones avanzadas' : '+ Opciones avanzadas'} <span className="text-slate-400 font-normal">(medidas, costo, mezcla)</span>
      </button>

      {avanzado && (
        <div className="space-y-3.5 rounded-xl bg-slate-50 border border-slate-100 p-3.5">
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Frente (m)">
              <input type="number" inputMode="decimal" value={frente} onChange={(e) => setFrente(e.target.value)} placeholder="se infiere" className={inputCls} />
            </Campo>
            <Campo label="Fondo (m)">
              <input type="number" inputMode="decimal" value={fondo} onChange={(e) => setFondo(e.target.value)} placeholder="se infiere" className={inputCls} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Costo construcción (US$/m²)" hint="tu costo real">
              <input type="number" inputMode="decimal" value={costoM2} onChange={(e) => setCostoM2(e.target.value)} placeholder="auto por distrito" className={inputCls} />
            </Campo>
            <Campo label="Capital propio (%)" hint="resto lo financia el banco">
              <input type="number" inputMode="decimal" value={capitalPropio} onChange={(e) => setCapitalPropio(e.target.value)} placeholder="60" className={inputCls} />
            </Campo>
          </div>
          <Campo label="Velocidad de venta (deptos/mes)" hint="opcional">
            <input type="number" inputMode="decimal" value={velocidad} onChange={(e) => setVelocidad(e.target.value)} placeholder="auto por distrito" className={inputCls} />
          </Campo>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1.5">Mezcla de tipologías <span className="text-slate-400 font-normal">· % de deptos (opcional)</span></p>
            <div className="grid grid-cols-4 gap-2">
              <Pct label="Studios" v={pStudio} set={setPStudio} />
              <Pct label="1 dorm"  v={p1} set={setP1} />
              <Pct label="2 dorm"  v={p2} set={setP2} />
              <Pct label="3 dorm"  v={p3} set={setP3} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        {onCancelar && (
          <button
            type="button" onClick={onCancelar}
            className="flex-1 text-sm text-slate-600 border border-slate-200 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="button" onClick={generar} disabled={enviando}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando…</> : <><Sparkles className="w-4 h-4" /> Generar análisis</>}
        </button>
      </div>

      <p className="text-[11px] text-slate-400 text-center">
        La normativa del distrito (pisos, retiros, CUS) se aplica automáticamente.
      </p>
    </div>
  )

  if (embedded) return cuerpo

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Sparkles className="w-[18px] h-[18px] text-blue-600" />
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-slate-900">Evaluar terreno</h3>
          <p className="text-xs text-slate-500">Ingresa los datos y C4 calcula cabida, estructura y retorno.</p>
        </div>
      </div>
      {cuerpo}
    </div>
  )
}
