import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { AppProvider } from './lib/AppContext'
import LoginPage from './pages/LoginPage'
import AdminRouter from './pages/admin/AdminRouter'
import TeacherAccessPage from './pages/teacher/TeacherAccessPage'

export default function App() {
  const [session, setSession] = useState(undefined)
  const token = new URLSearchParams(window.location.search).get('token')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // Vue enseignant : accès par lien magique, sans compte.
  if (token) return <TeacherAccessPage token={token} />

  if (session === undefined) return null
  if (!session) return <LoginPage />

  return (
    <AppProvider>
      <AdminRouter session={session} />
    </AppProvider>
  )
}
