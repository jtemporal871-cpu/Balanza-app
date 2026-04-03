import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Plus, X, Landmark, AlertCircle, Trash2, Edit2, CheckCircle, TrendingDown, Calendar, CreditCard, PieChart } from 'lucide-react'
import { formatCOP } from '../utils/format'

export default function Debts() {
  const { user } = useAuth()
  const [debts, setDebts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    total_amount: '',
    interest_rate: '0',
    total_installments: '1',
    paid_installments: '0',
    start_date: new Date().toISOString().slice(0, 10)
  })

  // Motor financiero: Fórmula de amortización
  const calculateInstallment = (principal, months, rate) => {
    if (!principal || !months || Number(months) === 0) return 0
    const p = Number(principal)
    const n = Number(months)
    const r = Number(rate) / 100

    if (r === 0) return p / n
    const factor = Math.pow(1 + r, n)
    return p * ((r * factor) / (factor - 1))
  }

  const generatedInstallment = calculateInstallment(form.total_amount, form.total_installments, form.interest_rate)

  useEffect(() => {
    fetchDebts()
  }, [])

  const fetchDebts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      setDebts(data || [])
    } catch (err) {
      console.error(err)
      setError('Error al cargar deudas.')
    } finally {
      setLoading(false)
    }
  }

  const openForm = (debt = null) => {
    setError('')
    if (debt) {
      setEditingId(debt.id)
      setForm({
        name: debt.name,
        total_amount: debt.total_amount.toString(),
        interest_rate: debt.interest_rate.toString(),
        total_installments: debt.total_installments.toString(),
        paid_installments: debt.paid_installments.toString(),
        start_date: debt.start_date
      })
    } else {
      setEditingId(null)
      setForm({ name: '', total_amount: '', interest_rate: '0', total_installments: '1', paid_installments: '0', start_date: new Date().toISOString().slice(0, 10) })
    }
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || Number(form.total_amount) <= 0 || Number(form.total_installments) <= 0) return
    try {
      setSubmitting(true)

      const tInstallments = Number(form.total_installments)
      const pInstallments = Number(form.paid_installments)

      // Recalcular saldo pendiente como la cantidad de cuotas faltantes multiplicadas por el valor de la cuota real.
      // Esto respeta y balancea de forma matemática perfecta los descuentos tras un interés.
      const calculatedRemaining = Math.max(0, (tInstallments - pInstallments) * generatedInstallment)
      const isPaidOff = pInstallments >= tInstallments

      const debtData = {
        user_id: user.id,
        name: form.name.trim(),
        total_amount: Number(form.total_amount),
        remaining_amount: calculatedRemaining,
        interest_rate: Number(form.interest_rate),
        total_installments: tInstallments,
        paid_installments: pInstallments,
        installment_amount: generatedInstallment,
        start_date: form.start_date,
        status: isPaidOff ? 'paid' : 'active'
      }

      if (editingId) {
        const { error } = await supabase.from('debts').update(debtData).eq('id', editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('debts').insert([debtData])
        if (error) throw error
      }
      
      setShowForm(false)
      fetchDebts()
    } catch (err) {
      setError('Error guardando la deuda: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const markInstallmentPaid = async (debt) => {
    if (debt.paid_installments >= debt.total_installments) return
    try {
      const newPaid = debt.paid_installments + 1
      const isPaidOff = newPaid >= debt.total_installments
      const newRemaining = isPaidOff ? 0 : Math.max(0, debt.remaining_amount - debt.installment_amount)
      
      const { error } = await supabase.from('debts').update({
        paid_installments: newPaid,
        remaining_amount: newRemaining,
        status: isPaidOff ? 'paid' : 'active'
      }).eq('id', debt.id)

      if (error) throw error
      fetchDebts()
    } catch(err) {
      alert('Error registrando pago')
    }
  }

  const deleteDebt = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar esta deuda permanentemente? Las vinculaciones de gastos a ella perderán la referencia.')) return
    try {
      const { error } = await supabase.from('debts').delete().eq('id', id)
      if (error) throw error
      fetchDebts()
    } catch (err) { alert('Error al eliminar') }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight flex items-center gap-3">
            <Landmark className="h-8 w-8 text-mint-500" /> Mis Deudas
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-xl">
            Calcula la amortización mediante cuotas fijas y lleva el control riguroso de todo lo que le debes al banco.
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <button
            onClick={() => openForm()}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5" /> Registrar Deuda
          </button>
        </div>
      </div>

      {/* Lista de Deudas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <div className="lg:col-span-2 p-20 flex flex-col items-center justify-center text-mint-600">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold">Cargando...</span>
          </div>
        ) : debts.length === 0 ? (
          <div className="lg:col-span-2 p-24 flex flex-col items-center justify-center text-center glass-panel rounded-3xl">
             <div className="bg-mint-500/10 text-mint-600 dark:bg-mint-500/20 dark:text-mint-400 h-20 w-20 rounded-3xl flex items-center justify-center mb-6">
              <Landmark className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white">Libertad Financiera</h3>
            <p className="mt-2 text-sm text-gray-500">No tienes ninguna deuda registrada actualmente.</p>
          </div>
        ) : (
          debts.map(debt => {
            const isPaid = debt.status === 'paid'
            const progress = Math.min(100, Math.max(0, (debt.paid_installments / debt.total_installments) * 100))
            
            return (
              <div key={debt.id} className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-gray-100 dark:border-white/5 transition-colors hover:border-mint-200">
                {isPaid && (
                  <div className="absolute top-4 right-4 bg-mint-500 text-white text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <CheckCircle className="h-3 w-3" /> Pagada
                  </div>
                )}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-black text-deep-900 dark:text-white tracking-tight pr-12">{debt.name}</h3>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                       <Calendar className="h-4 w-4" /> Inicio: {new Date(debt.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {!isPaid && (
                      <button onClick={() => openForm(debt)} className="p-2 text-gray-300 hover:text-mint-600 hover:bg-mint-50 rounded-xl transition-all dark:text-gray-600 dark:hover:text-mint-400 dark:hover:bg-white/5" title="Editar Deuda">
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                    <button onClick={() => deleteDebt(debt.id)} className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all dark:text-gray-600 dark:hover:text-rose-400 dark:hover:bg-white/5" title="Eliminar Deuda">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-deep-950 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pendiente</p>
                    <p className="text-xl font-black text-rose-500">{formatCOP(debt.remaining_amount)}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-deep-950 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cuota Mensual</p>
                    <p className="text-xl font-black text-deep-900 dark:text-white">{formatCOP(debt.installment_amount)}</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm font-bold text-gray-600 dark:text-gray-300 mb-2">
                    <span>Progreso: {debt.paid_installments} de {debt.total_installments} cuotas</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 shadow-inner overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-mint-400 to-mint-500 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {!isPaid && (
                  <div className="border-t border-gray-100 dark:border-white/5 pt-5 flex justify-end">
                    <button onClick={() => markInstallmentPaid(debt)} className="flex items-center gap-2 px-6 py-2.5 bg-mint-50 text-mint-700 hover:bg-mint-100 dark:bg-mint-500/10 dark:text-mint-400 dark:hover:bg-mint-500/20 font-bold rounded-xl transition-colors text-sm">
                      <CheckCircle className="h-4 w-4" /> Abonar 1 Cuota Directamente
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* FORM MODAL EN PORTAL */}
      {showForm && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-lg bg-white dark:bg-deep-900 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
             
             <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20 shrink-0">
               <h2 className="text-2xl font-black text-deep-900 dark:text-white tracking-tight">
                 {editingId ? 'Modificar Deuda' : 'Nueva Deuda'}
               </h2>
               <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full dark:hover:bg-white/10 dark:hover:text-white transition-all"><X className="h-6 w-6" /></button>
             </div>

             <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
               {error && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 font-bold text-sm dark:bg-red-900/20">{error}</div>}
               
               <form id="debt-form" onSubmit={handleSave} className="space-y-6">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre de la Deuda</label>
                   <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                     className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                     placeholder="Ej. Tarjeta de Crédito, Préstamo Vehículo" />
                 </div>

                 <div className="grid grid-cols-2 gap-5">
                   <div className="col-span-2 sm:col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto Préstamo Inicial</label>
                     <input type="text" inputMode="numeric" required value={form.total_amount ? new Intl.NumberFormat('es-CO').format(form.total_amount) : ''} onChange={e => setForm({...form, total_amount: e.target.value.replace(/\D/g, '')})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none" />
                   </div>
                   <div className="col-span-2 sm:col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Interés Mensual (%)</label>
                     <input type="number" step="0.01" required value={form.interest_rate} onChange={e => setForm({...form, interest_rate: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none" />
                   </div>
                 </div>

                 <div className="grid grid-cols-[1fr_1fr_auto] sm:grid-cols-3 gap-5">
                   <div className="col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Total Cuotas</label>
                     <input type="number" required value={form.total_installments} onChange={e => setForm({...form, total_installments: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none" />
                   </div>
                   <div className="col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Cuotas Pagadas</label>
                     <input type="number" required value={form.paid_installments} onChange={e => setForm({...form, paid_installments: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold text-mint-600 focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-mint-900/10 dark:border-white/10 dark:text-mint-400 transition outline-none" />
                   </div>
                   <div className="col-span-[1fr_1fr_auto] sm:col-span-1">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Fecha Inicio</label>
                     <input type="date" required value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})}
                       className="w-full rounded-2xl border border-gray-200 px-2 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white text-gray-500 transition outline-none" />
                   </div>
                 </div>

                 <div className="bg-mint-50 dark:bg-deep-950 p-5 rounded-2xl border border-mint-100 dark:border-white/5 mt-6 relative overflow-hidden">
                   <p className="text-xs font-bold text-mint-600 dark:text-mint-400 uppercase tracking-widest mb-1 relative z-10">Cuota Mensual Fija Calculada</p>
                   <p className="text-3xl font-black text-deep-900 dark:text-white tracking-tight relative z-10">{formatCOP(generatedInstallment)}</p>
                 </div>
               </form>
             </div>

             <div className="p-6 sm:p-8 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-deep-900/50 flex flex-col-reverse sm:flex-row justify-end gap-3 shrink-0">
               <button onClick={() => setShowForm(false)} className="w-full sm:w-auto px-6 py-4 sm:py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 dark:bg-deep-800 dark:text-gray-300 dark:border-white/10 transition-colors">Cancelar</button>
               <button type="submit" form="debt-form" disabled={submitting} className="w-full sm:w-auto px-8 py-4 sm:py-3 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-xl shadow-lg shadow-mint-500/30 transition-all flex items-center justify-center">
                 {submitting ? 'Guardando...' : (editingId ? 'Actualizar Deuda' : 'Guardar Deuda')}
               </button>
             </div>
           </div>
        </div>, document.body
      )}
    </div>
  )
}
