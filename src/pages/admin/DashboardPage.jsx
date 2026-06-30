import { useVersions } from '../../hooks/useVersions'

export default function DashboardPage() {
  const { versions, loading, reload } = useVersions()

  if (loading) return <p style={{ color: '#9a958c', padding: 20 }}>Chargement…</p>

  // Grouper par teacher_id
  const byTeacher = versions.reduce((acc, v) => {
    const id = v.teacher_id
    if (!acc[id]) acc[id] = { teacher: v.acces_teachers, entries: [] }
    acc[id].entries.push(v)
    return acc
  }, {})

  const teacherList = Object.values(byTeacher).sort((a, b) =>
    (a.teacher?.name || '').localeCompare(b.teacher?.name || '')
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1814', margin: 0 }}>Suivi des versions</h2>
        <button onClick={reload}
          style={{ background: 'none', border: '1px solid #d4cfc6', borderRadius: 20, padding: '4px 14px', fontSize: 12, color: '#5a564f', cursor: 'pointer' }}>
          Actualiser
        </button>
      </div>

      {teacherList.length === 0 && (
        <p style={{ color: '#9a958c', fontSize: 13 }}>Aucun lien envoyé pour le moment.</p>
      )}

      {teacherList.map(({ teacher, entries }) => (
        <div key={entries[0]?.teacher_id} style={{ background: '#fff', border: '1px solid #e8e4dd', borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
          {/* En-tête enseignant */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #e8e4dd', background: '#faf9f7', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1814' }}>{teacher?.name || '—'}</span>
              <span style={{ fontSize: 11, color: '#9a958c', marginLeft: 8 }}>{teacher?.email}</span>
            </div>
            <span style={{ fontSize: 11, color: '#9a958c' }}>{teacher?.subject || 'Matière non renseignée'}</span>
            <span style={{ background: '#0a9370', color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
              v{entries[0]?.version_number}
            </span>
          </div>

          {/* Historique des envois */}
          <div style={{ padding: '8px 16px' }}>
            {entries.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: '1px solid #f0ece6', fontSize: 12 }}>
                <span style={{ color: '#9a958c', minWidth: 20, fontWeight: 600 }}>v{v.version_number}</span>
                <span style={{ color: '#5a564f' }}>
                  Envoyé le {new Date(v.sent_at).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {' '}à {new Date(v.sent_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
