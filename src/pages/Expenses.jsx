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
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [filterCategory, setFilterCategory] = useState('all')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [categoryId, setCategoryId] = useState('')
  const [payerId, setPayerId] = useState('')
  const [splitType, setSplitType] = useState('equal') 
  const [isDebtPayment, setIsDebtPayment] = useState(false)
  const [selectedDebtId, setSelectedDebtId] = useState('')
  
  const [splits, setSplits] = useState([])

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (participants.length > 0) {
      fetchExpenses()
    }
  }, [filterMonth, filterCategory, participants])

  const fetchInitialData = async () => {
    try {
      const [catRes, partRes, debtRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('participants').select('*').order('name'),
        supabase.from('debts').select('*').eq('status', 'active').order('name')
      ])
      
      if (catRes.error) throw catRes.error
      if (partRes.error) throw partRes.error
      if (debtRes.error) throw debtRes.error
      
      setCategories(catRes.data || [])
      setParticipants(partRes.data || [])
      setDebtsList(debtRes.data || [])
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

      if (filterMonth) {
        const startDate = `${filterMonth}-01`
        const [year, month] = filterMonth.split('-')
        const endDateDate = new Date(year, month, 0)
        const endDate = `${filterMonth}-${endDateDate.getDate().toString().padStart(2, '0')}`
        query = query.gte('date', startDate).lte('date', endDate)
      }

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
      setAmount(expense.amount.toString())
      setDescription(expense.description)
      setDate(expense.date)
      setCategoryId(expense.category_id || '')
      setPayerId(expense.payer_id)
      setSplitType(expense.split_type)
      setIsDebtPayment(!!expense.debt_id)
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
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().slice(0, 10))
      setCategoryId(categories.length > 0 ? categories[0].id : '')
      setPayerId(participants.length > 0 ? participants[0].id : '')
      setSplitType('equal')
      setIsDebtPayment(false)
      setSelectedDebtId('')
      
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
      if (isDebtPayment && !finalCategoryId) {
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
        debt_id: isDebtPayment && selectedDebtId ? selectedDebtId : null
      }

      if (editingId) {
        const { error: expError } = await supabase.from('expenses').update(expenseData).eq('id', editingId)
        if (expError) throw expError

        const { error: delError } = await supabase.from('expense_splits').delete().eq('expense_id', editingId)
        if (delError) throw delError

        const { error: insError } = await supabase.from('expense_splits').insert(preparedSplits.map(s => ({ ...s, expense_id: editingId })))
        if (insError) throw insError

      } else {
        const { data: expRes, error: expError } = await supabase.from('expenses').insert([expenseData]).select()
        if (expError) throw expError

        const newExpId = expRes[0].id
        const { error: insError } = await supabase.from('expense_splits').insert(preparedSplits.map(s => ({ ...s, expense_id: newExpId })))
        if (insError) throw insError
        
        // Auto-incrementar deuda solo al crear si fue vinculada
        if (isDebtPayment && selectedDebtId) {
          const debt = debtsList.find(d => d.id === selectedDebtId)
          if (debt && debt.paid_installments < debt.total_installments) {
            const newPaid = debt.paid_installments + 1
            const isPaidOff = newPaid === debt.total_installments
            const newRemaining = isPaidOff ? 0 : Math.max(0, debt.remaining_amount - debt.installment_amount)
            await supabase.from('debts').update({
              paid_installments: newPaid,
              remaining_amount: newRemaining,
              status: isPaidOff ? 'paid' : 'active'
            }).eq('id', debt.id)
            
            // Recargar catálogo silenciosamente
            supabase.from('debts').select('*').eq('status', 'active').then(r => r.data && setDebtsList(r.data))
          }
        }
      }

      setShowForm(false)
      fetchExpenses()
    } catch (err) {
      setError(err.message || 'Error al guardar gasto.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este gasto de forma permanente?')) return
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
      setExpenses(expenses.filter(e => e.id !== id))
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
      <div className="mb-8 glass-panel p-6 rounded-3xl flex flex-col sm:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 dark:text-gray-400">Mes a consultar</label>
          <input 
            type="month" 
            className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-sm dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 dark:text-gray-400">Categoría</label>
          <select 
            className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-sm dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <button onClick={() => handleDelete(expense.id)} className="p-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all dark:hover:text-rose-400 dark:hover:bg-white/5" title="Eliminar">
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
                      <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
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
                <div className="bg-gray-50 dark:bg-deep-950 p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isDebtPayment} 
                      onChange={e => setIsDebtPayment(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300 text-mint-600 focus:ring-mint-500 dark:border-white/20 dark:bg-deep-900 shadow-inner"
                    />
                    <span className="text-sm font-bold text-deep-900 dark:text-white">Este gasto es el pago de una deuda</span>
                  </label>
                  
                  {isDebtPayment && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                       <select 
                         required 
                         value={selectedDebtId} 
                         onChange={e => setSelectedDebtId(e.target.value)}
                         className="w-full rounded-xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-900 dark:border-white/10 dark:text-white transition outline-none"
                       >
                         <option value="" disabled>Seleccione una deuda activa...</option>
                         {debtsList.map(d => (
                            <option key={d.id} value={d.id}>{d.name} - Cuota de {formatCOP(d.installment_amount)}</option>
                         ))}
                       </select>
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
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
