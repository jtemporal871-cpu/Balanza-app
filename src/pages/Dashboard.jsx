import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Wallet, TrendingDown, Users, Activity, Check, Calendar, ArrowRight, Tag, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, X, AlertCircle } from 'lucide-react'
import { formatCOP } from '../utils/format'
import { calculateBalances } from '../utils/balances'
import { createPortal } from 'react-dom'

const ICON_MAP = { ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag }

export default function Dashboard() {
  const { user } = useAuth()
  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0]
  
  const [data, setData] = useState({ participants: [], expenses: [], expenseSplits: [], settlements: [], categories: [] })
  const [loading, setLoading] = useState(true)
  
  const [settlingDebt, setSettlingDebt] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pRes, eRes, sRes, setRes, cRes] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('expenses').select('*, participants(name), categories(name, icon, color)'),
        supabase.from('expense_splits').select('*'),
        supabase.from('settlements').select('*'),
        supabase.from('categories').select('*')
      ])
      
      setData({
         participants: pRes.data || [],
         expenses: eRes.data || [],
         expenseSplits: sRes.data || [],
         settlements: setRes.data || [],
         categories: cRes.data || []
      })
    } catch (err) {
      console.error('Error cargando Dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // ================= METRICAS DEL MES =================
  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  const expensesThisMonth = data.expenses.filter(e => e.date && e.date.startsWith(currentMonth))
  
  const totalMes = expensesThisMonth.reduce((sum, e) => sum + Number(e.amount), 0)
  
  const payerTotals = {}
  expensesThisMonth.forEach(e => {
     payerTotals[e.payer_id] = (payerTotals[e.payer_id] || 0) + Number(e.amount)
  })
  
  let topPayerInfo = { name: 'Ninguno', amount: 0 }
  const topPayerIds = Object.keys(payerTotals).sort((a, b) => payerTotals[b] - payerTotals[a])
  if (topPayerIds.length > 0) {
    const p = data.participants.find(part => part.id === topPayerIds[0])
    if (p) {
      topPayerInfo = { name: p.name, amount: payerTotals[topPayerIds[0]] }
    }
  }

  // ================= DEUDAS Y BALANCES (TODO EL HISTÓRICO) =================
  const { debts } = calculateBalances(data.participants, data.expenses, data.expenseSplits, data.settlements)
  const totalDebts = debts.reduce((sum, d) => sum + d.amount, 0)
  const totalParticipants = data.participants.length

  // ================= CATEGORÍAS DEL MES =================
  const catTotals = {}
  expensesThisMonth.forEach(e => {
    const cid = e.category_id || 'uncategorized'
    catTotals[cid] = (catTotals[cid] || 0) + Number(e.amount)
  })
  
  const catChart = Object.keys(catTotals).map(cid => {
    const cat = data.categories.find(c => c.id === cid)
    return {
      id: cid,
      name: cat ? cat.name : 'Varios',
      color: cat ? cat.color.replace('bg-', 'text-').replace('500', '500') : 'text-gray-500',
      bgColor: cat ? cat.color : 'bg-gray-400',
      icon: cat ? cat.icon : 'Tag',
      total: catTotals[cid],
      percentage: totalMes > 0 ? ((catTotals[cid] / totalMes) * 100).toFixed(1) : 0
    }
  }).sort((a,b) => b.total - a.total)

  // ================= ÚLTIMOS GASTOS =================
  const lastExpenses = [...data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  // ================= SUBMIT LIQUIDACIÓN =================
  const handleSettle = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
       const { error } = await supabase.from('settlements').insert([{
         user_id: user.id,
         payer_id: settlingDebt.from,
         payee_id: settlingDebt.to,
         amount: settlingDebt.amount
       }])
       if (error) throw error
       setSettlingDebt(null)
       fetchData() // Refresh everything
    } catch(err) {
       console.error('Error al sentar liquidación:', err)
       alert('Error al liquidar deuda')
    } finally {
       setSubmitting(false)
    }
  }

  const metrics = [
    { title: 'Gastos de este mes', value: formatCOP(totalMes), icon: TrendingDown, color: 'from-rose-500 to-rose-600' },
    { title: 'Deudas Pendientes', value: formatCOP(totalDebts), icon: Wallet, color: 'from-mint-500 to-mint-600' },
    { title: 'Quien más aportó (mes)', value: topPayerInfo.name, subtitle: formatCOP(topPayerInfo.amount), icon: Activity, color: 'from-blue-500 to-blue-600' },
    { title: 'Participantes', value: totalParticipants.toString(), icon: Users, color: 'from-purple-500 to-purple-600' }
  ]

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
         <div className="animate-spin h-10 w-10 border-4 border-mint-500 border-t-transparent rounded-full shadow-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
      
      <div className="mb-10">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-deep-950 dark:text-white tracking-tight mb-2">
           Hola, {firstName} 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base max-w-3xl">
           Resumen automático de cuentas y deudas del grupo. Mantén todo equilibrado.
        </p>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {metrics.map((m, i) => {
           const Icon = m.icon
           return (
             <div key={i} className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 bg-gradient-to-br ${m.color} blur-2xl group-hover:opacity-40 transition-opacity`} />
                <div className="flex items-start justify-between relative z-10">
                   <div>
                     <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1.5">{m.title}</p>
                     <h3 className="text-2xl font-black text-deep-900 dark:text-white tracking-tight leading-none">{m.value}</h3>
                     {m.subtitle && <p className="text-sm font-semibold text-mint-600 dark:text-mint-400 mt-2">{m.subtitle}</p>}
                   </div>
                   <div className={`h-12 w-12 rounded-2xl flex shrink-0 items-center justify-center bg-gradient-to-br ${m.color} shadow-lg shadow-black/10`}>
                     <Icon className="h-5 w-5 text-white" />
                   </div>
                </div>
             </div>
           )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA: Balances y Categorias */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* DEUDAS / BALANCES */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
            <h2 className="text-xl font-extrabold text-deep-900 dark:text-white mb-6 flex items-center gap-3">
              <ArrowRight className="h-6 w-6 text-mint-500" />
              Liquidación de Deudas
            </h2>
            
            {debts.length === 0 ? (
              <div className="text-center py-10 bg-mint-50 dark:bg-mint-500/5 rounded-2xl border border-mint-100 dark:border-white/5">
                <div className="h-14 w-14 rounded-full bg-mint-100 text-mint-600 flex items-center justify-center mx-auto mb-3 dark:bg-mint-900 dark:text-mint-300">
                  <Check className="h-7 w-7 border-4 border-mint-100 dark:border-mint-900 rounded-full" />
                </div>
                <h3 className="text-lg font-bold text-deep-900 dark:text-white">¡Todos están a paz y salvo!</h3>
                <p className="text-sm text-gray-500 font-medium">No existen deudas pendientes en el grupo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {debts.map((debt, idx) => (
                  <div key={debt.id || idx} className="flex flex-col sm:flex-row items-center justify-between p-5 bg-white shadow-sm dark:bg-deep-900/50 rounded-2xl border border-gray-100 dark:border-white/5 group hover:border-mint-300 transition-colors">
                    <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                      <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                        {debt.fromName.charAt(0)}
                      </div>
                      <div className="flex flex-col items-center sm:items-start flex-1 sm:flex-none">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{debt.fromName}</span>
                        <span className="text-xs font-semibold text-gray-400">Debe pagar</span>
                      </div>
                      <div className="px-3 bg-gray-50 rounded-full border border-gray-100 dark:bg-white/5 dark:border-white/5">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="h-10 w-10 rounded-full bg-mint-100 text-mint-600 flex items-center justify-center font-bold text-sm dark:bg-mint-900/30 dark:text-mint-400 border border-mint-200 dark:border-mint-800">
                        {debt.toName.charAt(0)}
                      </div>
                      <div className="flex flex-col flex-1 sm:flex-none">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{debt.toName}</span>
                        <span className="text-xs font-semibold text-gray-400">Recibe</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center w-full sm:w-auto justify-between sm:justify-end gap-5 pl-14 sm:pl-0">
                      <div className="text-right">
                        <p className="text-xl font-black text-rose-500 tracking-tight">{formatCOP(debt.amount)}</p>
                      </div>
                      <button 
                        onClick={() => setSettlingDebt(debt)}
                        className="px-5 py-2.5 bg-deep-900 hover:bg-deep-800 text-white dark:bg-white dark:text-deep-900 dark:hover:bg-gray-100 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95"
                      >
                        Liquidar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* GRÁFICA DE CATEGORÍAS */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5">
            <h2 className="text-xl font-extrabold text-deep-900 dark:text-white mb-6">Gastos por Categoría (Mes actual)</h2>
            {catChart.length === 0 ? (
              <p className="text-center text-gray-500 py-6 text-sm font-medium">No hay gastos documentados en el mes actual.</p>
            ) : (
              <div className="space-y-5">
                {catChart.map(cat => (
                  <div key={cat.id}>
                    <div className="flex justify-between mb-1.5 text-sm">
                      <span className="font-bold text-gray-700 dark:text-gray-200">{cat.name}</span>
                      <div className="text-right">
                         <span className="font-extrabold text-deep-900 dark:text-white">{formatCOP(cat.total)}</span>
                         <span className="text-gray-400 font-bold ml-2">({cat.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3.5 shadow-inner overflow-hidden">
                      <div 
                        className={`${cat.bgColor} h-3.5 rounded-full transition-all duration-1000 ease-out`} 
                        style={{ width: `${cat.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA DERECHA: Últimos gastos */}
        <div className="space-y-8">
           <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5">
              <h2 className="text-xl font-extrabold text-deep-900 dark:text-white mb-6">Últimos Gastos</h2>
              
              {lastExpenses.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm font-medium">El registro está vacío.</p>
              ) : (
                <div className="space-y-5">
                  {lastExpenses.map(expense => {
                     const catIcon = expense.categories?.icon || 'Tag'
                     const catColor = expense.categories?.color || 'bg-gray-400'
                     const IconComp = ICON_MAP[catIcon] || Tag

                     return (
                       <div key={expense.id} className="flex items-center gap-4">
                         <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-white ${catColor} shadow-md shrink-0`}>
                           <IconComp className="h-5 w-5" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-deep-900 dark:text-white truncate">{expense.description}</p>
                           <p className="text-xs text-gray-500 font-medium truncate">
                             <span className="capitalize">{expense.categories?.name || 'Varios'}</span> • {new Date(expense.date).toLocaleDateString('es-CO')}
                           </p>
                         </div>
                         <div className="text-right shrink-0">
                           <p className="text-sm font-extrabold text-deep-900 dark:text-white">{formatCOP(expense.amount)}</p>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{expense.participants?.name}</p>
                         </div>
                       </div>
                     )
                  })}
                </div>
              )}
           </div>
        </div>

      </div>

      {/* MODAL DE LIQUIDACIÓN DE DEUDA */}
      {settlingDebt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-deep-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white dark:bg-deep-900 rounded-[2rem] shadow-2xl p-8 border border-white/10 animate-in zoom-in-95 duration-300">
             <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-mint-100 dark:bg-mint-900/30 text-mint-600 dark:text-mint-400 rounded-full flex items-center justify-center">
                  <Wallet className="h-8 w-8" />
                </div>
             </div>
             
             <h3 className="text-2xl font-extrabold text-center text-deep-900 dark:text-white mb-2 tracking-tight">Liquidar Saldo</h3>
             <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium">
               Esto equilibrará los balances históricamente y significa que el pago físico ya fue realizado.
             </p>

             <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-5 mb-8 border border-gray-100 dark:border-white/5">
                <p className="text-center text-sm font-bold text-gray-600 dark:text-gray-300 mb-1">
                  <span className="text-rose-500">{settlingDebt.fromName}</span> le está pagando a <span className="text-mint-600 dark:text-mint-400">{settlingDebt.toName}</span>
                </p>
                <p className="text-center text-3xl font-black text-deep-900 dark:text-white mt-3 tracking-tight">
                  {formatCOP(settlingDebt.amount)}
                </p>
             </div>

             <div className="flex gap-3">
               <button 
                 onClick={() => setSettlingDebt(null)}
                 disabled={submitting}
                 className="flex-1 py-3.5 px-4 font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors dark:bg-deep-800 dark:border-white/10 dark:text-gray-300 dark:hover:bg-deep-950"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleSettle}
                 disabled={submitting}
                 className="flex-1 py-3.5 px-4 font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-xl shadow-lg shadow-mint-500/30 transition-all flex justify-center items-center"
               >
                 {submitting ? 'Guardando...' : 'Confirmar Pago'}
               </button>
             </div>
           </div>
        </div>,
        document.body
      )}

    </div>
  )
}
