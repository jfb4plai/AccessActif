import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useApp } from '../../lib/useApp'
import HomePage from './HomePage'
import StudentsPage from './StudentsPage'
import TeachersPage from './TeachersPage'
import ARDefinitionsPage from './ARDefinitionsPage'
import MembersPage from './MembersPage'
import { BASE, SMALL, COLORS, input } from '../../lib/ui'
import { schoolYearOptions } from '../../lib/ui'

const BASE_TABS = [
  { id: 'home', label: 'Accueil' },
  { id: 'students', label: 'Élèves' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'ars', label: 'Aménagements & propositions' },
]

export default function AdminRouter({ session }) {
  const [tab, setTab] = useState('home')
  const [focusTeacherId, setFocusTeacherId] = useState(null)
  const { schools, schoolId, setSchoolId, year, setYear, loading, error, isSuperAdmin } = useApp()
  const TABS = isSuperAdmin ? [...BASE_TABS, { id: 'members', label: 'Membres' }] : BASE_TABS

  if (loading) return <p style={{ padding: 24, fontSize: BASE, color: COLORS.muted }}>Chargement de votre espace…</p>

  if (error || schools.length === 0) return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div role="alert" style={{ maxWidth: 480, textAlign: 'center' }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: COLORS.danger }}>
          {error ? 'Chargement impossible' : 'Aucune école rattachée à votre compte'}
        </p>
        <p style={{ fontSize: BASE, color: COLORS.muted }}>
          {error || 'Contactez le coordinateur du Pôle pour être rattaché·e à une ou plusieurs écoles.'}
        </p>
        <button onClick={() => supabase.auth.signOut()}
          style={{ marginTop: 12, background: 'none', border: 'none', color: COLORS.muted, fontSize: BASE, textDecoration: 'underline', cursor: 'pointer' }}>
          Se déconnecter
        </button>
      </div>
    </div>
  )

  const selectStyle = { ...input, width: 'auto', marginBottom: 0, padding: '6px 10px', fontSize: SMALL }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontSize: BASE }}>
      <header style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <img src="/plai-logo.jpg" alt="" style={{ height: 32 }} />
          <span style={{ fontWeight: 700, color: COLORS.tealText, fontSize: 18 }}>AccèsActif</span>

          {/* Un membre du PLAI peut intervenir dans plusieurs écoles (fondamental). */}
          {schools.length > 1 && (
            <>
              <label htmlFor="school-select" style={{ fontSize: SMALL, color: COLORS.muted }}>École</label>
              <select id="school-select" value={schoolId || ''} onChange={e => setSchoolId(e.target.value)} style={selectStyle}>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          )}
          {schools.length === 1 && (
            <span style={{ fontSize: SMALL, color: COLORS.muted }}>{schools[0].name}</span>
          )}

          <label htmlFor="year-select" style={{ fontSize: SMALL, color: COLORS.muted }}>Année</label>
          <select id="year-select" value={year} onChange={e => setYear(e.target.value)} style={selectStyle}>
            {schoolYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: SMALL, color: COLORS.muted }}>{session?.user?.email}</span>
            <button onClick={() => supabase.auth.signOut()}
              style={{ fontSize: SMALL, color: COLORS.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
              Déconnexion
            </button>
          </div>
        </div>

        <nav aria-label="Sections" style={{ padding: '0 20px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              style={{
                background: tab === t.id ? COLORS.teal : 'transparent',
                color: tab === t.id ? '#fff' : COLORS.muted,
                border: tab === t.id ? 'none' : `1px solid ${COLORS.borderStrong}`,
                borderRadius: 20, padding: '6px 16px', fontSize: SMALL, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
        {tab === 'home' && <HomePage onManageTeacher={id => { setFocusTeacherId(id); setTab('teachers') }} />}
        {tab === 'students' && <StudentsPage onProposeAR={() => setTab('ars')} />}
        {tab === 'teachers' && (
          <TeachersPage focusTeacherId={focusTeacherId} onFocusHandled={() => setFocusTeacherId(null)} />
        )}
        {tab === 'ars' && <ARDefinitionsPage />}
        {tab === 'members' && isSuperAdmin && <MembersPage />}
      </main>
    </div>
  )
}
