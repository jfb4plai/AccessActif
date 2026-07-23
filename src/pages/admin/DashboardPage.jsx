import { useVersions } from '../../hooks/useVersions'
import { BASE, SMALL, COLORS, btnGhost, h2 } from '../../lib/ui'

function formatDateTime(iso) {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}`
}

export default function DashboardPage() {
  const { versions, consultations, loading, reload } = useVersions()

  if (loading) return <p style={{ color: COLORS.muted, padding: 20, fontSize: BASE }}>Chargement…</p>

  const byTeacher = versions.reduce((acc, v) => {
    if (!acc[v.teacher_id]) acc[v.teacher_id] = { id: v.teacher_id, teacher: v.acces_teachers, entries: [] }
    acc[v.teacher_id].entries.push(v)
    return acc
  }, {})

  const teacherList = Object.values(byTeacher).sort((a, b) =>
    (a.teacher?.name || '').localeCompare(b.teacher?.name || '', 'fr')
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={h2}>Suivi des envois</h2>
        <button onClick={reload} style={{ ...btnGhost, padding: '6px 14px', fontSize: SMALL }}>Actualiser</button>
      </div>
      <p style={{ fontSize: SMALL, color: COLORS.muted, marginTop: 0, marginBottom: 20 }}>
        Un envoi n'est pas une lecture : la colonne « consulté » indique si l'enseignant
        a réellement ouvert son lien.
      </p>

      {teacherList.length === 0 && (
        <p style={{ color: COLORS.muted, fontSize: BASE }}>Aucun lien envoyé pour le moment.</p>
      )}

      {teacherList.map(({ id, teacher, entries }) => {
        const seen = consultations[id]
        return (
          <div key={id} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}`, background: COLORS.bg, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px' }}>
                <span style={{ fontSize: BASE, fontWeight: 700, color: COLORS.text }}>{teacher?.name || '—'}</span>
                <span style={{ fontSize: SMALL, color: COLORS.muted, marginLeft: 8 }}>{teacher?.email}</span>
              </div>
              <span style={{ fontSize: SMALL, color: COLORS.muted }}>{teacher?.subject || 'Matière non renseignée'}</span>
              <span style={{ background: COLORS.teal, color: '#fff', borderRadius: 12, padding: '3px 12px', fontSize: SMALL, fontWeight: 700 }}>
                v{entries[0]?.version_number}
              </span>
            </div>

            <div style={{ padding: '10px 16px' }}>
              <p style={{
                fontSize: BASE, margin: '0 0 10px',
                color: seen ? COLORS.tealText : COLORS.danger, fontWeight: 600,
              }}>
                {seen
                  ? `Consulté ${seen.count} fois — dernière fois le ${formatDateTime(seen.last)}`
                  : 'Jamais consulté'}
              </p>
              {entries.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderTop: `1px solid ${COLORS.border}`, fontSize: SMALL }}>
                  <span style={{ color: COLORS.muted, minWidth: 28, fontWeight: 700 }}>v{v.version_number}</span>
                  <span style={{ color: COLORS.muted }}>Envoyé le {formatDateTime(v.sent_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
