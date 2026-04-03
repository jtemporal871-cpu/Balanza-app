import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data } = await supabase.from('users').select('currency').eq('id', session.user.id).single()
        if (data?.currency) localStorage.setItem('balanza_currency', data.currency)
      }
      setLoading(false)
    })

    // Listen for changes on auth state (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const { data } = await supabase.from('users').select('currency').eq('id', session.user.id).single()
        if (data?.currency) localStorage.setItem('balanza_currency', data.currency)
      } else if (!session?.user) {
        localStorage.removeItem('balanza_currency')
      }
      
      setLoading(false)
      
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
