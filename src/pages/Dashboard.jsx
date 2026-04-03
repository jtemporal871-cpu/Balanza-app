import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Wallet, TrendingDown, Users, Activity, Check, Calendar, ArrowRight, Tag, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, X, AlertCircle, ArrowUpCircle, Landmark } from 'lucide-react'
import { formatCOP } from '../utils/format'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

const ICON_MAP = { ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag }

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const rawFirstName = user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Usuario'
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
  
  const [data, setData] = useState({ participants: [], expenses: [], expenseSplits: [], settlements: [], categories: [], bankDebts: [], accounts: [], incomes: [] })
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('this_month')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [pRes, eRes, sRes, setRes, cRes, dRes, aRes, iRes] = await Promise.all([
        supabase.from('participants').select('*'),
        supabase.from('expenses').select('*, participants(name), categories(name, icon, color)'),
        supabase.from('expense_splits').select('*'),
        supabase.from('settlements').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('debts').select('*').eq('status', 'active'),
        supabase.from('accounts').select('*').eq('is_active', true).order('name'),
        supabase.from('incomes').select('*')
      ])
      
      setData({
         participants: pRes.data || [],
         expenses: eRes.data || [],
         expenseSplits: sRes.data || [],
         settlements: setRes.data || [],
         categories: cRes.data || [],
         bankDebts: dRes.data || [],
         accounts: aRes.data || [],
         incomes: iRes.data || []
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

  const totalParticipants = data.participants.length

  // ================= DEUDAS BANCARIAS/PERSONALES =================
  const activeBankDebts = data.bankDebts || []
  const totalBankDebtsAmount = activeBankDebts.reduce((sum, d) => sum + d.remaining_amount, 0)
  const nextDebtToPay = activeBankDebts.length > 0 ? activeBankDebts.sort((a,b) => b.installment_amount - a.installment_amount)[0] : null
  
  let approxNextDateStr = ''
  if (nextDebtToPay) {
    const d = new Date(nextDebtToPay.start_date)
    d.setMonth(d.getMonth() + nextDebtToPay.paid_installments + 1)
    approxNextDateStr = d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // ================= GASTOS FILTRADOS (NUEVO BLOQUE MIS GASTOS) =================
  const getFilteredExpenses = () => {
    const now = new Date()
    return data.expenses.filter(e => {
      if (!e.date) return false
      const eDate = new Date(e.date)
      // Ajuste de zona horaria simple
      const eYear = eDate.getUTCFullYear()
      const eMonth = eDate.getUTCMonth()
      const nYear = now.getFullYear()
      const nMonth = now.getMonth()

      if (timeFilter === 'this_month') return eYear === nYear && eMonth === nMonth
      if (timeFilter === 'last_3_months') {
        const threeago = new Date()
        threeago.setMonth(nMonth - 3)
        return eDate >= threeago && eDate <= now
      }
      if (timeFilter === 'last_6_months') {
        const sixago = new Date()
        sixago.setMonth(nMonth - 6)
        return eDate >= sixago && eDate <= now
      }
      if (timeFilter === 'this_year') return eYear === nYear
      return true
    })
  }

  const filteredExpenses = getFilteredExpenses()
  const filteredTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const filteredCatTotals = {}
  filteredExpenses.forEach(e => {
    const cid = e.category_id || 'uncategorized'
    filteredCatTotals[cid] = (filteredCatTotals[cid] || 0) + Number(e.amount)
  })

  const filteredCatChart = Object.keys(filteredCatTotals).map(cid => {
    const cat = data.categories.find(c => c.id === cid)
    return {
      id: cid,
      name: cat ? cat.name : 'Varios',
      color: cat ? cat.color.replace('bg-', 'text-').replace('500', '500') : 'text-gray-500',
      bgColor: cat ? cat.color : 'bg-gray-400',
      icon: cat ? cat.icon : 'Tag',
      total: filteredCatTotals[cid],
      percentage: filteredTotal > 0 ? ((filteredCatTotals[cid] / filteredTotal) * 100).toFixed(1) : 0
    }
  }).sort((a,b) => b.total - a.total)

  // ================= ÚLTIMOS GASTOS =================
  const lastExpenses = [...data.expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)

  const totalBalance = data.accounts.reduce((sum, a) => sum + Number(a.balance), 0)
  const incomesThisMonth = data.incomes.filter(i => i.date && i.date.startsWith(currentMonth))
  const totalIncomesMes = incomesThisMonth.reduce((sum, i) => sum + Number(i.amount), 0)

  const metrics = [
    { title: 'Saldo a Favor', value: formatCOP(totalBalance), icon: Wallet, color: 'from-blue-500 to-blue-600', href: '/accounts' },
    { title: 'Ingresos del Mes', value: formatCOP(totalIncomesMes), icon: ArrowUpCircle, color: 'from-mint-500 to-mint-600', href: '/incomes' },
    { title: 'Gastos del Mes', value: formatCOP(totalMes), icon: TrendingDown, color: 'from-rose-500 to-rose-600', href: '/expenses' },
    { title: 'Deudas Activas', value: formatCOP(totalBankDebtsAmount), icon: Landmark, color: 'from-purple-500 to-purple-600', href: '/debts' }
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
             <div 
               key={i} 
               onClick={() => m.href && navigate(m.href)}
               className={`glass-panel p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${m.href ? 'cursor-pointer shadow-sm hover:shadow-mint-500/20' : ''}`}
             >
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
          
          {/* BLOQUE MIS GASTOS */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
               <h2 className="text-xl sm:text-2xl font-extrabold text-deep-900 dark:text-white flex items-center gap-3">
                 <TrendingDown className="h-6 w-6 text-mint-500" /> Mis Gastos
               </h2>
               <div className="flex flex-wrap gap-2 bg-gray-50 dark:bg-black/20 p-1.5 rounded-xl border border-gray-100 dark:border-white/5">
                 {[
                   { id: 'this_month', label: 'Este mes' },
                   { id: 'last_3_months', label: 'Últimos 3 meses' },
                   { id: 'last_6_months', label: 'Últimos 6 meses' },
                   { id: 'this_year', label: 'Este año' }
                 ].map(f => (
                   <button
                     key={f.id}
                     onClick={() => setTimeFilter(f.id)}
                     className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${timeFilter === f.id ? 'bg-white text-mint-600 shadow-sm border border-gray-200 dark:bg-deep-800 dark:text-mint-400 dark:border-white/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
                   >
                     {f.label}
                   </button>
                 ))}
               </div>
             </div>

             <div className="bg-gray-50 dark:bg-deep-950 p-6 rounded-2xl border border-gray-100 dark:border-white/5 mb-8">
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Gastado</p>
               <p className="text-3xl sm:text-4xl font-black text-rose-500 tracking-tight">{formatCOP(filteredTotal)}</p>
             </div>

             {filteredCatChart.length === 0 ? (
               <div className="text-center py-10 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                 <p className="text-sm font-bold text-gray-500">No hay gastos registrados en este período</p>
               </div>
             ) : (
               <div className="space-y-6">
                 {filteredCatChart.map(cat => {
                   const IconComp = ICON_MAP[cat.icon] || Tag
                   return (
                     <div key={cat.id} className="group">
                       <div className="flex items-center gap-4 mb-2">
                         <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center text-white ${cat.bgColor} shadow-md shrink-0`}>
                           <IconComp className="h-5 w-5" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center mb-1">
                             <span className="font-bold text-sm sm:text-base text-deep-900 dark:text-white truncate pr-2">{cat.name}</span>
                             <span className="font-extrabold text-sm sm:text-base text-deep-900 dark:text-white shrink-0">{formatCOP(cat.total)}</span>
                           </div>
                           <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner">
                             <div 
                               className={`${cat.bgColor} h-full rounded-full transition-all duration-1000 ease-out`} 
                               style={{ width: `${cat.percentage}%` }}
                             ></div>
                           </div>
                         </div>
                         <div className="w-12 text-right shrink-0">
                           <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{cat.percentage}%</span>
                         </div>
                       </div>
                     </div>
                   )
                 })}
               </div>
             )}
          </div>

          {/* INGRESOS VS GASTOS (MES) */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xl font-extrabold text-deep-900 dark:text-white flex items-center gap-2">
                 <Activity className="h-6 w-6 text-mint-500" /> Flujo del Mes Actual
               </h3>
             </div>
             
             <div className="space-y-6">
               <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-sm text-gray-600 dark:text-gray-300">Ingresos</span>
                    <span className="font-black text-mint-600">{formatCOP(totalIncomesMes)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-4 overflow-hidden shadow-inner">
                    <div className="bg-mint-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalIncomesMes / ((totalIncomesMes + totalMes) || 1)) * 100)}%` }} />
                  </div>
               </div>
               
               <div>
                  <div className="flex justify-between mb-2">
                    <span className="font-bold text-sm text-gray-600 dark:text-gray-300">Gastos</span>
                    <span className="font-black text-rose-500">{formatCOP(totalMes)}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-4 overflow-hidden shadow-inner">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (totalMes / ((totalIncomesMes + totalMes) || 1)) * 100)}%` }} />
                  </div>
               </div>

               <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex justify-between items-center">
                 <span className="text-sm font-bold uppercase tracking-widest text-gray-500">Balance Neto Mensual</span>
                 <span className={`text-2xl font-black ${totalIncomesMes - totalMes >= 0 ? 'text-mint-600' : 'text-rose-500'}`}>
                   {totalIncomesMes - totalMes >= 0 ? '+' : ''}{formatCOP(totalIncomesMes - totalMes)}
                 </span>
               </div>
             </div>
          </div>

          {/* MIS DEUDAS BANCARIAS */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 relative overflow-hidden">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-extrabold text-deep-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-mint-500" /> Mis Deudas Bancarias
                </h3>
                <button onClick={() => navigate('/debts')} className="text-xs font-bold text-mint-600 hover:text-mint-700 bg-mint-50 hover:bg-mint-100 dark:bg-mint-500/10 dark:text-mint-400 dark:hover:bg-mint-500/20 px-4 py-2 rounded-full transition-colors flex items-center gap-1 shadow-sm">
                  Ver todas <ArrowRight className="h-4 w-4" />
                </button>
             </div>
             
             {activeBankDebts.length === 0 ? (
               <div className="text-center py-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                 <p className="text-sm font-medium text-gray-500">Sin deudas activas 🎉</p>
               </div>
             ) : (
                <div className="space-y-4">
                  {activeBankDebts.map(debt => {
                    const progress = Math.min(100, Math.max(0, (debt.paid_installments / debt.total_installments) * 100))
                    // Calculo de fecha aproximada
                    const date = new Date(debt.start_date)
                    date.setMonth(date.getMonth() + debt.paid_installments + 1)
                    const approxDate = date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })

                    return (
                      <div onClick={() => navigate('/debts')} key={debt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white shadow-sm dark:bg-deep-900/50 rounded-2xl border border-gray-100 dark:border-white/5 group hover:border-mint-300 transition-colors gap-6 sm:gap-4 cursor-pointer">
                         <div className="flex-1 w-full">
                            <h4 className="text-base font-black text-deep-900 dark:text-white truncate flex items-center gap-2">
                               <Wallet className="h-5 w-5 text-mint-500" /> {debt.name} 
                               <span className="bg-mint-500/10 text-mint-600 dark:bg-mint-400/20 dark:text-mint-400 text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ml-2 border border-mint-200 dark:border-mint-800">
                                 {progress.toFixed(0)}%
                               </span>
                            </h4>
                            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2">
                               <span>Cuota: <b>{formatCOP(debt.installment_amount)}</b></span>
                               <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                               <span><Calendar className="h-3 w-3 inline mr-1" />{approxDate}</span>
                            </p>
                         </div>
                         
                         <div className="flex-1 w-full sm:max-w-[200px] shrink-0">
                           <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">
                             <span>Progreso</span>
                             <span>{debt.paid_installments} de {debt.total_installments}</span>
                           </div>
                           <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-2.5 overflow-hidden shadow-inner">
                             <div className="bg-gradient-to-r from-mint-400 to-mint-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                           </div>
                         </div>
                         
                         <div className="text-left sm:text-right w-full sm:w-auto shrink-0 border-t sm:border-t-0 border-gray-100 dark:border-white/5 pt-4 sm:pt-0 mt-2 sm:mt-0">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Saldo Pendiente</p>
                            <p className="text-lg font-black text-rose-500">{formatCOP(debt.remaining_amount)}</p>
                         </div>
                      </div>
                    )
                  })}
                </div>
             )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Últimos gastos */}
        <div className="space-y-8">

           {/* MIS CUENTAS */}
           <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 dark:from-deep-900 dark:to-blue-950/20 dark:border-blue-900/30 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-xl font-extrabold text-deep-900 dark:text-white flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-blue-500" />
                  Cuentas
                </h2>
                <button onClick={() => navigate('/accounts')} className="p-2 -mr-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              
              <div className="space-y-3 relative z-10">
                {data.accounts.length === 0 ? (
                  <p className="text-sm text-gray-500 font-medium text-center py-2">No has creado cuentas.</p>
                ) : (
                  data.accounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center p-3 bg-white/60 dark:bg-black/20 rounded-2xl border border-blue-100 dark:border-white/5 group-hover:border-blue-200 dark:group-hover:border-blue-900/50 transition-colors cursor-pointer" onClick={() => navigate('/accounts')}>
                       <div>
                         <p className="text-sm font-bold text-deep-900 dark:text-white">{acc.name}</p>
                         <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{acc.type}</p>
                       </div>
                       <p className="text-base font-black text-blue-600 dark:text-blue-400">{formatCOP(acc.balance)}</p>
                    </div>
                  ))
                )}
              </div>
           </div>

           {/* TARJETA DE DEUDAS EXTERNAS */}
           <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-100 bg-gradient-to-br from-white to-rose-50 dark:from-deep-900 dark:to-rose-950/20 dark:border-rose-900/30 overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />
              <h2 className="text-xl font-extrabold text-deep-900 dark:text-white mb-6 flex items-center gap-2 relative z-10">
                <Wallet className="h-6 w-6 text-rose-500" />
                Mis Deudas Activas
              </h2>
              
              <div className="space-y-4 relative z-10">
                <div className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-rose-100 dark:border-white/5">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Total Pendiente ({activeBankDebts.length} deudas)</p>
                  <p className="text-3xl font-black text-rose-600 dark:text-rose-500 tracking-tight">{formatCOP(totalBankDebtsAmount)}</p>
                </div>
                
                {nextDebtToPay && (
                  <div className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-rose-100 dark:border-white/5">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Próxima Cuota Urgente</p>
                    <p className="text-lg font-black text-deep-900 dark:text-white">{formatCOP(nextDebtToPay.installment_amount)}</p>
                    <p className="text-sm font-bold text-gray-500 mt-1 truncate">De: {nextDebtToPay.name}</p>
                    <p className="text-xs font-bold text-rose-500 mt-1.5 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Vence: {approxNextDateStr}
                    </p>
                  </div>
                )}
                {activeBankDebts.length === 0 && (
                  <p className="text-sm text-gray-500 font-medium text-center py-2">Libre de deudas externas 🎉</p>
                )}
              </div>
           </div>

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



    </div>
  )
}
