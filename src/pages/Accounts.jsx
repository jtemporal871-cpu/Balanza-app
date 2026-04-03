import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCOP } from '../utils/format'
import { 
  Wallet, Landmark, CreditCard, Banknote, ShieldCheck, 
  Smartphone, Plus, X, Trash2, Edit2, Hexagon 
} from 'lucide-react'

// Iconos disponibles
const ACCOUNT_ICONS = [
  { id: 'Wallet', icon: Wallet },
  { id: 'Landmark', icon: Landmark },
  { id: 'CreditCard', icon: CreditCard },
  { id: 'Banknote', icon: Banknote },
  { id: 'Smartphone', icon: Smartphone },
  { id: 'ShieldCheck', icon: ShieldCheck }
]

// Colores glass disponibles
const ACCOUNT_COLORS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-rose-500 to-rose-600',
  'from-mint-500 to-mint-600',
  'from-orange-500 to-orange-600',
  'from-indigo-500 to-indigo-600',
  'from-gray-700 to-gray-900'
]

export default function Accounts() {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  
  const [form, setForm] = useState({
    name: '',
    type: 'banco',
    balance: '',
    color: ACCOUNT_COLORS[0],
    icon: 'Wallet'
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('accounts').select('*').eq('is_active', true).order('created_at', { ascending: true })
      if (error) throw error
      setAccounts(data || [])
    } catch (err) {
      setError('Error al cargar las cuentas.')
    } finally {
      setLoading(false)
    }
  }

  const openForm = (account = null) => {
    setError('')
    if (account) {
      setEditingId(account.id)
      setForm({
        name: account.name,
        type: account.type,
        balance: account.balance.toString(),
        color: account.color || ACCOUNT_COLORS[0],
        icon: account.icon || 'Wallet'
      })
    } else {
      setEditingId(null)
      setForm({
        name: '',
        type: 'banco',
        balance: '',
        color: ACCOUNT_COLORS[0],
        icon: 'Wallet'
      })
    }
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name) return
    try {
       setSubmitting(true)
       
       const payload = {
         user_id: user.id,
         name: form.name.trim(),
         type: form.type,
         balance: Number(form.balance || 0),
         color: form.color,
         icon: form.icon,
         is_active: true
       }

       if (editingId) {
         const { error } = await supabase.from('accounts').update(payload).eq('id', editingId)
         if (error) throw error
       } else {
         const { error } = await supabase.from('accounts').insert([payload])
         if (error) throw error
       }

       setShowForm(false)
       fetchAccounts()
    } catch (err) {
       setError('Error al guardar la cuenta: ' + err.message)
    } finally {
       setSubmitting(false)
    }
  }

  const deleteAccount = async (id) => {
    if (!confirm('¿Seguro que deseas desactivar esta cuenta?')) return
    try {
      // Logic deletion to preserve referential integrity in expenses/incomes
      const { error } = await supabase.from('accounts').update({ is_active: false }).eq('id', id)
      if (error) throw error
      setAccounts(accounts.filter(a => a.id !== id))
    } catch (err) {
      alert('Error eliminando cuenta')
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight flex items-center gap-3">
            <Wallet className="h-8 w-8 text-mint-500" /> Mis Cuentas
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Gestiona tu liquidez, bancos y efectivo. Alimenta estas cuentas registrando ingresos.
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <button
            onClick={() => openForm()}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> Nueva Cuenta
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-gray-100 dark:border-white/5 mb-8 flex flex-col justify-center items-center text-center">
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Liquidez Total Consolidada</p>
        <p className="text-4xl sm:text-5xl font-black text-mint-600 tracking-tight">{formatCOP(totalBalance)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-mint-600">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold">Cargando cuentas...</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full p-24 flex flex-col items-center justify-center text-center glass-panel rounded-3xl">
             <div className="bg-mint-500/10 text-mint-600 h-20 w-20 rounded-3xl flex items-center justify-center mb-6">
              <Banknote className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white">Crea tu primer banco</h3>
            <p className="mt-2 text-sm text-gray-500">Documenta tu efectivo físico o cuentas de banco aquí.</p>
          </div>
        ) : (
          accounts.map(acc => {
            const IconComp = ACCOUNT_ICONS.find(i => i.id === acc.icon)?.icon || Wallet
            return (
              <div key={acc.id} className={`p-6 rounded-3xl relative overflow-hidden group shadow-lg text-white bg-gradient-to-br transition-all hover:-translate-y-1 ${acc.color}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10px] right-[-10px] opacity-10 blur-sm pointer-events-none">
                  <Hexagon className="w-40 h-40" />
                </div>
                
                <div className="flex justify-between items-start mb-10 relative z-10">
                   <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
                     <IconComp className="h-6 w-6" />
                   </div>
                   <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openForm(acc)} className="p-2 bg-white/10 hover:bg-white/30 rounded-xl transition-all" title="Editar">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteAccount(acc.id)} className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-xl transition-all" title="Desactivar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                </div>

                <div className="relative z-10">
                   <p className="text-xs font-bold text-white/70 uppercase tracking-widest">{acc.type}</p>
                   <p className="text-xl font-black mb-4 truncate">{acc.name}</p>

                   <div className="pt-4 border-t border-white/20">
                     <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Balance Disponible</p>
                     <p className="text-2xl font-extrabold tracking-tight">{formatCOP(acc.balance)}</p>
                   </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* FORM MODAL */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-white dark:bg-deep-900 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
             <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20 shrink-0">
               <h2 className="text-2xl font-black text-deep-900 dark:text-white tracking-tight">
                 {editingId ? 'Modificar Cuenta' : 'Nueva Cuenta'}
               </h2>
               <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full dark:hover:bg-white/10 dark:hover:text-white transition-all"><X className="h-6 w-6" /></button>
             </div>

             <div className="p-8 space-y-6">
                {error && <div className="p-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm dark:bg-red-900/20">{error}</div>}
                
                <form id="account-form" onSubmit={handleSave} className="space-y-6">
                  <div>
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre</label>
                     <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                       placeholder="Ej. Bancolombia, Nequi..." />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo</label>
                      <select required value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                        className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none bg-white">
                        <option value="banco">Cuenta Bancaria</option>
                        <option value="billetera">Billetera Digital</option>
                        <option value="efectivo">Efectivo Físico</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Saldo Inicial (COP)</label>
                      <input type="text" inputMode="numeric" required value={form.balance ? new Intl.NumberFormat('es-CO').format(form.balance) : ''} onChange={e => setForm({...form, balance: e.target.value.replace(/\D/g, '')})}
                         className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                         placeholder="0" />
                    </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Aspecto Visual</label>
                     <div className="flex gap-2 flex-wrap mb-4">
                        {ACCOUNT_ICONS.map(ic => {
                           const Icon = ic.icon
                           return (
                             <button type="button" key={ic.id} onClick={() => setForm({...form, icon: ic.id})}
                               className={`p-3 rounded-xl border-2 transition-all ${form.icon === ic.id ? 'border-mint-500 bg-mint-50 text-mint-600 dark:bg-mint-500/20 dark:text-mint-400' : 'border-gray-100 text-gray-400 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/10'}`}>
                               <Icon className="h-5 w-5" />
                             </button>
                           )
                        })}
                     </div>
                     <div className="flex gap-2 flex-wrap">
                        {ACCOUNT_COLORS.map(c => (
                          <button type="button" key={c} onClick={() => setForm({...form, color: c})}
                            className={`h-8 w-8 rounded-full bg-gradient-to-br ${c} transition-all border-2 ${form.color === c ? 'border-white ring-2 ring-mint-500 shadow-lg scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`} />
                        ))}
                     </div>
                  </div>
                </form>
             </div>

             <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-deep-900/50 flex gap-3 shrink-0">
               <button onClick={() => setShowForm(false)} className="flex-1 py-3.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-deep-800 dark:text-gray-300 dark:border-white/10 transition-colors">Cancelar</button>
               <button type="submit" form="account-form" disabled={submitting} className="flex-1 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-xl shadow-lg shadow-mint-500/30 transition-all flex items-center justify-center">
                 {submitting ? 'Guardando...' : 'Guardar'}
               </button>
             </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}
