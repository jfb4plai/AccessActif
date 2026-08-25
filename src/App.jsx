import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { AppProvider } from './lib/AppContext'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import AdminRouter from './pages/admin/AdminRouter'
import TeacherAccessPage from './pages/teacher/TeacherAccessPage'

export default function App() {
  const [session, setSession] = useState(undefined)
  const [recovery, setRecovery] = useState(false)
  const token = new URLSearchParams(window.location.search).get('token')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Vue enseignant : accès par lien magique, sans compte.
  if (token) return <TeacherAccessPage token={token} />

  if (session === undefined) return null

  // Lien "mot de passe oublié" cliqué : le mot de passe doit être changé
  // avant tout accès aux données, même si Supabase ouvre déjà une session.
  if (recovery) return <ResetPasswordPage onDone={() => setRecovery(false)} />

  if (!session) return <LoginPage />

  return (
    <AppProvider>
      <AdminRouter session={session} />
    </AppProvider>
  )
}
