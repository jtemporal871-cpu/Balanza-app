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
  
  const [capitalFormDebt, setCapitalFormDebt] = useState(null)
  const [capitalAmount, setCapitalAmount] = useState('')

  const [form, setForm] = useState({
    name: '',
    total_amount: '',
    interest_rate: '0',
    insurance_amount: '0',
    total_installments: '1',
    paid_installments: '0',
    start_date: new Date().toISOString().slice(0, 10)
  })

  // Motor financiero: Fórmula de amortización
  const calculateInstallment = (principal, months, rate) => {
    if (!principal || !months || Number(months) <= 0) return 0
    const p = Number(principal)
    const n = Number(months)
    const i = Number(rate) / 100

    if (i === 0) return p / n
    const factor = Math.pow(1 + i, n)
    return p * (i * factor) / (factor - 1)
  }

  const baseInstallment = calculateInstallment(form.total_amount, form.total_installments, form.interest_rate)
  const insuranceAmount = Number(form.insurance_amount) || 0
  const generatedInstallment = baseInstallment + insuranceAmount

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
        insurance_amount: (debt.insurance_amount || 0).toString(),
        total_installments: debt.total_installments.toString(),
        paid_installments: debt.paid_installments.toString(),
        start_date: debt.start_date
      })
    } else {
      setEditingId(null)
      setForm({ name: '', total_amount: '', interest_rate: '0', insurance_amount: '0', total_installments: '1', paid_installments: '0', start_date: new Date().toISOString().slice(0, 10) })
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
        insurance_amount: Number(form.insurance_amount || 0),
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

  const payToCapital = async (e) => {
    e.preventDefault()
    if (!capitalFormDebt || !capitalAmount || Number(capitalAmount) <= 0) return
    const debt = capitalFormDebt
    try {
      setSubmitting(true)
      const abono = Number(capitalAmount)
      const newRemaining = Math.max(0, debt.remaining_amount - abono)
      
      const n = debt.total_installments - debt.paid_installments
      const i = Number(debt.interest_rate) / 100
      const ins = Number(debt.insurance_amount || 0)
      let newInstallment = 0
      
      const isPaidOff = newRemaining <= 0

      if (!isPaidOff && n > 0) {
         if (i === 0) {
            newInstallment = (newRemaining / n) + ins
         } else {
            const factor = Math.pow(1 + i, n)
            newInstallment = (newRemaining * (i * factor) / (factor - 1)) + ins
         }
      }

      const { error } = await supabase.from('debts').update({
        remaining_amount: newRemaining,
        installment_amount: newInstallment,
        status: isPaidOff ? 'paid' : 'active'
      }).eq('id', debt.id)

      if (error) throw error
      setCapitalFormDebt(null)
      setCapitalAmount('')
      fetchDebts()
    } catch(err) {
      alert('Error registrando abono a capital')
    } finally {
      setSubmitting(false)
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
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Cuota Total</p>
                    <p className="text-xl font-black text-deep-900 dark:text-white mb-2">{formatCOP(debt.installment_amount)}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-gray-500">
                        <span>Base:</span>
                        <span>{formatCOP(debt.installment_amount - (debt.insurance_amount || 0))}</span>
                      </div>
                      <div className="flex justify-between text-[11px] font-bold text-gray-500">
                        <span>Seguro:</span>
                        <span>{formatCOP(debt.insurance_amount || 0)}</span>
                      </div>
                    </div>
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
                  <div className="border-t border-gray-100 dark:border-white/5 pt-5 flex flex-col sm:flex-row justify-end gap-3">
                    <button onClick={() => setCapitalFormDebt(debt)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 font-bold rounded-xl transition-colors text-sm shadow-sm">
                      <TrendingDown className="h-4 w-4" /> Abonar a Capital
                    </button>
                    <button onClick={() => markInstallmentPaid(debt)} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-mint-50 text-mint-700 hover:bg-mint-100 dark:bg-mint-500/10 dark:text-mint-400 dark:hover:bg-mint-500/20 font-bold rounded-xl transition-colors text-sm shadow-sm">
                      <CheckCircle className="h-4 w-4" /> Pagar Cuota
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* MODAL ABONO A CAPITAL */}
      {capitalFormDebt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-sm bg-white dark:bg-deep-900 rounded-[2rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-300">
             <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                  <TrendingDown className="h-8 w-8" />
                </div>
             </div>
             <h3 className="text-2xl font-extrabold text-center text-deep-900 dark:text-white mb-2 tracking-tight">Abonar a Capital</h3>
             <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6 font-medium">Deuda: {capitalFormDebt.name}</p>

             <form id="capital-form" onSubmit={payToCapital}>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Monto abonado (COP)</label>
               <input type="text" inputMode="numeric" required value={capitalAmount ? new Intl.NumberFormat('es-CO').format(capitalAmount) : ''} onChange={e => setCapitalAmount(e.target.value.replace(/\D/g, ''))}
                 className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-lg font-bold focus:border-blue-500 focus:ring-blue-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none text-center mb-6"
                 placeholder="0" />

               <div className="flex gap-3">
                 <button type="button" onClick={() => { setCapitalFormDebt(null); setCapitalAmount('') }} disabled={submitting} className="flex-1 py-3.5 px-4 font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors dark:bg-deep-800 dark:border-white/10 dark:text-gray-300 dark:hover:bg-deep-950">Cancelar</button>
                 <button type="submit" disabled={submitting} className="flex-1 py-3.5 px-4 font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all">Abonar</button>
               </div>
             </form>
           </div>
        </div>, document.body
      )}

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
                   <div className="col-span-2">
                     <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Seguro Mensual Fijo (COP) (Opcional)</label>
                     <input type="text" inputMode="numeric" value={form.insurance_amount ? new Intl.NumberFormat('es-CO').format(form.insurance_amount) : ''} onChange={e => setForm({...form, insurance_amount: e.target.value.replace(/\D/g, '')})}
                       className="w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-bold focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none" placeholder="Ej: 5000" />
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
                   <p className="text-xs font-bold text-mint-600 dark:text-mint-400 uppercase tracking-widest mb-4 relative z-10">Desglose de Cuota Mensual</p>
                   <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400 relative z-10 mb-1">
                     <span>Cuota Base:</span>
                     <span>{formatCOP(baseInstallment)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm font-bold text-gray-600 dark:text-gray-400 relative z-10 mb-5">
                     <span>Seguro:</span>
                     <span>{formatCOP(insuranceAmount)}</span>
                   </div>
                   <div className="flex justify-between items-center pt-4 border-t border-mint-200 dark:border-white/10 relative z-10">
                     <span className="text-sm font-black text-mint-700 dark:text-mint-400 uppercase tracking-widest">Total:</span>
                     <span className="text-3xl font-black text-deep-900 dark:text-white tracking-tight">{formatCOP(generatedInstallment)}</span>
                   </div>
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
