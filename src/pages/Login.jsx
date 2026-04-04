import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Receipt, Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const handleGoogleSignIn = async () => {
    try {
      setError('')
      setLoading(true)
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (err) {
      setError('Error conectando con Google.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      const { error } = await signIn(email, password)
      if (error) throw error
      navigate('/')
    } catch (err) {
      console.error('Error detallado de Supabase:', err)
      setError(err?.message || 'Error al iniciar sesión. Verifica tus credenciales.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-deep-950 p-4 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-mint-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="mb-6 flex justify-center">
            <img src="/logo.png" alt="Balanza" className="h-24 w-auto rounded-3xl drop-shadow-lg shadow-mint-500/20" />
          </div>
          <h2 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">
            Bienvenido a Balanza
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
            Control exacto, cuentas claras.
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 border border-white/20 dark:border-white/5 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-2xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white dark:bg-deep-950/50 bg-white/50 shadow-inner ring-1 ring-inset ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-mint-500 text-sm font-medium transition outline-none"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-2xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white dark:bg-deep-950/50 bg-white/50 shadow-inner ring-1 ring-inset ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-mint-500 text-sm font-medium transition outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-3">
                <Link to="/forgot-password" className="text-sm font-bold text-mint-600 hover:text-mint-500 hover:underline dark:text-mint-400 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:shadow-mint-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <span className="w-1/5 border-b border-gray-200 dark:border-white/10 lg:w-1/4"></span>
            <p className="text-xs text-center text-gray-500 uppercase font-bold tracking-widest">o continúa con</p>
            <span className="w-1/5 border-b border-gray-200 dark:border-white/10 lg:w-1/4"></span>
          </div>

          <button
            onClick={handleGoogleSignIn}
            type="button"
            disabled={loading}
            className="mt-6 flex w-full justify-center items-center gap-3 rounded-2xl bg-white dark:bg-deep-900 border border-gray-200 dark:border-white/10 px-4 py-3.5 text-sm font-bold text-gray-700 dark:text-white shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400 font-medium">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="font-bold text-mint-600 hover:text-mint-500 dark:text-mint-400 transition-colors">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
