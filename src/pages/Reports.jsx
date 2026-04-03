import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { formatCurrency } from '../utils/format'
import { Calendar, PieChart, TrendingUp, Users, Tag, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap } from 'lucide-react'

const ICON_MAP = { ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag }

export default function Reports() {
  const [data, setData] = useState({ expenses: [], participants: [], categories: [] })
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('this_month')
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const [eRes, pRes, cRes] = await Promise.all([
        supabase.from('expenses').select('*'),
        supabase.from('participants').select('*'),
        supabase.from('categories').select('*')
      ])
      setData({ 
        expenses: eRes.data || [], 
        participants: pRes.data || [], 
        categories: cRes.data || [] 
      })
      setLoading(false)
    }
    fetchData()
  }, [])

  // 1. Gráfica mes a mes (últimos 6 meses)
  const last6Months = []
  const d = new Date()
  for (let i = 5; i >= 0; i--) {
     const date = new Date(d.getFullYear(), d.getMonth() - i, 1)
     last6Months.push(date.toISOString().slice(0, 7))
  }

  const monthlyData = last6Months.map(month => {
     const total = data.expenses.filter(e => e.date && e.date.startsWith(month)).reduce((sum, e) => sum + Number(e.amount), 0)
     const dateObj = new Date(month + '-01T00:00:00')
     const monthName = dateObj.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
     return { month, monthName, total }
  })
  const maxMonthValue = Math.max(...monthlyData.map(m => m.total), 1) // prevent div by zero

  // 2. Comparativa entre participantes
  const getFilteredExpenses = () => {
    const now = new Date()
    return data.expenses.filter(e => {
      if (!e.date) return false
      const eDate = new Date(e.date)
      const eYear = eDate.getUTCFullYear()
      const eMonth = eDate.getUTCMonth()
      const nYear = now.getFullYear()
      const nMonth = now.getMonth()

      if (timeFilter === 'this_month') return eYear === nYear && eMonth === nMonth
      if (timeFilter === 'last_3_months') {
        const threeago = new Date()
        threeago.setMonth(nMonth - 2)
        return eDate >= threeago && eDate <= now
      }
      if (timeFilter === 'last_6_months') {
        const sixago = new Date()
        sixago.setMonth(nMonth - 5)
        return eDate >= sixago && eDate <= now
      }
      if (timeFilter === 'this_year') return eYear === nYear
      if (timeFilter === 'custom') {
         if(!customDateRange.start || !customDateRange.end) return true
         const sD = new Date(customDateRange.start)
         const eD = new Date(customDateRange.end)
         eD.setUTCHours(23, 59, 59)
         return eDate >= sD && eDate <= eD
      }
      return true
    })
  }

  const expensesThisMonth = getFilteredExpenses()
  const totalThisMonth = expensesThisMonth.reduce((sum, e) => sum + Number(e.amount), 0)

  const participantTotals = data.participants.map(p => {
     const total = expensesThisMonth.filter(e => e.payer_id === p.id).reduce((sum, e) => sum + Number(e.amount), 0)
     return { ...p, total }
  }).sort((a,b) => b.total - a.total)
  const maxParticipantValue = Math.max(...participantTotals.map(p => p.total), 1)

  // 3. Top 3 Categorías
  const catTotals = {}
  expensesThisMonth.forEach(e => {
     const cid = e.category_id || 'uncategorized'
     catTotals[cid] = (catTotals[cid] || 0) + Number(e.amount)
  })
  const topCategories = Object.keys(catTotals).map(cid => {
     const cat = data.categories.find(c => c.id === cid)
     return {
       id: cid,
       name: cat ? cat.name : 'Varios',
       color: cat ? cat.color.replace('bg-', 'text-').replace('500', '600') : 'text-gray-500',
       bgColor: cat ? cat.color : 'bg-gray-400',
       icon: cat ? cat.icon : 'Tag',
       total: catTotals[cid],
       percentage: totalThisMonth > 0 ? ((catTotals[cid] / totalThisMonth) * 100).toFixed(1) : 0
     }
  }).sort((a,b) => b.total - a.total).slice(0, 3)

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
         <div className="animate-spin h-10 w-10 border-4 border-mint-500 border-t-transparent rounded-full shadow-lg" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">Reportes de Gastos</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Analiza tu inteligencia financiera y los históricos del grupo.
          </p>
        </div>
        
        <div className="w-full xl:w-auto">
           <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 dark:text-gray-400">Filtrar detalles por fecha</label>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* GRÁFICA MES A MES (Global) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 lg:col-span-2">
           <div className="flex items-center gap-3 mb-8">
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-mint-500/20 to-mint-600/10 text-mint-600 dark:text-mint-400 flex items-center justify-center ring-1 ring-mint-500/20">
               <TrendingUp className="h-5 w-5" />
             </div>
             <h2 className="text-xl font-extrabold text-deep-900 dark:text-white">Evolución (Últimos 6 meses)</h2>
           </div>

           <div className="relative pt-6">
              {/* Grids */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-6 z-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-full border-b border-dashed border-gray-200 dark:border-white/5 h-0"></div>
                ))}
              </div>

              {/* Barras */}
              <div className="flex items-end gap-3 sm:gap-6 h-64 mt-2 mb-2 relative z-10 px-2 sm:px-6">
                {monthlyData.map((m, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center justify-end group h-full">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -mt-10 -ml-4 bg-white dark:bg-deep-800 border border-gray-100 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-xl z-20 pointer-events-none">
                      <span className="text-xs font-black text-deep-900 dark:text-white">{formatCurrency(m.total)}</span>
                    </div>
                    <div 
                      className="w-full sm:w-16 bg-gradient-to-t from-mint-600 to-mint-400 rounded-t-xl transition-all duration-1000 ease-out relative overflow-hidden shadow-lg shadow-mint-500/20"
                      style={{ height: `${(m.total / maxMonthValue) * 100}%`, minHeight: m.total > 0 ? '8px' : '2px' }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 mt-4 truncate w-full text-center capitalize">{m.monthName}</span>
                  </div>
                ))}
              </div>
           </div>
        </div>

        {/* COMPARATIVA PARTICIPANTES (Mes seleccionado) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5">
           <div className="flex items-center gap-3 mb-8">
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center ring-1 ring-blue-500/20">
               <Users className="h-5 w-5" />
             </div>
             <h2 className="text-xl font-extrabold text-deep-900 dark:text-white">Aportes del Grupo</h2>
           </div>
           
           {participantTotals.every(p => p.total === 0) ? (
             <div className="py-12 text-center text-gray-500 text-sm font-bold">Nadie ha aportado en este mes.</div>
           ) : (
             <div className="space-y-6 border-l-2 border-gray-100 dark:border-white/5 pl-4 ml-2">
               {participantTotals.map((p, idx) => (
                 <div key={p.id} className="relative">
                   <div className="flex justify-between mb-2">
                     <span className="text-sm font-extrabold text-gray-700 dark:text-gray-300">{p.name} <span className="text-xs text-gray-400 font-medium ml-1">({idx + 1}°)</span></span>
                     <span className="text-sm font-black text-deep-900 dark:text-white">{formatCurrency(p.total)}</span>
                   </div>
                   <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 overflow-hidden shadow-inner">
                      <div 
                        className={`h-3 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${idx === 0 ? 'from-blue-500 to-mint-500' : 'from-blue-400 to-blue-500'}`}
                        style={{ width: `${(p.total / maxParticipantValue) * 100}%` }}
                      ></div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* TOP 3 CATEGORIAS (Mes seleccionado) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5">
           <div className="flex items-center gap-3 mb-8">
             <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center ring-1 ring-purple-500/20">
               <PieChart className="h-5 w-5" />
             </div>
             <h2 className="text-xl font-extrabold text-deep-900 dark:text-white">Top 3 Categorías</h2>
           </div>

           {topCategories.length === 0 ? (
             <div className="py-12 text-center text-gray-500 text-sm font-bold">No hay gastos registrados.</div>
           ) : (
             <div className="space-y-5">
               {topCategories.map((cat, idx) => {
                 const IconComp = ICON_MAP[cat.icon] || Tag
                 return (
                   <div key={cat.id} className="flex items-center p-4 rounded-2xl bg-gray-50 hover:bg-white border border-gray-100 dark:bg-white/5 dark:border-transparent dark:hover:bg-white/10 transition-colors">
                     <div className="mr-5 relative">
                       <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-white ${cat.bgColor} shadow-md`}>
                         <IconComp className="h-5 w-5" />
                       </div>
                       <div className="absolute -top-2 -right-2 h-6 w-6 bg-deep-900 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white dark:border-deep-800 shadow-sm">
                         #{idx + 1}
                       </div>
                     </div>
                     <div className="flex-1 min-w-0">
                       <h3 className="text-sm font-extrabold text-deep-900 dark:text-white truncate">{cat.name}</h3>
                       <p className="text-xs font-bold text-gray-400">{cat.percentage}% de los gastos</p>
                     </div>
                     <div className="text-right pl-4">
                       <span className="text-lg font-black text-deep-900 dark:text-white">{formatCurrency(cat.total)}</span>
                     </div>
                   </div>
                 )
               })}
             </div>
           )}
        </div>

      </div>
    </div>
  )
}
