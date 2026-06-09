import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2, RotateCcw, Pencil, X, Check } from 'lucide-react'
import api from '../lib/api'

interface Normativa {
  id: string
  distrito: string
  ubigeo?: string
  zonificacion?: string
  pisosMax: number
  retiroFrontal: number
  retiroLateral: number
  retiroPosterior: number
  cus: number
  areaMinDepto: number
  estacionamientos: number
  fuente?: string
}

const EMPTY: Omit<Normativa, 'id'> = {
  distrito: '',
  ubigeo: '',
  zonificacion: '',
  pisosMax: 8,
  retiroFrontal: 3,
  retiroLateral: 0,
  retiroPosterior: 3,
  cus: 4,
  areaMinDepto: 45,
  estacionamientos: 1,
  fuente: '',
}

type EditState = { id: string; data: Partial<Normativa> }

export default function NormativasAdminPage() {
  const [normativas, setNormativas] = useState<Normativa[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editing, setEditing] = useState<EditState | null>(null)
  const [adding, setAdding] = useState(false)
  const [newData, setNewData] = useState<Omit<Normativa, 'id'>>(EMPTY)
  const [seeding, setSeeding] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/normativas').then(r => setNormativas(r.data)).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const startEdit = (n: Normativa) => setEditing({ id: n.id, data: { ...n } })
  const cancelEdit = () => setEditing(null)

  const saveEdit = async () => {
    if (!editing) return
    setSaving(editing.id)
    try {
      await api.patch(`/normativas/${editing.id}`, editing.data)
      setEditing(null)
      load()
    } finally { setSaving(null) }
  }

  const remove = async (id: string, distrito: string) => {
    if (!confirm(`¿Eliminar normativa de ${distrito}?`)) return
    setSaving(id)
    try {
      await api.delete(`/normativas/${id}`)
      load()
    } finally { setSaving(null) }
  }

  const create = async () => {
    if (!newData.distrito.trim()) return
    setSaving('new')
    try {
      await api.post('/normativas', newData)
      setAdding(false)
      setNewData(EMPTY)
      load()
    } finally { setSaving(null) }
  }

  const seed = async () => {
    if (!confirm('¿Resetear todos los distritos al seed del código?')) return
    setSeeding(true)
    try { await api.post('/normativas/seed') } finally { setSeeding(false); load() }
  }

  const setField = (id: string, key: keyof Normativa, val: string) => {
    setEditing(prev => prev && prev.id === id
      ? { ...prev, data: { ...prev.data, [key]: isNaN(Number(val)) ? val : Number(val) } }
      : prev,
    )
  }

  const setNewField = (key: keyof Normativa, val: string) => {
    setNewData(prev => ({ ...prev, [key]: isNaN(Number(val)) || val === '' ? val : Number(val) }))
  }

  const NUM_COLS: (keyof Normativa)[] = [
    'pisosMax', 'retiroFrontal', 'retiroLateral', 'retiroPosterior',
    'cus', 'areaMinDepto', 'estacionamientos',
  ]
  const NUM_LABELS: Record<string, string> = {
    pisosMax: 'Pisos máx',
    retiroFrontal: 'Ret. frontal',
    retiroLateral: 'Ret. lateral',
    retiroPosterior: 'Ret. posterior',
    cus: 'CUS',
    areaMinDepto: 'Área mín m²',
    estacionamientos: 'Estac.',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-800">Normativas Urbanísticas</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Parámetros municipales por distrito — edita directamente en la tabla
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seed}
            disabled={seeding}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700
              border border-slate-200 rounded-lg px-3 py-2 transition-colors"
          >
            {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Resetear seed
          </button>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white
              rounded-lg px-3 py-2 hover:bg-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo distrito
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500 whitespace-nowrap">Distrito</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 whitespace-nowrap">Zonificación</th>
                  {NUM_COLS.map(k => (
                    <th key={k} className="text-center px-3 py-3 font-semibold text-slate-500 whitespace-nowrap">
                      {NUM_LABELS[k]}
                    </th>
                  ))}
                  <th className="text-left px-3 py-3 font-semibold text-slate-500">Fuente</th>
                  <th className="px-3 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {/* Fila nueva */}
                {adding && (
                  <tr className="border-b border-blue-100 bg-blue-50/40">
                    <td className="px-4 py-2">
                      <input
                        autoFocus
                        value={newData.distrito}
                        onChange={e => setNewField('distrito', e.target.value)}
                        className="w-28 border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                        placeholder="Distrito"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={newData.zonificacion}
                        onChange={e => setNewField('zonificacion', e.target.value)}
                        className="w-32 border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                        placeholder="RDA..."
                      />
                    </td>
                    {NUM_COLS.map(k => (
                      <td key={k} className="px-3 py-2 text-center">
                        <input
                          type="number"
                          value={(newData as any)[k]}
                          onChange={e => setNewField(k, e.target.value)}
                          className="w-16 border border-blue-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-blue-400"
                          step={k === 'cus' ? '0.1' : '1'}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <input
                        value={newData.fuente}
                        onChange={e => setNewField('fuente', e.target.value)}
                        className="w-40 border border-blue-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-400"
                        placeholder="Ordenanza..."
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={create}
                          disabled={saving === 'new'}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Guardar"
                        >
                          {saving === 'new' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setAdding(false)}
                          className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                          title="Cancelar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {normativas.map((n) => {
                  const isEditing = editing?.id === n.id
                  const d = isEditing ? editing!.data : n
                  return (
                    <tr key={n.id} className={`border-b border-slate-50 last:border-0 ${isEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'} transition-colors`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                        {n.distrito}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            value={(d.zonificacion ?? '')}
                            onChange={e => setField(n.id, 'zonificacion', e.target.value)}
                            className="w-32 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
                          />
                        ) : (
                          <span className="text-slate-500">{n.zonificacion}</span>
                        )}
                      </td>
                      {NUM_COLS.map(k => (
                        <td key={k} className="px-3 py-2 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              value={(d as any)[k] ?? ''}
                              onChange={e => setField(n.id, k, e.target.value)}
                              className="w-16 border border-amber-200 rounded px-2 py-1 text-xs text-center focus:outline-none focus:border-amber-400"
                              step={k === 'cus' ? '0.1' : '1'}
                            />
                          ) : (
                            <span className="tabular-nums text-slate-700">{(n as any)[k]}</span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <input
                            value={(d.fuente ?? '')}
                            onChange={e => setField(n.id, 'fuente', e.target.value)}
                            className="w-40 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-400"
                          />
                        ) : (
                          <span className="text-slate-400 text-[11px] truncate max-w-[10rem] block" title={n.fuente}>{n.fuente}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={saveEdit}
                                disabled={saving === n.id}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Guardar"
                              >
                                {saving === n.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                                title="Cancelar"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(n)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => remove(n.id, n.distrito)}
                                disabled={saving === n.id}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Los cambios regeneran el embedding del distrito automáticamente. "Resetear seed" restaura los 10 distritos base desde el código.
      </p>
    </div>
  )
}
