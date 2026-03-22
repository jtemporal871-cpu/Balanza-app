import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Home, Users, Tags, Menu, X, LogOut, Receipt, PieChart, Settings } from 'lucide-react'

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { signOut, user } = useAuth()
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Gastos', href: '/expenses', icon: Receipt },
    { name: 'Participantes', href: '/participants', icon: Users },
    { name: 'Categorías', href: '/categories', icon: Tags },
    { name: 'Reportes', href: '/reports', icon: PieChart },
    { name: 'Configuración', href: '/settings', icon: Settings }
  ]

  const firstName = user?.user_metadata?.display_name?.split(' ')[0] || user?.email?.split('@')[0] || ''

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-deep-950 font-sans selection:bg-mint-500 selection:text-white">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-deep-950/80 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-deep-800 text-white shadow-2xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-20 shrink-0 items-center justify-between px-8 border-b border-white/10 bg-deep-900/30">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center shadow-lg shadow-mint-500/30 ring-1 ring-white/20">
               <Receipt className="h-5 w-5 text-white" />
             </div>
             <span className="text-2xl font-extrabold tracking-tight text-white">
               Balanza
             </span>
          </div>
          <button 
            className="lg:hidden p-2 text-white/70 hover:text-white transition-colors rounded-full hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto custom-scrollbar">
          <nav className="flex-1 space-y-2 px-4 py-8">
            <div className="px-4 mb-4 text-xs font-bold text-white/40 uppercase tracking-widest">Navegación</div>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center rounded-2xl px-4 py-3.5 text-[15px] font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-mint-500/20 to-transparent border-l-4 border-mint-500 text-mint-400'
                      : 'text-white/70 hover:bg-white/5 hover:text-white border-l-4 border-transparent'
                  }`}
                >
                  <Icon 
                    className={`mr-4 h-5 w-5 flex-shrink-0 transition-colors duration-300 ${
                      isActive ? 'text-mint-400' : 'text-white/50 group-hover:text-white/90'
                    }`} 
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="p-5 border-t border-white/5 bg-deep-900/40 backdrop-blur-md">
            <div className="flex items-center gap-4 px-2 py-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-mint-500 to-mint-600 text-white font-bold shadow-lg shadow-mint-500/20 ring-2 ring-white/10">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[15px] font-bold text-white truncate">
                  {firstName}
                </span>
                <span className="text-xs text-white/50 font-medium">Conectado</span>
              </div>
              <button
                onClick={signOut}
                title="Cerrar Sesión"
                className="p-2.5 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors shrink-0"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full max-w-full relative z-0">
        {/* Mobile top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-xl px-5 dark:border-white/5 dark:bg-deep-900/80 lg:hidden shadow-sm z-30">
          <div className="flex items-center gap-2.5">
             <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-mint-500 to-mint-600 flex items-center justify-center shadow-md">
               <Receipt className="h-4 w-4 text-white" />
             </div>
             <span className="text-xl font-extrabold text-deep-900 dark:text-white">
               Balanza
             </span>
          </div>
          <button
            type="button"
            className="rounded-xl p-2.5 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-deep-800 transition"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto w-full relative z-0 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  )
}
