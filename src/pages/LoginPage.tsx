import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import GradientText from '../components/GradientText'

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
    <div className="h-screen overflow-hidden flex">

      {/* ── Panel izquierdo — Formulario claro ── */}
      <div className="w-[44%] shrink-0 bg-white flex flex-col justify-center px-16 py-12 relative overflow-hidden">

        {/* Blob decorativo sutil claro */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100/60 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-56 h-56 bg-indigo-100/50 rounded-full blur-3xl pointer-events-none translate-x-1/2 translate-y-1/2" />

        <div className="relative max-w-sm w-full mx-auto">

          {/* Título */}
          <div className="mb-8">
            <GradientText
              colors={['#2563eb', '#4f46e5', '#1e3a8a', '#2563eb']}
              animationSpeed={6}
              className="text-3xl font-bold tracking-tight mx-0! rounded-none! mb-0"
            >
              Bienvenido de vuelta
            </GradientText>
            <p className="text-slate-500 text-sm mt-2">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ingeniero@empresa.com"
                required
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3 text-sm pr-11 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="aurora-login-btn w-full flex items-center justify-center gap-2 text-white font-semibold rounded-xl py-3 text-sm shadow-lg shadow-blue-500/30 disabled:opacity-60 transition-all mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verificando...</>
                : <><span>Ingresar</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-10">
            Lima, Perú · Motor de Pre-inversión · 2026
          </p>
        </div>
      </div>

      {/* ── Panel derecho — oscuro con edificio ── */}
      <div className="flex-1 relative overflow-hidden bg-linear-to-b from-slate-900 via-slate-950 to-black">

        {/* Glow sutil */}
        <div className="absolute -top-20 right-0 w-md h-112 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Imagen rascacielos — alineada abajo a la derecha */}
        <div className="absolute bottom-0 right-0 h-[92%] flex items-end justify-end pointer-events-none">
          <img
            src="https://pngimg.com/uploads/skyscraper/skyscraper_PNG39.png"
            alt="Edificio"
            className="h-full w-auto object-contain object-bottom opacity-80 drop-shadow-2xl"
          />
        </div>

        {/* Overlay para fundir el edificio con el fondo oscuro */}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Contenido superpuesto */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">

          <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">
            Plataforma de Pre-inversión
          </p>

          <h2 className="text-white font-bold text-6xl leading-tight drop-shadow-sm">
            Del terreno<br />
            al retorno.<br />
            <span className="text-blue-400">En minutos.</span>
          </h2>
        </div>
      </div>

      <style>{`
        @keyframes aurora-login {
          0%   { background-position: 0% 50% }
          50%  { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        .aurora-login-btn {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 20%, #4f46e5 40%, #1e3a8a 60%, #020617 80%, #3b82f6 100%);
          background-size: 400% 400%;
          animation: aurora-login 6s ease infinite;
        }
      `}</style>
    </div>
  )
}
