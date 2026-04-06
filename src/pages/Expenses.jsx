import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, AlertCircle, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag, Calendar, Receipt } from 'lucide-react'
import { formatCOP } from '../utils/format'

const ICON_MAP = {
  ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag
}

export default function Expenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [participants, setParticipants] = useState([])
  const [categories, setCategories] = useState([])
  const [debtsList, setDebtsList] = useState([])
  const [accounts, setAccounts] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [timeFilter, setTimeFilter] = useState('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })
  const [filterCategory, setFilterCategory] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingOriginalData, setEditingOriginalData] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [categoryId, setCategoryId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [splitType, setSplitType] = useState('equal') 
  const [isDebtPayment, setIsDebtPayment] = useState(false)
  const [isDebtJustification, setIsDebtJustification] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState('')
  const [debtPaymentType, setDebtPaymentType] = useState('installments')
  
  const [splits, setSplits] = useState([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (participants.length > 0) {
      if (timeFilter !== 'custom' || (timeFilter === 'custom' && customDateRange.start && customDateRange.end)) {
        fetchExpenses()
      }
    }
  }, [timeFilter, customDateRange, filterCategory, participants])

  const fetchInitialData = async () => {
    try {
      const [catRes, partRes, debtRes, accRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('participants').select('*').order('name'),
        supabase.from('debts').select('*').eq('status', 'active').order('name'),
        supabase.from('accounts').select('*').eq('is_active', true).order('name')
      ])
      
      if (catRes.error) throw catRes.error
      if (partRes.error) throw partRes.error
      if (debtRes.error) throw debtRes.error
      if (accRes.error) throw accRes.error
      
      setCategories(catRes.data || [])
      setParticipants(partRes.data || [])
      setDebtsList(debtRes.data || [])
      setAccounts(accRes.data || [])
    } catch (err) {
      setError('Error al cargar datos base.')
    }
  }

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('expenses')
        .select(`
          *,
          categories ( id, name, icon, color ),
          participants ( id, name ),
          expense_splits ( participant_id, amount_owed, percentage )
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

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

      if (filterCategory !== 'all') {
        query = query.eq('category_id', filterCategory)
      }

      const { data, error } = await query
      if (error) throw error
      setExpenses(data || [])
    } catch (err) {
      setError('Error al cargar gastos.')
    } finally {
      setLoading(false)
    }
  }

  const openForm = (expense = null) => {
    setError('')
    if (expense) {
      setEditingId(expense.id)
      setEditingOriginalData(expense)
      setAmount(expense.amount.toString())
      setDescription(expense.description)
      setDate(expense.date)
      setCategoryId(expense.category_id || '')
      setPayerId(expense.payer_id)
      setAccountId(expense.account_id || '')
      setSplitType(expense.split_type)
      setIsDebtPayment(!!expense.debt_id && !expense.is_debt_justification)
      setIsDebtJustification(!!expense.is_debt_justification)
      setSelectedDebtId(expense.debt_id || '')
      
      const splitData = participants.map(p => {
        const existing = expense.expense_splits.find(es => es.participant_id === p.id)
        return {
          participant_id: p.id,
          included: !!existing,
          percentage: existing ? (existing.percentage || 0) : 0
        }
      })
      setSplits(splitData)
    } else {
      setEditingId(null)
      setEditingOriginalData(null)
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().slice(0, 10))
      setCategoryId(categories.length > 0 ? categories[0].id : '')
      setPayerId(participants.length > 0 ? participants[0].id : '')
      setAccountId('')
      setSplitType('equal')
      setIsDebtPayment(false)
      setIsDebtJustification(false)
      setSelectedDebtId('')
      setDebtPaymentType('installments')
      
      setSplits(participants.map(p => ({
        participant_id: p.id,
        included: true,
        percentage: Number((100 / participants.length).toFixed(2))
      })))
    }
    setShowForm(true)
  }

  const handleSplitChange = (participantId, field, value) => {
    setSplits(current => current.map(s => {
      if (s.participant_id === participantId) {
        return { ...s, [field]: value }
      }
      return s
    }))
  }

  const validateAndPrepareSplits = (totalAmount) => {
    let finalSplits = []
    
    if (splitType === 'equal') {
      const activeSplits = splits.filter(s => s.included)
      if (activeSplits.length === 0) throw new Error('Debe haber al menos un participante incluido en la división.')
      
      const splitAmount = Number((totalAmount / activeSplits.length).toFixed(2))
      
      finalSplits = activeSplits.map(s => ({
        participant_id: s.participant_id,
        amount_owed: splitAmount,
        percentage: null
      }))
      
      const totalAssigned = splitAmount * activeSplits.length
      if (totalAssigned !== totalAmount) {
        finalSplits[finalSplits.length - 1].amount_owed += (totalAmount - totalAssigned)
      }
    } else if (splitType === 'percentages') {
      const activeSplits = splits.filter(s => s.included)
      if (activeSplits.length === 0) throw new Error('Debe haber al menos un participante incluido.')
      
      const totalPct = activeSplits.reduce((sum, s) => sum + Number(s.percentage || 0), 0)
      if (Math.abs(totalPct - 100) > 0.1) {
        throw new Error(`Los porcentajes deben sumar 100%. Actualmente suman ${totalPct.toFixed(1)}%`)
      }
      
      let assignedSum = 0;
      finalSplits = activeSplits.map((s, index) => {
        const amt = Number(((totalAmount * Number(s.percentage)) / 100).toFixed(2))
        assignedSum += amt
        return {
          participant_id: s.participant_id,
          amount_owed: amt,
          percentage: Number(s.percentage)
        }
      })
      
      if (assignedSum !== totalAmount) {
         finalSplits[finalSplits.length - 1].amount_owed += (totalAmount - assignedSum)
      }
    }
    
    return finalSplits
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0 || !description || !payerId) {
      setError('Por favor completa todos los campos correctamente.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const totalAmount = Number(amount)
      const preparedSplits = validateAndPrepareSplits(totalAmount)

      let finalCategoryId = categoryId || null
      if ((isDebtPayment || isDebtJustification) && !finalCategoryId) {
        let debtCat = categories.find(c => c.name.toLowerCase() === 'deudas')
        if (!debtCat) {
          const { data: newCat, error: catError } = await supabase.from('categories').insert([{ user_id: user.id, name: 'Deudas', icon: 'Tag', color: 'bg-rose-500 text-white' }]).select()
          if (catError) throw catError
          debtCat = newCat[0]
          setCategories(prev => [...prev, debtCat])
        }
        finalCategoryId = debtCat.id
      }

      const expenseData = {
        user_id: user.id,
        payer_id: payerId,
        category_id: finalCategoryId,
        amount: totalAmount,
        description: description.trim(),
        date,
        split_type: splitType,
        debt_id: (isDebtPayment || isDebtJustification) && selectedDebtId ? selectedDebtId : null,
        is_debt_justification: !!isDebtJustification,
        account_id: accountId || null
      }

      if (editingId) {
        const { error: expError } = await supabase.from('expenses').update(expenseData).eq('id', editingId)
        if (expError) throw expError

        const { error: delError } = await supabase.from('expense_splits').delete().eq('expense_id', editingId)
        if (delError) throw delError

        const { error: insError } = await supabase.from('expense_splits').insert(preparedSplits.map(s => ({ ...s, expense_id: editingId })))
        if (insError) throw insError

        // Actualizar balance de cuentas (Reversión/Inyección dinámica)
        if (editingOriginalData.account_id || accountId) {
           const oldAccId = editingOriginalData.account_id
           const newAccId = accountId || null
           const oldAmount = Number(editingOriginalData.amount)
           const newAmount = totalAmount

           if (oldAccId === newAccId && newAccId) {
              const diff = newAmount - oldAmount
              const acc = accounts.find(a => a.id === newAccId)
              if (acc) await supabase.from('accounts').update({ balance: acc.balance - diff }).eq('id', newAccId)
           } else {
              if (oldAccId) {
                 const oldAcc = accounts.find(a => a.id === oldAccId)
                 if (oldAcc) await supabase.from('accounts').update({ balance: oldAcc.balance + oldAmount }).eq('id', oldAccId)
              }
              if (newAccId) {
                 const newAcc = accounts.find(a => a.id === newAccId)
                 if (newAcc) await supabase.from('accounts').update({ balance: newAcc.balance - newAmount }).eq('id', newAccId)
              }
           }
        }

      } else {
        const { data: expRes, error: expError } = await supabase.from('expenses').insert([expenseData]).select()
        if (expError) throw expError

        const newExpId = expRes[0].id
        const { error: insError } = await supabase.from('expense_splits').insert(preparedSplits.map(s => ({ ...s, expense_id: newExpId })))
        if (insError) throw insError
        
        // Descontar plata de la cuenta bancaria inmediatamente
        if (accountId) {
           const newAcc = accounts.find(a => a.id === accountId)
           if (newAcc) await supabase.from('accounts').update({ balance: newAcc.balance - totalAmount }).eq('id', accountId)
        }

        // Lógica dual de pago de deudas desde Gastos
        if (isDebtPayment && selectedDebtId) {
          const debt = debtsList.find(d => d.id === selectedDebtId)
          if (debt) {
            if (debtPaymentType === 'installments' && debt.paid_installments < debt.total_installments) {
                const newPaid = debt.paid_installments + 1
                const isPaidOff = newPaid >= debt.total_installments
                const newRemaining = isPaidOff ? 0 : Math.max(0, debt.remaining_amount - debt.installment_amount)
                await supabase.from('debts').update({
                  paid_installments: newPaid,
                  remaining_amount: newRemaining,
                  status: isPaidOff ? 'paid' : 'active'
                }).eq('id', debt.id)
            } else if (debtPaymentType === 'capital') {
                const abono = totalAmount
                const newRemaining = Math.max(0, debt.remaining_amount - abono)
                const isPaidOff = newRemaining <= 0
                
                const n = debt.total_installments - debt.paid_installments
                const rate = Number(debt.interest_rate) / 100
                
                let newInstallment = 0
                if (!isPaidOff && n > 0) {
                   if (rate === 0) {
                      newInstallment = newRemaining / n
                   } else {
                      const factor = Math.pow(1 + rate, n)
                      newInstallment = newRemaining * ((rate * factor) / (factor - 1))
                   }
                }

                await supabase.from('debts').update({
                  remaining_amount: newRemaining,
                  installment_amount: newInstallment,
                  status: isPaidOff ? 'paid' : 'active'
                }).eq('id', debt.id)
            }
            supabase.from('debts').select('*').eq('status', 'active').then(r => r.data && setDebtsList(r.data))
          }
        }
      }

      setShowForm(false)
      fetchInitialData() // refresh accounts for internal balance calculation next time
      fetchExpenses()
    } catch (err) {
      setError(err.message || 'Error al guardar gasto.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (expense) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto de forma permanente?')) return
    try {
      // Devolver plata a la cuenta
      if (expense.account_id) {
         const acc = accounts.find(a => a.id === expense.account_id)
         if (acc) await supabase.from('accounts').update({ balance: acc.balance + Number(expense.amount) }).eq('id', expense.account_id)
      }
      
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
      if (error) throw error
      
      setExpenses(expenses.filter(e => e.id !== expense.id))
      fetchInitialData() // refresh cuentas
    } catch (err) {
      setError('Error al eliminar gasto.')
    }
  }

  const renderIcon = (cat) => {
    if (!cat) return <div className="p-3 rounded-2xl bg-gray-100 text-gray-400 dark:bg-white/5"><Tag className="h-6 w-6" /></div>
    const IconComp = ICON_MAP[cat.icon] || Tag
    return (
      <div className={`p-4 rounded-2xl text-white ${cat.color} shadow-lg`}>
        <IconComp className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">Gastos</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Control integral de gastos. Añade facturas y divide cuentas con tus contactos.
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <button
            onClick={() => openForm()}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:shadow-mint-500/50 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> Nuevo Gasto
          </button>
        </div>
      </div>

      {error && !showForm && (
        <div className="mb-6 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 shadow-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* FILTROS */}
      <div className="mb-8 glass-panel p-6 rounded-3xl flex flex-col xl:flex-row gap-6 items-start xl:items-end w-full">
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
        <div className="w-full xl:w-auto xl:min-w-[250px] shrink-0">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 dark:text-gray-400">Categoría</label>
          <select 
            className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold text-gray-700 focus:border-mint-500 focus:ring-mint-500 shadow-sm dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.filter(c => c.type === 'gasto').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* LISTA DE GASTOS */}
      <div className="glass-panel rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center text-mint-600 dark:text-mint-400">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold text-sm">Cargando gastos...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-24 flex flex-col items-center justify-center text-center">
             <div className="bg-mint-500/10 text-mint-600 dark:bg-mint-500/20 dark:text-mint-400 h-20 w-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-mint-500/20">
              <Receipt className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white tracking-tight">No hay gastos</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">
              No se encontraron gastos para estos filtros. Comienza agregando uno nuevo arriba.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5">
            {expenses.map((expense) => (
              <li key={expense.id} className="p-6 sm:p-8 hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-6 group">
                <div className="flex items-center gap-5 min-w-0">
                  {renderIcon(expense.categories)}
                  <div className="flex flex-col min-w-0">
                    <p className="text-lg font-extrabold text-deep-900 dark:text-white truncate tracking-tight">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                        <Calendar className="h-4 w-4" /> {new Date(expense.date).toLocaleDateString('es-CO')}
                      </span>
                      <span className="opacity-50 hidden sm:inline">•</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint-500"></span> Pagó <strong className="text-deep-800 dark:text-white">{expense.participants?.name}</strong></span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8">
                  <div className="text-left sm:text-right">
                    <p className="text-2xl font-black text-deep-900 dark:text-white tracking-tight">
                      {formatCOP(expense.amount)}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-mint-600 dark:text-mint-400 mt-1">
                      {expense.split_type === 'equal' ? 'Partes iguales' : 'Porcentajes'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openForm(expense)} className="p-3 text-gray-400 hover:text-mint-600 hover:bg-mint-50 rounded-xl transition-all dark:hover:text-mint-400 dark:hover:bg-white/5" title="Editar">
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button onClick={() => handleDelete(expense)} className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all dark:hover:text-rose-400 dark:hover:bg-white/5" title="Eliminar">
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
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-deep-950/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-2xl bg-white dark:bg-deep-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-12 sm:zoom-in-95 duration-400 border border-white/10">
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-100 dark:border-white/5 shrink-0 bg-white/50 dark:bg-black/20">
              <h2 className="text-2xl font-extrabold text-deep-900 dark:text-white tracking-tight">
                {editingId ? 'Modificar Gasto' : 'Registrar Nuevo Gasto'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-full p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto px-6 py-6 sm:px-8 sm:py-8 flex-1 relative custom-scrollbar">
              <form id="expense-form" onSubmit={handleSave} className="space-y-8">
                
                {error && (
                  <div className="p-4 text-sm font-bold text-red-600 bg-red-50 rounded-2xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto total (COP)</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                        <span className="text-gray-500 font-bold">$</span>
                      </div>
                      <input type="text" inputMode="numeric" required value={amount ? new Intl.NumberFormat('es-CO').format(amount) : ''} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                        className="w-full rounded-2xl border border-gray-200 pl-10 pr-5 py-3.5 text-base font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fecha</label>
                    <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descripción</label>
                  <input type="text" required value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                    placeholder="Ej. Cena hamburguesas, Uber al aeropuerto..."
                  />
                </div>
                
                {/* CHECKBOX DEUDAS */}
                <div className="bg-gray-50 dark:bg-deep-950 p-5 rounded-3xl border border-gray-100 dark:border-white/5 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/10 group">
                      <div className="pt-1">
                        <input 
                          type="checkbox" 
                          checked={isDebtPayment} 
                          onChange={e => {
                            setIsDebtPayment(e.target.checked);
                            if (e.target.checked) setIsDebtJustification(false);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-mint-600 focus:ring-mint-500 dark:border-white/20 dark:bg-deep-900 shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-deep-900 dark:text-white">Pago de deuda</span>
                        <span className="text-[11px] text-gray-500 font-medium">Descontar del saldo de la deuda vinculada.</span>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer p-3 rounded-2xl hover:bg-white dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/10 group">
                      <div className="pt-1">
                        <input 
                          type="checkbox" 
                          checked={isDebtJustification} 
                          onChange={e => {
                            setIsDebtJustification(e.target.checked);
                            if (e.target.checked) setIsDebtPayment(false);
                          }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-white/20 dark:bg-deep-900 shadow-inner"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-deep-900 dark:text-white">Justificación de deuda</span>
                        <span className="text-[11px] text-gray-500 font-medium">Vincular este gasto como el destino del crédito.</span>
                      </div>
                    </label>
                  </div>
                  
                  {(isDebtPayment || isDebtJustification) && (
                    <div className="animate-in fade-in slide-in-from-top-2 space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                       {isDebtPayment && (
                         <div className="flex gap-2 sm:gap-3 bg-gray-100 p-1.5 rounded-2xl dark:bg-black/20 dark:border dark:border-white/5 shadow-inner">
                           <button type="button" onClick={() => setDebtPaymentType('installments')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${debtPaymentType === 'installments' ? 'bg-white text-deep-900 shadow-md dark:bg-deep-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Pago de Cuota</button>
                           <button type="button" onClick={() => setDebtPaymentType('capital')} className={`flex-1 py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all ${debtPaymentType === 'capital' ? 'bg-white text-deep-900 shadow-md dark:bg-deep-800 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>Abono a Capital</button>
                         </div>
                       )}
                       
                       <div className="space-y-2">
                         <label className="text-[11px] font-black uppercase tracking-widest text-gray-400 ml-1">Seleccionar Deuda Objetivo</label>
                         <select 
                           required 
                           value={selectedDebtId} 
                           onChange={e => setSelectedDebtId(e.target.value)}
                           className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-900 dark:border-white/10 dark:text-white transition outline-none"
                         >
                           <option value="" disabled>Seleccione una deuda activa...</option>
                           {debtsList.map(d => (
                              <option key={d.id} value={d.id}>{d.name} - {isDebtPayment ? (debtPaymentType === 'installments' ? `Cuota ${formatCOP(d.installment_amount)}` : `Saldo ${formatCOP(d.remaining_amount)}`) : `Capital ${formatCOP(d.total_amount)}`}</option>
                           ))}
                         </select>
                       </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Categoría {isDebtPayment && <span className="text-gray-400 font-normal ml-1">(Opcional)</span>}
                    </label>
                    <select required={!isDebtPayment} value={categoryId} onChange={e => setCategoryId(e.target.value)}
                      className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                    >
                      <option value="" disabled={!isDebtPayment}>Seleccione...</option>
                      {categories.filter(c => c.type === 'gasto').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pagado por</label>
                    <select required value={payerId} onChange={e => setPayerId(e.target.value)}
                      className="w-full rounded-2xl border-transparent px-5 py-3.5 text-sm font-bold text-mint-700 focus:border-mint-500 focus:ring-mint-500 shadow-inner bg-mint-50 dark:bg-mint-500/10 dark:text-mint-400 transition outline-none"
                    >
                      <option value="" disabled>Seleccione quién pagó</option>
                      {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cuenta Origen de Pago <span className="text-gray-400 font-normal ml-1">(Opcional)</span></label>
                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                       <select value={accountId} onChange={e => setAccountId(e.target.value)}
                         className="w-full rounded-xl border-blue-200 px-4 py-3 text-sm font-bold text-blue-900 focus:border-blue-500 focus:ring-blue-500 shadow-inner dark:bg-deep-900 dark:border-white/10 dark:text-white outline-none bg-white">
                         <option value="">No descontar de ninguna cuenta (En efectivo por fuera)</option>
                         {accounts.map(a => <option key={a.id} value={a.id}>Descontar saldo de: {a.name} (Balance actual: {formatCOP(a.balance)})</option>)}
                       </select>
                       <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-2">
                         Si seleccionas una de tus cuentas, restaremos este gasto de su saldo automáticamente.
                       </p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-gray-100 dark:border-white/10">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <label className="block text-base font-extrabold text-deep-900 dark:text-white tracking-tight">Participan y división:</label>
                    <select value={splitType} onChange={e => setSplitType(e.target.value)}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-extrabold uppercase tracking-widest focus:border-mint-500 focus:ring-mint-500 shadow-sm bg-gray-50 text-gray-700 dark:bg-white/5 dark:border-white/10 dark:text-white outline-none"
                    >
                      <option value="equal">Partes iguales</option>
                      <option value="percentages">Porcentajes %</option>
                    </select>
                  </div>

                  <div className="space-y-3 p-2 bg-gray-50 dark:bg-deep-950 border border-gray-100 dark:border-white/5 rounded-3xl shadow-inner">
                    {splits.map((split) => {
                      const participant = participants.find(p => p.id === split.participant_id)
                      return (
                        <div key={split.participant_id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${split.included ? 'bg-white shadow-md dark:bg-deep-800 border border-transparent' : 'opacity-60 grayscale border border-transparent'}`}>
                          <label className="flex items-center gap-4 flex-1 cursor-pointer min-w-0">
                            <input type="checkbox" checked={split.included} onChange={e => handleSplitChange(split.participant_id, 'included', e.target.checked)}
                              className="h-6 w-6 rounded-md border-gray-300 text-mint-600 focus:ring-mint-500 dark:border-gray-600 dark:bg-deep-900" 
                            />
                            <div className="flex items-center gap-3">
                               <div className={`h-8 w-8 rounded-full flex justify-center items-center text-xs font-bold ${split.included ? 'bg-gradient-to-br from-mint-500 to-mint-600 text-white shadow-lg shadow-mint-500/30' : 'bg-gray-200 text-gray-500 dark:bg-white/10'}`}>
                                 {participant?.name.charAt(0).toUpperCase()}
                               </div>
                               <span className={`text-base font-bold truncate ${split.included ? 'text-deep-900 dark:text-white' : 'text-gray-500 line-through dark:text-gray-400'}`}>{participant?.name}</span>
                            </div>
                          </label>
                          
                          {splitType === 'percentages' && split.included && (
                            <div className="relative w-28">
                              <input type="number" step="0.1" min="0" max="100" value={split.percentage} onChange={e => handleSplitChange(split.participant_id, 'percentage', e.target.value)}
                                className="w-full rounded-xl border border-gray-200 pr-8 pl-4 py-2.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white text-right outline-none"
                              />
                              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                <span className="text-gray-400 font-bold text-sm">%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 sm:px-8 sm:py-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-deep-900/50 flex flex-col-reverse sm:flex-row justify-end gap-4 shrink-0">
               <button type="button" onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-4 sm:py-3 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl shadow-sm transition-colors dark:bg-deep-800 dark:text-gray-300 dark:border-white/10 dark:hover:bg-deep-900">
                Cancelar
              </button>
              <button type="submit" form="expense-form" disabled={submitting} className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-4 sm:py-3 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-2xl disabled:opacity-50 shadow-lg shadow-mint-500/30 transition-all active:scale-95">
                {submitting ? 'Guardando...' : (editingId ? 'Actualizar Gasto' : 'Registrar Gasto')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
