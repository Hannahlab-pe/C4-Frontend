import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowRight, Building2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

// Grano sutil (SVG noise) — textura premium sin imágenes externas
const GRAIN =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.token, data.usuario)
      navigate('/dashboard')
    } catch {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh flex bg-white">

      {/* ── Izquierda — formulario, minimalista ── */}
      <div className="w-full lg:w-[42%] shrink-0 flex flex-col px-8 sm:px-14 lg:px-16 py-10">

        {/* Marca */}
        <div className="flex items-center gap-2.5 login-fade" style={{ animationDelay: '0ms' }}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Building2 className="w-[18px] h-[18px] text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">C4</span>
        </div>

        {/* Centro */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">

            <div className="mb-9 login-fade" style={{ animationDelay: '60ms' }}>
              <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-slate-900">
                Bienvenido de vuelta
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Ingresa a tu cuenta para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 login-fade" style={{ animationDelay: '120ms' }}>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ingeniero@empresa.com"
                  required
                  autoComplete="email"
                  className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-300 rounded-xl px-4 py-3 text-sm outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-900 placeholder:text-slate-300 rounded-xl px-4 py-3 text-sm pr-11 outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl py-3 text-sm transition-all disabled:opacity-60 mt-1"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando…</>
                  : <><span>Ingresar</span><ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></>
                }
              </button>
            </form>
          </div>
        </div>

        {/* Pie */}
        <p className="text-[11px] text-slate-300 login-fade" style={{ animationDelay: '180ms' }}>
          Lima, Perú · Motor de Pre-inversión · 2026
        </p>
      </div>

      {/* ── Derecha — marca, mesh gradient + grano (oculta en móvil) ── */}
      <div className="hidden lg:block flex-1 relative overflow-hidden bg-[#06070e]">

        {/* Blobs aurora que derivan lento */}
        <div className="absolute -top-24 -left-16 w-[34rem] h-[34rem] rounded-full bg-blue-600/30 blur-[110px] drift-a" />
        <div className="absolute top-1/3 -right-20 w-[30rem] h-[30rem] rounded-full bg-indigo-600/25 blur-[110px] drift-b" />
        <div className="absolute -bottom-28 left-1/4 w-[32rem] h-[32rem] rounded-full bg-sky-500/20 blur-[120px] drift-c" />

        {/* Grilla muy tenue */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
          }}
        />

        {/* Grano */}
        <div
          className="absolute inset-0 opacity-[0.12] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: `url("${GRAIN}")`, backgroundSize: '200px 200px' }}
        />

        {/* Viñeta */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070e] via-transparent to-[#06070e]/40 pointer-events-none" />

        {/* Contenido */}
        <div className="relative z-10 flex flex-col justify-between h-full p-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-blue-300/80 login-fade" style={{ animationDelay: '120ms' }}>
            Plataforma de Pre-inversión
          </p>

          <div className="login-fade" style={{ animationDelay: '220ms' }}>
            <h2 className="text-white font-semibold text-[3.4rem] leading-[1.05] tracking-tight">
              Del terreno
              <br />
              al retorno.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                En minutos.
              </span>
            </h2>
            <p className="text-slate-400 text-sm mt-6 max-w-sm leading-relaxed">
              Cabida, estructura, finanzas y gestión de obra con IA. Todo tu proyecto, de la idea a la entrega.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes login-fade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-fade { opacity: 0; animation: login-fade 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }

        @keyframes drift-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,30px) scale(1.08); } }
        @keyframes drift-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.1); } }
        @keyframes drift-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-30px) scale(1.06); } }
        .drift-a { animation: drift-a 16s ease-in-out infinite; }
        .drift-b { animation: drift-b 19s ease-in-out infinite; }
        .drift-c { animation: drift-c 22s ease-in-out infinite; }
      `}</style>
    </div>
  )
}
