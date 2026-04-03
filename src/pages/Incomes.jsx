import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ArrowUpCircle, Plus, X, Calendar, Wallet, AlertCircle, Edit2, Trash2, Tag, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Briefcase, Laptop, RefreshCw, ShoppingBag } from 'lucide-react'
import { formatCOP } from '../utils/format'

const ICON_OPTIONS = {
  ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag,
  Briefcase, Calendar, Laptop, RefreshCw, ShoppingBag, Plus
}

export default function Incomes() {
  const { user } = useAuth()
  const [incomes, setIncomes] = useState([])
  const [accounts, setAccounts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [timeFilter, setTimeFilter] = useState('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingOriginalData, setEditingOriginalData] = useState(null) // Para revertir el balance si edita

  const [form, setForm] = useState({
    amount: '',
    description: '',
    category_id: '',
    date: new Date().toISOString().slice(0, 10),
    account_id: ''
  })

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (user?.id) {
       if (timeFilter !== 'custom' || (timeFilter === 'custom' && customDateRange.start && customDateRange.end)) {
          fetchIncomes()
       }
    }
  }, [timeFilter, customDateRange, user])

  const fetchInitialData = async () => {
    try {
      const { data: accountsData, error: accountsErr } = await supabase.from('accounts').select('*').eq('is_active', true)
      if (accountsErr) throw accountsErr
      setAccounts(accountsData || [])

      const { data: catData, error: catErr } = await supabase.from('categories').select('*').eq('type', 'ingreso').order('name')
      if (catErr) throw catErr
      setCategories(catData || [])
    } catch (err) {}
  }

  const fetchIncomes = async () => {
    setLoading(true)
    try {
      let query = supabase.from('incomes').select('*, accounts(name, icon, color), categories(name, icon, color)').order('date', { ascending: false }).order('created_at', { ascending: false })
      
      const now = new Date()
      let startDate, endDate
      
      if (timeFilter === 'this_month') {
        const y = now.getFullYear()
        const m = String(now.getMonth() + 1).padStart(2, '0')
        startDate = `${y}-${m}-01`
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
        endDate = `${y}-${m}-${lastDay}`
      } else if (timeFilter === 'last_3_months') {
        const threeAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        startDate = `${threeAgo.getFullYear()}-${String(threeAgo.getMonth() + 1).padStart(2, '0')}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
      } else if (timeFilter === 'last_6_months') {
        const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        startDate = `${sixAgo.getFullYear()}-${String(sixAgo.getMonth() + 1).padStart(2, '0')}-01`
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`
      } else if (timeFilter === 'this_year') {
        startDate = `${now.getFullYear()}-01-01`
        endDate = `${now.getFullYear()}-12-31`
      } else if (timeFilter === 'custom') {
         startDate = customDateRange.start || null
         endDate = customDateRange.end || null
      }

      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)

      const { data, error } = await query
      if (error) throw error
      setIncomes(data || [])
    } catch (err) {
      setError('Error al cargar ingresos.')
    } finally {
      setLoading(false)
    }
  }

  const openForm = (income = null) => {
    setError('')
    if (income) {
      setEditingId(income.id)
      setEditingOriginalData(income)
      setForm({
        amount: income.amount.toString(),
        description: income.description,
        category_id: income.category_id,
        date: income.date,
        account_id: income.account_id
      })
    } else {
      setEditingId(null)
      setEditingOriginalData(null)
      setForm({
        amount: '',
        description: '',
        category_id: categories.length > 0 ? categories[0].id : '',
        date: new Date().toISOString().slice(0, 10),
        account_id: accounts.length > 0 ? accounts[0].id : ''
      })
    }
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0 || !form.description || !form.account_id) return
    
    try {
      setSubmitting(true)
      const numAmount = Number(form.amount)
      
      const payload = {
        user_id: user.id,
        account_id: form.account_id,
        amount: numAmount,
        description: form.description.trim(),
        category_id: form.category_id,
        date: form.date
      }

      const selectedAccount = accounts.find(a => a.id === form.account_id)

      if (editingId) {
        // Lógica de actualización con restauración del balance anterior
        if (editingOriginalData.account_id === payload.account_id) {
           const diff = numAmount - Number(editingOriginalData.amount)
           await supabase.from('accounts').update({ balance: selectedAccount.balance + diff }).eq('id', payload.account_id)
        } else {
           // Restar de la cuenta vieja
           const oldAcc = accounts.find(a => a.id === editingOriginalData.account_id)
           if (oldAcc) await supabase.from('accounts').update({ balance: oldAcc.balance - Number(editingOriginalData.amount) }).eq('id', oldAcc.id)
           // Sumar a la cuenta nueva
           await supabase.from('accounts').update({ balance: selectedAccount.balance + numAmount }).eq('id', payload.account_id)
        }
        
        const { error } = await supabase.from('incomes').update(payload).eq('id', editingId)
        if (error) throw error
      } else {
        // Inserción directa (sumar balance a cuenta enlazada)
        await supabase.from('accounts').update({ balance: selectedAccount.balance + numAmount }).eq('id', payload.account_id)
        
        const { error } = await supabase.from('incomes').insert([payload])
        if (error) throw error
      }

      setShowForm(false)
      fetchInitialData() // refresh balances
      fetchIncomes()    // refresh list
    } catch (err) {
      setError('Error al registrar el ingreso: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (income) => {
    if (!confirm('¿Seguro que deseas eliminar este ingreso? Se restará este monto del balance de la cuenta seleccionada.')) return
    try {
      // Revertir el dinero físicamente de la cuenta conectada
      const acc = accounts.find(a => a.id === income.account_id)
      if (acc) {
        await supabase.from('accounts').update({ balance: acc.balance - Number(income.amount) }).eq('id', acc.id)
      }
      
      const { error } = await supabase.from('incomes').delete().eq('id', income.id)
      if (error) throw error
      
      fetchInitialData()
      fetchIncomes()
    } catch(err) {
      alert('Error eliminando ingreso.')
    }
  }

  const totalMonth = incomes.reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight flex items-center gap-3">
            <ArrowUpCircle className="h-8 w-8 text-mint-500" /> Ingresos
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Registra tu salario, y otros flujos positivos inyectando dinero a tus bancos.
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <button
            onClick={() => openForm()}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> Registrar Ingreso
          </button>
        </div>
      </div>

      <div className="mb-8 glass-panel p-6 rounded-3xl flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
        <div className="w-full xl:w-auto flex-1">
           <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 dark:text-gray-400">Filtrar por fecha</label>
           <div className="flex flex-col gap-3 w-full">
             <div className="flex flex-wrap gap-2 bg-gray-50 dark:bg-black/20 p-2 rounded-2xl border border-gray-100 dark:border-white/5 w-fit">
               {[
                 { id: 'this_month', label: 'Este mes' },
                 { id: 'last_3_months', label: 'Últimos 3 meses' },
                 { id: 'last_6_months', label: 'Últimos 6 meses' },
                 { id: 'this_year', label: 'Este año' },
                 { id: 'custom', label: 'Personalizado' }
               ].map(f => (
                 <button
                   key={f.id}
                   onClick={() => setTimeFilter(f.id)}
                   className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${timeFilter === f.id ? 'bg-white text-mint-600 shadow-sm border border-gray-200 dark:bg-deep-800 dark:text-mint-400 dark:border-white/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5'}`}
                 >
                   {f.label}
                 </button>
               ))}
             </div>
             {timeFilter === 'custom' && (
               <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                 <input type="date" value={customDateRange.start} onChange={e => setCustomDateRange({...customDateRange, start: e.target.value})} className="flex-1 sm:flex-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 focus:border-mint-500 focus:ring-mint-500 shadow-sm dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none" />
                 <span className="text-gray-400 font-bold">-</span>
                 <input type="date" value={customDateRange.end} onChange={e => setCustomDateRange({...customDateRange, end: e.target.value})} className="flex-1 sm:flex-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 focus:border-mint-500 focus:ring-mint-500 shadow-sm dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none" />
               </div>
             )}
           </div>
        </div>
        <div className="w-full xl:w-auto text-left xl:text-right p-5 bg-mint-50/50 dark:bg-mint-500/10 rounded-2xl border border-mint-100 dark:border-mint-900 overflow-hidden shrink-0">
          <p className="text-xs font-bold text-mint-600 dark:text-mint-400 uppercase tracking-widest mb-1.5">Total Ingresado (Período)</p>
          <p className="text-3xl font-black text-deep-900 dark:text-white tracking-tight">{formatCOP(totalMonth)}</p>
        </div>
      </div>

      <div className="glass-panel rounded-3xl overflow-hidden border border-gray-100 dark:border-white/5">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-mint-600">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold">Cargando ingresos...</span>
          </div>
        ) : incomes.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
             <div className="bg-mint-500/10 text-mint-600 h-20 w-20 rounded-3xl flex items-center justify-center mb-6">
              <ArrowUpCircle className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white">Sin flujos positivos</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">No has documentado ninguna entrada de dinero en este mes.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {incomes.map(inc => (
              <li key={inc.id} className="p-6 sm:p-8 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6 group">
                <div className="flex items-center gap-5 min-w-0">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white bg-mint-500 shadow-md shrink-0 bg-gradient-to-br ${inc.accounts?.color || 'from-mint-500 to-mint-600'}`}>
                    <ArrowUpCircle className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-lg font-extrabold text-deep-900 dark:text-white truncate tracking-tight">
                      {inc.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-gray-500">
                      <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                        <Calendar className="h-3 w-3" /> {new Date(inc.date).toLocaleDateString('es-CO')}
                      </span>
                      <span className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-md capitalize">
                        <Tag className="h-3 w-3" /> {inc.categories?.name || 'Varios'}
                      </span>
                      <span className="flex items-center gap-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-md">
                        <Wallet className="h-3 w-3" /> {inc.accounts?.name || 'Cuenta eliminada'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-mint-600 dark:text-mint-400 tracking-tight">
                      +{formatCOP(inc.amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openForm(inc)} className="p-3 text-gray-400 hover:text-mint-600 hover:bg-mint-50 rounded-xl transition-all" title="Editar">
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(inc)} className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* FORM MODAL EN PORTAL */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white dark:bg-deep-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
             
             <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20 shrink-0">
               <h2 className="text-2xl font-black text-deep-900 dark:text-white tracking-tight">
                 {editingId ? 'Modificar Ingreso' : 'Registrar Ingreso'}
               </h2>
               <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all"><X className="h-6 w-6" /></button>
             </div>

             <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
               {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm">{error}</div>}
               
               <form id="income-form" onSubmit={handleSave} className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto total (COP)</label>
                   <input type="text" inputMode="numeric" required value={form.amount ? new Intl.NumberFormat('es-CO').format(form.amount) : ''} onChange={e => setForm({...form, amount: e.target.value.replace(/\D/g, '')})}
                     className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-lg font-bold text-mint-600 focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 outline-none"
                     placeholder="0" />
                 </div>

                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                   <input type="text" required value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                     className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 outline-none dark:text-white"
                     placeholder="Ej. Pago Quincena, Proyecto Diseño..." />
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                   <div className="col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Categoría</label>
                     <select required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none bg-white">
                       <option value="" disabled>Seleccione categoría...</option>
                       {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                   </div>
                   <div className="col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fecha</label>
                     <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 text-gray-500 outline-none" />
                   </div>
                 </div>

                 <div className="p-5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                    <label className="block text-sm font-black text-blue-800 dark:text-blue-400 tracking-tight mb-2 flex items-center gap-2">
                       <Wallet className="h-4 w-4" /> ¿A qué cuenta entra este dinero?
                    </label>
                    {accounts.length === 0 ? (
                       <p className="text-xs text-rose-500 font-bold">Primero debes crear una Cuenta Bancaria en la pestaña Mis Cuentas.</p>
                    ) : (
                      <select required value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}
                        className="w-full rounded-xl border border-blue-200 px-4 py-3 text-sm font-bold text-blue-900 focus:border-blue-500 focus:ring-blue-500 shadow-inner dark:bg-deep-900 dark:border-white/10 dark:text-white outline-none bg-white">
                        <option value="" disabled>Seleccione una cuenta receptora...</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} (Balance actual: {formatCOP(a.balance)})</option>)}
                      </select>
                    )}
                 </div>
               </form>
             </div>

             <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-deep-900/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
               <button onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-4 sm:py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors dark:bg-deep-800 dark:border-white/10 dark:text-gray-300">Cancelar</button>
               <button type="submit" form="income-form" disabled={submitting || accounts.length === 0} className="w-full sm:w-auto px-8 py-4 sm:py-3 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-xl shadow-lg shadow-mint-500/30 disabled:opacity-50 transition-all flex items-center justify-center">
                 {submitting ? 'Guardando...' : 'Confirmar Ingreso'}
               </button>
             </div>
          </div>
        </div>, document.body
      )}
    </div>
  )
}
