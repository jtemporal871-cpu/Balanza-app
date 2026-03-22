import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Receipt, Mail, Lock, User, AlertCircle } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setError('')
      setLoading(true)
      const { error } = await signUp({ email, password }, { data: { display_name: name } })
      if (error) throw error
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al registrar usuario.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-deep-950 p-4 transition-colors duration-300 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-20%] right-[-10%] w-96 h-96 bg-mint-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-500 flex flex-col items-center">
        
        <div className="text-center mb-6">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 items-center justify-center shadow-lg shadow-mint-500/30 ring-4 ring-white/50 dark:ring-white/10 mb-4">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">
            Crear Cuenta
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-medium">
            Únete a Balanza y empieza a compartir gastos.
          </p>
        </div>

        <div className="glass-panel w-full rounded-3xl p-8 border border-white/20 dark:border-white/5 shadow-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 flex items-center gap-3 animate-in fade-in">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full rounded-2xl border-0 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white dark:bg-deep-950/50 bg-white/50 shadow-inner ring-1 ring-inset ring-gray-200 dark:ring-white/10 focus:ring-2 focus:ring-inset focus:ring-mint-500 text-sm font-medium transition outline-none"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full justify-center rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-4 py-4 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:shadow-mint-500/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400 font-medium">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-bold text-mint-600 hover:text-mint-500 dark:text-mint-400 transition-colors">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
