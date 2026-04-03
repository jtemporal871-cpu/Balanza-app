import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Fetch silencioso sin bloquear
      if (session?.user) {
        supabase.from('users').select('currency').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.currency && ['COP', 'USD', 'EUR', 'MXN'].includes(data.currency)) {
              localStorage.setItem('balanza_currency', data.currency)
            }
          })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        supabase.from('users').select('currency').eq('id', session.user.id).single()
          .then(({ data }) => {
            if (data?.currency && ['COP', 'USD', 'EUR', 'MXN'].includes(data.currency)) {
              localStorage.setItem('balanza_currency', data.currency)
            }
          })
      }
      
      if (event === 'PASSWORD_RECOVERY') {
         window.location.href = '/update-password'
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signUp = (email, password, displayName) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        }
      }
    })
  }

  const signIn = (email, password) => {
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = () => {
    return supabase.auth.signOut()
  }

  const resetPassword = (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    })
  }

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, resetPassword, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
