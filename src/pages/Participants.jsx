import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Check, AlertCircle, Users, Activity } from 'lucide-react'
import { calculateBalances } from '../utils/balances'
import { formatCOP } from '../utils/format'

export default function Participants() {
  const { user } = useAuth()
  
  const [data, setData] = useState({ participants: [], balancesMap: {} })
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const fetchEverything = async () => {
    try {
      setLoading(true)
      
      const [pRes, eRes, sRes, setRes] = await Promise.all([
        supabase.from('participants').select('*').order('created_at', { ascending: true }),
        supabase.from('expenses').select('*'),
        supabase.from('expense_splits').select('*'),
        supabase.from('settlements').select('*')
      ])

      const participants = pRes.data || []
      const { balancesMap } = calculateBalances(participants, eRes.data || [], sRes.data || [], setRes.data || [])
      
      setData({ participants, balancesMap })

    } catch (err) {
      setError('Error al cargar datos de participantes y finanzas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEverything() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    try {
      const { data: inserted, error } = await supabase.from('participants').insert([{ name: newName.trim(), user_id: user.id }]).select()
      if (error) throw error
      
      const newPart = inserted[0]
      const newBalancesMap = { ...data.balancesMap, [newPart.id]: { id: newPart.id, name: newPart.name, paid_expenses: 0, owed_expenses: 0, paid_settlements: 0, received_settlements: 0, net_balance: 0 } }
      
      setData({ participants: [...data.participants, newPart], balancesMap: newBalancesMap })
      setNewName('')
      setIsAdding(false)
    } catch (err) { setError('Error al agregar participante.') }
  }

  const handleEdit = async (id) => {
    if (!editName.trim()) return
    try {
      const { error } = await supabase.from('participants').update({ name: editName.trim() }).eq('id', id)
      if (error) throw error
      
      const updatedParticipants = data.participants.map(p => p.id === id ? { ...p, name: editName.trim() } : p)
      setData({ ...data, participants: updatedParticipants })
      setEditingId(null)
    } catch (err) { setError('Error al actualizar participante.') }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este participante? Si ha creado gastos o deudas esto puede romper el equilibrio general.')) return
    try {
      const { error } = await supabase.from('participants').delete().eq('id', id)
      if (error) throw error
      setData({ ...data, participants: data.participants.filter(p => p.id !== id) })
    } catch (err) { setError('Error al eliminar participante.') }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">Participantes y Balances</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Añade personas y revisa su estado de cuenta histórico de manera individual.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:shadow-mint-500/50 hover:scale-105 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Nuevo Integrante
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 shadow-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      <div className="glass-panel rounded-3xl overflow-hidden mb-10">
        {isAdding && (
          <form onSubmit={handleAdd} className="p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-deep-900/30 flex flex-col sm:flex-row gap-4 items-center animate-in slide-in-from-top-4">
            <input
              type="text"
              autoFocus
              className="flex-1 w-full rounded-2xl border border-gray-200 px-5 py-3.5 text-sm font-medium focus:ring-mint-500 focus:border-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none transition"
              placeholder="Nombre del participante..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="submit" className="flex-1 sm:flex-none flex justify-center items-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-5 py-3.5 text-sm font-bold text-white shadow-md hover:scale-105 transition active:scale-95">
                <Check className="h-4 w-4" /> Guardar
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="flex-1 sm:flex-none flex justify-center items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 transition dark:bg-deep-800 dark:border-white/10 dark:text-gray-300 dark:hover:bg-deep-900 active:scale-95">
                <X className="h-4 w-4" /> Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-mint-600 dark:text-mint-400">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold text-sm">Cargando métricas...</span>
          </div>
        ) : data.participants.length === 0 && !isAdding ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <div className="bg-mint-500/10 text-mint-600 dark:bg-mint-500/20 dark:text-mint-400 h-20 w-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-mint-500/20">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white tracking-tight">Ningún participante</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">No has agregado a nadie. Añade participantes para empezar a dividir los gastos de tu grupo.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-deep-900/50">
            {data.participants.map((person) => {
              const balances = data.balancesMap[person.id] || { paid_expenses: 0, owed_expenses: 0, net_balance: 0 }
              return (
              <li key={person.id} className="p-6 sm:px-8 hover:bg-gray-50/50 dark:hover:bg-white/[0.03] transition-colors group">
                {editingId === person.id ? (
                  <div className="flex flex-1 flex-col sm:flex-row gap-3 items-center border-l-4 pl-4 border-mint-500 rounded-l-md">
                    <input
                      type="text"
                      autoFocus
                      className="flex-1 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold focus:ring-mint-500 focus:border-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleEdit(person.id)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-white bg-mint-600 hover:bg-mint-500 rounded-xl shadow-sm transition">
                        <Check className="h-4 w-4" /> Ok
                      </button>
                      <button onClick={() => setEditingId(null)} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl shadow-sm dark:bg-deep-800 dark:border-white/10 dark:text-gray-300 dark:hover:bg-deep-900 transition">
                        <X className="h-4 w-4" /> Cerrar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                    
                    {/* Person Info */}
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 flex shrink-0 xl:shrink items-center justify-center rounded-2xl bg-gradient-to-br from-mint-500/20 to-mint-600/10 text-mint-600 dark:text-mint-400 font-extrabold text-xl shadow-inner ring-1 ring-mint-500/30">
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-deep-900 dark:text-white text-lg tracking-tight">{person.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <button 
                            onClick={() => {
                              setEditingId(person.id)
                              setEditName(person.name)
                            }} 
                            className="text-xs font-bold text-mint-600 hover:underline dark:text-mint-400"
                          >
                            Editar nombre
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Summaries */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 flex-1 xl:justify-end xl:pr-10">
                       <div className="flex flex-col bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 dark:bg-white/5 dark:border-white/5 min-w-[140px]">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Total Gastado</span>
                         <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{formatCOP(balances.paid_expenses)}</span>
                       </div>
                       <div className="flex flex-col bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 dark:bg-white/5 dark:border-white/5 min-w-[140px]">
                         <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Debería pagar</span>
                         <span className="text-[15px] font-bold text-gray-800 dark:text-gray-200">{formatCOP(balances.owed_expenses)}</span>
                       </div>
                       
                       {/* Balance Badge */}
                       <div className={`flex flex-col items-end px-5 py-2.5 rounded-2xl border min-w-[160px] ${
                          balances.net_balance > 0.01 
                           ? 'bg-mint-50 border-mint-200 dark:bg-mint-500/10 dark:border-mint-500/20' 
                           : balances.net_balance < -0.01 
                             ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20'
                             : 'bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/5'
                       }`}>
                         <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                            balances.net_balance > 0.01 ? 'text-mint-600 dark:text-mint-400' : balances.net_balance < -0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'
                         }`}>
                           {balances.net_balance > 0.01 ? 'Balance a Favor' : balances.net_balance < -0.01 ? 'Debe al grupo' : 'Empatado'}
                         </span>
                         <span className={`text-lg font-black tracking-tight ${
                            balances.net_balance > 0.01 ? 'text-mint-600 dark:text-mint-400' : balances.net_balance < -0.01 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400'
                         }`}>
                           {balances.net_balance > 0.01 ? '+' : ''}{formatCOP(balances.net_balance)}
                         </span>
                       </div>
                    </div>

                    <div className="flex items-center shrink-0">
                      <button 
                        onClick={() => handleDelete(person.id)} 
                        className="p-3 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-transparent rounded-xl transition-all shadow-sm dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white"
                        title="Eliminar del sistema"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>

                  </div>
                )}
              </li>
            )})}
          </ul>
        )}
      </div>
    </div>
  )
}
