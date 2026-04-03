import { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, X, Check, AlertCircle, ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag, Briefcase, Calendar, Laptop, RefreshCw, ShoppingBag } from 'lucide-react'

const ICON_OPTIONS = {
  ShoppingCart, Utensils, Car, Home, Coffee, Tv, Heart, Zap, Tag,
  Briefcase, Calendar, Laptop, RefreshCw, ShoppingBag, Plus
}

const COLOR_OPTIONS = [
  'bg-rose-500', 'bg-blue-500', 'bg-mint-500', 'bg-yellow-500', 
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-gray-500'
]

export default function Categories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('gasto')
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('Tag')
  const [color, setColor] = useState('bg-mint-500')
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true })
      
      if (error) throw error

      const incomes = data?.filter(c => c.type === 'ingreso') || []
      if (incomes.length === 0) {
        const defaults = [
          { name: 'Salario', icon: 'Briefcase', color: 'bg-mint-500', type: 'ingreso', user_id: user.id },
          { name: 'Quincena', icon: 'Calendar', color: 'bg-blue-500', type: 'ingreso', user_id: user.id },
          { name: 'Freelance', icon: 'Laptop', color: 'bg-purple-500', type: 'ingreso', user_id: user.id },
          { name: 'Arriendo', icon: 'Home', color: 'bg-orange-500', type: 'ingreso', user_id: user.id },
          { name: 'Transferencia', icon: 'RefreshCw', color: 'bg-indigo-500', type: 'ingreso', user_id: user.id },
          { name: 'Venta', icon: 'ShoppingBag', color: 'bg-pink-500', type: 'ingreso', user_id: user.id },
          { name: 'Otro', icon: 'Plus', color: 'bg-gray-500', type: 'ingreso', user_id: user.id }
        ]
        const { data: newIncomes, error: insertError } = await supabase
          .from('categories')
          .insert(defaults)
          .select()
          
        if (!insertError && newIncomes) {
          setCategories([...data, ...newIncomes])
          return
        }
      }

      setCategories(data || [])
    } catch (err) {
      setError('Error al cargar categorías.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setIcon('Tag')
    setColor('bg-mint-500')
    setIsAdding(false)
    setEditingId(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('categories')
          .update({ name: name.trim(), icon, color })
          .eq('id', editingId)
        
        if (error) throw error
        setCategories(categories.map(c => c.id === editingId ? { ...c, name: name.trim(), icon, color } : c))
      } else {
        const { data, error } = await supabase
          .from('categories')
          .insert([{ name: name.trim(), icon, color, user_id: user.id, type: activeTab }])
          .select()
        
        if (error) throw error
        setCategories([...categories, data[0]])
      }
      resetForm()
    } catch (err) {
      setError('Error al guardar categoría.')
    }
  }

  const startEdit = (cat) => {
    setName(cat.name)
    setIcon(cat.icon)
    setColor(cat.color)
    setEditingId(cat.id)
    setIsAdding(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setCategories(categories.filter(c => c.id !== id))
    } catch (err) {
      setError('Error al eliminar categoría.')
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-deep-900 dark:text-white tracking-tight">Categorías</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Personaliza cómo clasificas tus movimientos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-mint-500 to-mint-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-mint-500/30 hover:shadow-mint-500/50 hover:scale-105 transition-all active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-gray-50 dark:bg-black/20 p-1.5 rounded-2xl border border-gray-100 dark:border-white/5 mb-8 w-full max-w-md mx-auto sm:mx-0">
        <button
          onClick={() => { setActiveTab('gasto'); setIsAdding(false); }}
          className={`flex-1 py-2 font-bold text-sm sm:text-base rounded-xl transition ${activeTab === 'gasto' ? 'bg-white text-mint-600 shadow-sm dark:bg-deep-800 dark:text-mint-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
        >
          Gastos
        </button>
        <button
          onClick={() => { setActiveTab('ingreso'); setIsAdding(false); }}
          className={`flex-1 py-2 font-bold text-sm sm:text-base rounded-xl transition ${activeTab === 'ingreso' ? 'bg-white text-mint-600 shadow-sm dark:bg-deep-800 dark:text-mint-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'}`}
        >
          Ingresos
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-400 shadow-sm animate-in fade-in">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {isAdding && (
         <div className="mb-10 glass-panel p-8 animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden rounded-3xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-mint-500/5 rounded-full blur-3xl pointer-events-none" />
          <h3 className="text-xl font-extrabold mb-8 text-deep-900 dark:text-white flex items-center gap-3 relative z-10">
            {editingId ? <Edit2 className="h-6 w-6 text-mint-500" /> : <Plus className="h-6 w-6 text-mint-500" />}
            {editingId ? 'Editar Categoría' : 'Crear Nueva Categoría'}
          </h3>
          
          <form onSubmit={handleSave} className="space-y-8 relative z-10">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Nombre de la Categoría</label>
              <input
                type="text"
                autoFocus
                required
                className="w-full rounded-2xl border border-gray-200 px-5 py-4 text-sm font-medium focus:border-mint-500 focus:ring-mint-500 shadow-inner dark:bg-deep-950 dark:border-white/10 dark:text-white transition outline-none"
                placeholder="Ej. Supermercado, Transporte..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Elige un Ícono</label>
                <div className="flex flex-wrap gap-4">
                  {Object.keys(ICON_OPTIONS).map(iconName => {
                    const IconComp = ICON_OPTIONS[iconName]
                    return (
                      <button
                        type="button"
                        key={iconName}
                        onClick={() => setIcon(iconName)}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          icon === iconName 
                            ? 'border-mint-500 bg-mint-50/50 dark:bg-mint-500/20 text-mint-600 dark:text-mint-400 shadow-md scale-110' 
                            : 'border-transparent bg-gray-50 text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white hover:scale-105'
                        }`}
                      >
                        <IconComp className="h-6 w-6" />
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Elige un Color</label>
                <div className="flex flex-wrap gap-5">
                  {COLOR_OPTIONS.map(colorClass => (
                    <button
                      type="button"
                      key={colorClass}
                      onClick={() => setColor(colorClass)}
                      className={`h-12 w-12 rounded-full shadow-lg ring-offset-4 dark:ring-offset-deep-900 transition-all ${colorClass} ${
                        color === colorClass ? 'ring-4 ring-mint-500 scale-125' : 'hover:scale-110 opacity-80 hover:opacity-100 ring-2 ring-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-end pt-8 border-t border-gray-100 dark:border-white/10 mt-8">
              <button type="button" onClick={resetForm} className="px-6 py-3.5 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl shadow-sm transition-colors dark:bg-deep-800 dark:border-white/10 dark:text-gray-300 dark:hover:bg-deep-900">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-mint-500 to-mint-600 hover:from-mint-600 hover:to-mint-700 rounded-2xl flex items-center gap-2 shadow-lg shadow-mint-500/30 transition-all active:scale-95">
                <Check className="h-5 w-5" /> Guardar Categoría
              </button>
            </div>
          </form>
         </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full p-16 flex flex-col items-center justify-center text-mint-600 dark:text-mint-400">
            <div className="animate-spin h-8 w-8 border-4 border-current border-t-transparent rounded-full mb-4" />
            <span className="font-bold text-sm">Cargando categorías...</span>
          </div>
        ) : categories.filter(c => c.type === activeTab).length === 0 && !isAdding ? (
          <div className="col-span-full p-20 flex flex-col items-center justify-center text-center glass-panel rounded-3xl">
             <div className="bg-mint-500/10 text-mint-600 dark:bg-mint-500/20 dark:text-mint-400 h-20 w-20 rounded-3xl flex items-center justify-center mb-6 shadow-inner ring-1 ring-mint-500/20">
              <Tag className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-extrabold text-deep-900 dark:text-white tracking-tight">Módulo Vacio</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm">No has agregado ninguna categoría para {activeTab}s.</p>
          </div>
        ) : (
          categories.filter(c => c.type === activeTab).map((cat) => {
            const IconComp = ICON_OPTIONS[cat.icon] || Tag
            return (
              <div key={cat.id} className="group relative flex items-center p-5 glass-panel rounded-3xl hover:-translate-y-1 hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-white/5">
                <div className={`flex items-center justify-center rounded-2xl p-4 text-white ${cat.color} mr-5 shadow-lg`}>
                  <IconComp className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="text-base font-bold text-deep-900 dark:text-white truncate tracking-tight">{cat.name}</h3>
                </div>
                
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5 bg-white/90 backdrop-blur-md dark:bg-deep-800/90 rounded-xl p-1.5 shadow-lg border border-gray-200 dark:border-white/10 transition-all">
                   <button onClick={() => startEdit(cat)} className="p-2 text-gray-400 hover:text-mint-600 hover:bg-mint-50 rounded-lg transition-colors dark:hover:text-mint-400 dark:hover:bg-white/5" title="Editar">
                     <Edit2 className="h-4 w-4" />
                   </button>
                   <button onClick={() => handleDelete(cat.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors dark:hover:text-rose-400 dark:hover:bg-white/5" title="Eliminar">
                     <Trash2 className="h-4 w-4" />
                   </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
