import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import StudentsPage from './StudentsPage'
import TeachersPage from './TeachersPage'
import DashboardPage from './DashboardPage'
import ARDefinitionsPage from './ARDefinitionsPage'

const TABS = [
  { id: 'students', label: 'Élèves' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'dashboard', label: 'Suivi versions' },
  { id: 'ars', label: 'ARs & propositions' },
]

export default function AdminRouter({ session }) {
  const [tab, setTab] = useState('students')

  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e8e4dd', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, height: 50 }}>
        <img src="/plai-logo.jpg" alt="PLAI" style={{ height: 28, marginRight: 8 }} />
        <span style={{ fontWeight: 700, color: '#0a9370', fontSize: 15, marginRight: 16 }}>AccèsActif</span>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? '#0a9370' : 'transparent',
              color: tab === t.id ? '#fff' : '#5a564f',
              border: tab === t.id ? 'none' : '1px solid #d4cfc6',
              borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer'
            }}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: 11, color: '#9a958c', marginRight: 12 }}>{session?.user?.email}</span>
          <button onClick={() => supabase.auth.signOut()}
            style={{ fontSize: 11, color: '#9a958c', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Déconnexion
          </button>
        </div>
      </nav>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'students' && <StudentsPage />}
        {tab === 'teachers' && <TeachersPage />}
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'ars' && <ARDefinitionsPage />}
      </div>
    </div>
  )
}
