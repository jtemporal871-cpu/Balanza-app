import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../services/supabaseClient'
import { Settings as SettingsIcon, User, Moon, Sun, Save, AlertCircle, CheckCircle, Mail, UserPlus, Send, DollarSign } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [name, setName] = useState(user?.user_metadata?.display_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currency, setCurrency] = useState(localStorage.getItem('balanza_currency') || 'COP')
  const [inviteEmail, setInviteEmail] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const handleInvite = (e) => {
    e.preventDefault()
    const subject = "Te invito a unirte a Balanza"
    const body = `Hola, te invito a unirte a mi grupo en Balanza para llevar un control de nuestros gastos compartidos.\n\nPor favor regístrate aquí:\n${window.location.origin}/register\n\n¡Un abrazo!`
    window.location.href = `mailto:${inviteEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setInviteEmail('')
    setMessage({ type: 'success', text: 'Gestor de correo abierto para enviar la invitación.' })
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      const updates = { data: { display_name: name } }
      if (user && email !== user.email) {
         updates.email = email
      }

      const { error } = await supabase.auth.updateUser(updates)
      if (error) throw error
      
      const { error: dbError } = await supabase.from('users').update({ currency }).eq('id', user.id)
      if (dbError) throw dbError

      localStorage.setItem('balanza_currency', currency)
      setMessage({ type: 'success', text: 'Preferencias actualizadas correctamente.' })

      setTimeout(() => {
        window.location.reload()
      }, 500)

    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error actualizando perfil.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">Configuración</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Ajusta tus preferencias personales y de la aplicación.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Columna Izquierda: Ajustes Generales Rápidos */}
        <div className="space-y-6 md:col-span-1">
          <div className="glass-panel p-6 rounded-3xl border border-gray-100 dark:border-white/5">
             <h3 className="text-sm font-extrabold text-deep-900 dark:text-white uppercase tracking-widest mb-6">Apariencia</h3>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 bg-gray-50 dark:bg-deep-900/50 rounded-xl flex items-center justify-center border border-gray-100 dark:border-white/5">
                     {isDark ? <Moon className="h-5 w-5 text-blue-300" /> : <Sun className="h-5 w-5 text-orange-400" />}
                   </div>
                   <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Modo Oscuro</span>
                </div>
                <button 
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDark ? 'bg-mint-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span className={`${isDark ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                </button>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-gray-100 dark:border-white/5">
             <h3 className="text-sm font-extrabold text-deep-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
               <UserPlus className="h-4 w-4 text-mint-500" /> Invitar al Grupo
             </h3>
             <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium leading-relaxed">
               Envía velozmente una invitación para que otros colaboren en tus gastos.
             </p>
             <form onSubmit={handleInvite} className="space-y-4">
               <div>
                 <input
                   type="email"
                   required
                   placeholder="correo@ejemplo.com"
                   className="w-full rounded-2xl border border-gray-200 pl-4 pr-4 py-3 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none transition"
                   value={inviteEmail}
                   onChange={(e) => setInviteEmail(e.target.value)}
                 />
               </div>
               <button type="submit" className="w-full flex justify-center items-center gap-2 px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 rounded-2xl shadow-lg shadow-mint-500/30 transition-all hover:scale-[1.02] active:scale-95">
                 <Send className="h-4 w-4" />
                 Enviar Invitación
               </button>
             </form>
          </div>
        </div>

        {/* Columna Derecha: Perfil Formulario */}
        <div className="md:col-span-2">
          <div className="glass-panel p-8 rounded-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-mint-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <h3 className="text-lg font-extrabold text-deep-900 dark:text-white flex items-center gap-2 mb-8 relative z-10">
              <User className="h-5 w-5 text-mint-500" /> Mi Perfil
            </h3>

            {message.text && (
              <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in relative z-10 ${
                message.type === 'error' 
                  ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400'
                  : 'bg-mint-50 border-mint-100 text-mint-700 dark:bg-mint-900/20 dark:border-mint-900/50 dark:text-mint-400'
              }`}>
                {message.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle className="h-5 w-5 shrink-0" />}
                <p className="text-sm font-bold">{message.text}</p>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Nombre Mostrado</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none transition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Correo de la Cuenta</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <p className="text-xs text-rose-500 font-semibold mt-2 ml-1">Cambiar el correo requerirá reingresar a la cuenta.</p>
              </div>

              <div className="border-t border-gray-100 dark:border-white/5 pt-6 mt-8">
                 <label className="block text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Moneda Principal</label>
                 <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      className="w-full rounded-2xl border border-gray-200 pl-12 pr-4 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none transition"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option value="COP">Peso Colombiano (COP)</option>
                      <option value="USD">Dólar Estadounidense (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="MXN">Peso Mexicano (MXN)</option>
                    </select>
                 </div>
              </div>

              <div className="flex justify-end pt-6 mt-8">
                <button type="submit" disabled={loading} className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-2xl disabled:opacity-50 shadow-lg shadow-mint-500/30 transition-all active:scale-95">
                  <Save className="h-5 w-5" />
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
